import path from "node:path";
import { existsSync } from "node:fs";
import { chromium, request } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const prisma = new PrismaClient();

const bundledChromium = path.join(
  process.env.LOCALAPPDATA ?? "",
  "ms-playwright",
  "chromium-1234",
  "chrome-win64",
  "chrome.exe",
);
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync(bundledChromium) ? bundledChromium : undefined);

const failures = [];
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(name);
}

function isoDaysFromNow(days) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function login(context, email) {
  const page = await context.newPage();
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await page.getByLabel("E-mail").fill(email);
  await page.locator("#password").fill("motormeetings123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 15000 });
  return page;
}

async function activeCount(eventId) {
  return prisma.eventAttendance.count({ where: { eventId, cancelledAt: null } });
}

function mutationResponse(page, eventId, method) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/events/${eventId}/attendance`) &&
      response.request().method() === method,
  );
}

const demo = await prisma.user.findUnique({
  where: { email: "demo@motormeetings.com.br" },
  select: { id: true, name: true, email: true },
});
const marina = await prisma.user.findUnique({
  where: { email: "marina@motormeetings.com.br" },
  select: { id: true, name: true, email: true },
});

if (!demo || !marina) {
  console.error("Seed ausente: usuários demo/marina não encontrados.");
  await prisma.$disconnect();
  process.exit(1);
}

const stamp = Date.now();
const event = await prisma.event.create({
  data: {
    title: `RSVP E2E ${stamp}`,
    slug: `rsvp-e2e-${stamp}`,
    description: "Evento temporário criado pelo teste automatizado de presença.",
    category: "ROLE_NOTURNO",
    city: "Goiânia",
    eventDate: isoDaysFromNow(10),
    startTime: "20:00",
    meetingPoint: "Praça do Teste — Goiânia",
    status: "ACTIVE",
    userId: demo.id,
  },
});

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const anonApi = await request.newContext();
let demoContext;
let marinaContext;

try {
  // ---------- API pública ----------
  const publicResponse = await anonApi.get(`${BASE}/api/events/${event.id}/attendance`);
  const publicBody = await publicResponse.json();
  check("public attendance GET 200", publicResponse.status() === 200, String(publicResponse.status()));
  check(
    "public attendance payload is aggregate-only",
    Object.keys(publicBody).sort().join(",") === "attending,count,ok",
    JSON.stringify(publicBody),
  );
  check("public attendance starts at zero", publicBody.count === 0, String(publicBody.count));
  const publicText = JSON.stringify(publicBody);
  check(
    "public attendance has no personal data",
    !publicText.includes(demo.email) &&
      !publicText.includes(marina.email) &&
      !publicText.includes(demo.name) &&
      !publicText.includes(marina.name),
    publicText,
  );

  const anonymousMutation = await anonApi.post(`${BASE}/api/events/${event.id}/attendance`);
  check("anonymous confirm is 401", anonymousMutation.status() === 401, String(anonymousMutation.status()));

  const missingEvent = await anonApi.post(`${BASE}/api/events/nao-existe-${stamp}/attendance`);
  check("unauthenticated unknown event is 401", missingEvent.status() === 401, String(missingEvent.status()));

  // ---------- Visitante na página de detalhe ----------
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(`${BASE}/eventos/${event.slug}`, { waitUntil: "networkidle" });
  await anonPage.getByText("Nenhuma presença confirmada").waitFor({ timeout: 15000 });
  check("detail renders zero state", true);
  await anonPage.getByRole("button", { name: "Confirmar presença" }).click();
  await anonPage.waitForURL((url) => url.pathname.startsWith("/entrar"), { timeout: 15000 });
  check(
    "anonymous confirm redirects to login with next",
    anonPage.url().includes(`next=${encodeURIComponent(`/eventos/${event.slug}`)}`),
    anonPage.url(),
  );
  await anonContext.close();

  // ---------- Card no catálogo ----------
  demoContext = await browser.newContext();
  const demoPage = await login(demoContext, demo.email);
  await demoPage.goto(`${BASE}/eventos?q=${encodeURIComponent(event.title)}`, {
    waitUntil: "networkidle",
  });
  const card = demoPage.locator("article").filter({ hasText: event.title }).first();
  await card.getByText("Nenhuma presença confirmada").waitFor({ timeout: 15000 });
  await Promise.all([
    mutationResponse(demoPage, event.id, "POST"),
    card.getByRole("button", { name: "Confirmar presença" }).click(),
  ]);
  await card.getByText("Presença confirmada", { exact: true }).waitFor({ timeout: 15000 });
  await card.getByText("1 pessoa confirmou presença").waitFor({ timeout: 15000 });
  check("card confirm updates button and count", true);
  check("card confirm persisted one active attendance", (await activeCount(event.id)) === 1);

  await Promise.all([
    mutationResponse(demoPage, event.id, "DELETE"),
    card.getByRole("button", { name: "Cancelar presença" }).click(),
  ]);
  await card.getByText("Nenhuma presença confirmada").waitFor({ timeout: 15000 });
  check("card cancel updates count immediately", true);
  check("card cancel keeps a single cancelled record", (await activeCount(event.id)) === 0);

  // ---------- Detalhe: confirmar, duplicar, cancelar e reconfirmar ----------
  await demoPage.goto(`${BASE}/eventos/${event.slug}`, { waitUntil: "networkidle" });
  await Promise.all([
    mutationResponse(demoPage, event.id, "POST"),
    demoPage.getByRole("button", { name: "Confirmar presença" }).click(),
  ]);
  await demoPage.getByText("Presença confirmada", { exact: true }).waitFor({ timeout: 15000 });
  await demoPage.getByText("1 pessoa confirmou presença").waitFor({ timeout: 15000 });
  check("detail confirm updates state", true);

  const duplicateFirst = await demoPage.request.post(`${BASE}/api/events/${event.id}/attendance`);
  const duplicateSecond = await demoPage.request.post(`${BASE}/api/events/${event.id}/attendance`);
  const duplicateBody = await duplicateSecond.json();
  check(
    "duplicate confirmations are idempotent",
    duplicateFirst.status() === 200 &&
      duplicateSecond.status() === 200 &&
      duplicateBody.count === 1 &&
      (await activeCount(event.id)) === 1,
    JSON.stringify(duplicateBody),
  );
  const rowsAfterDuplicates = await prisma.eventAttendance.count({ where: { eventId: event.id } });
  check("duplicate confirmations keep one row", rowsAfterDuplicates === 1, String(rowsAfterDuplicates));

  await Promise.all([
    mutationResponse(demoPage, event.id, "DELETE"),
    demoPage.getByRole("button", { name: "Cancelar presença" }).click(),
  ]);
  await demoPage.getByText("Nenhuma presença confirmada").waitFor({ timeout: 15000 });
  const cancelledRows = await prisma.eventAttendance.findMany({
    where: { eventId: event.id },
    select: { cancelledAt: true },
  });
  check(
    "cancel is soft and preserves history",
    cancelledRows.length === 1 && cancelledRows[0].cancelledAt instanceof Date,
    JSON.stringify(cancelledRows),
  );

  await Promise.all([
    mutationResponse(demoPage, event.id, "POST"),
    demoPage.getByRole("button", { name: "Confirmar presença" }).click(),
  ]);
  await demoPage.getByText("Presença confirmada", { exact: true }).waitFor({ timeout: 15000 });
  const reConfirmedRows = await prisma.eventAttendance.count({ where: { eventId: event.id } });
  check("re-confirm reuses the same row", reConfirmedRows === 1, String(reConfirmedRows));
  check("re-confirm count is one", (await activeCount(event.id)) === 1);

  // ---------- Segundo usuário ----------
  marinaContext = await browser.newContext();
  const marinaPage = await login(marinaContext, marina.email);
  await marinaPage.goto(`${BASE}/eventos/${event.slug}`, { waitUntil: "networkidle" });
  await marinaPage.getByText("1 pessoa confirmou presença").waitFor({ timeout: 15000 });
  await Promise.all([
    mutationResponse(marinaPage, event.id, "POST"),
    marinaPage.getByRole("button", { name: "Confirmar presença" }).click(),
  ]);
  await marinaPage.getByText("2 pessoas confirmaram presença").waitFor({ timeout: 15000 });
  check("second user can confirm the same event", (await activeCount(event.id)) === 2);

  const publicAfter = await anonApi.get(`${BASE}/api/events/${event.id}/attendance`);
  const publicAfterBody = await publicAfter.json();
  check(
    "public count reflects active confirmations",
    publicAfterBody.count === 2,
    JSON.stringify(publicAfterBody),
  );
  check(
    "public count still hides participant identities",
    !JSON.stringify(publicAfterBody).includes(marina.name) &&
      !JSON.stringify(publicAfterBody).includes(demo.name),
  );

  await Promise.all([
    mutationResponse(marinaPage, event.id, "DELETE"),
    marinaPage.getByRole("button", { name: "Cancelar presença" }).click(),
  ]);
  await marinaPage.getByText("1 pessoa confirmou presença").waitFor({ timeout: 15000 });
  check("second user cancel reduces count", (await activeCount(event.id)) === 1);

  await Promise.all([
    mutationResponse(demoPage, event.id, "DELETE"),
    demoPage.getByRole("button", { name: "Cancelar presença" }).click(),
  ]);
  await demoPage.getByText("Nenhuma presença confirmada").waitFor({ timeout: 15000 });
  check("all active confirmations cancelled", (await activeCount(event.id)) === 0);
} finally {
  await anonApi.dispose();
  await demoContext?.close();
  await marinaContext?.close();
  await browser.close();
  await prisma.eventAttendance.deleteMany({ where: { eventId: event.id } });
  await prisma.event.delete({ where: { id: event.id } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(`\n${failures.length === 0 ? "All RSVP checks passed." : `${failures.length} RSVP check(s) failed.`}`);
process.exit(failures.length === 0 ? 0 : 1);
