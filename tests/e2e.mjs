import path from "node:path";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const demoEvent = await prisma.event.findUnique({
  where: { slug: "role-noturno-da-serra" },
  select: { id: true },
});
const demoUser = await prisma.user.findUnique({
  where: { email: "demo@motormeetings.com.br" },
  select: { id: true },
});
await prisma.$disconnect();
const DEMO_EVENT_ID = demoEvent?.id ?? "";
const DEMO_ID = demoUser?.id ?? "";

const bundledChromium = path.join(
  process.env.LOCALAPPDATA ?? "",
  "ms-playwright",
  "chromium-1234",
  "chrome-win64",
  "chrome.exe",
);
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync(bundledChromium) ? bundledChromium : undefined);

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

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

const failures = [];
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(name);
}

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(`console: ${message.text()}`);
});

async function visit(pathname, expectStatus = 200) {
  const response = await page.goto(`${BASE}${pathname}`, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;
  check(`GET ${pathname} → ${status}`, status === expectStatus, `expected ${expectStatus}`);
  const body = await page.locator("body").innerText();
  check(`${pathname} rendered (no error overlay)`, !/Application error|Internal Server Error|Unhandled Runtime Error/i.test(body));
  return response;
}

// ---------- Public routes ----------
await visit("/");
await page.getByRole("heading", { level: 1, name: /SEU PRÓXIMO ROLÊ COMEÇA AQUI/i }).waitFor();

await visit("/eventos");
const catalogCards = await page.locator("a[href^='/eventos/']:not([href='/eventos/criar'])").count();
check("catalog lists cards", catalogCards > 0, `${catalogCards} links`);

await visit("/eventos?q=serra&city=Goi%C3%A2nia&category=ROLE_NOTURNO&period=all&sort=nearest");
check("catalog search+filter shows Rolê Noturno da Serra", (await page.getByText("Rolê Noturno da Serra").count()) > 0);

await visit("/eventos?q=zzzznaoexiste");
await page.getByText("Nenhum encontro com esses filtros").waitFor();
check("catalog no-results state", true);

await visit("/eventos/role-noturno-da-serra");
await page.getByRole("heading", { level: 1, name: /Rolê Noturno da Serra/i }).waitFor();
check("detail H1 + share button", (await page.getByRole("button", { name: /Compartilhar/i }).count()) > 0);
const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
check("detail JSON-LD Event", /"@type":\s*"Event"/.test(jsonLd));

await visit("/eventos/ultimo-encontro-do-mes");
await page.getByText("Este evento já aconteceu.").waitFor();
check("expired detail notice", true);
const expiredRobots = await page.locator('meta[name="robots"]').getAttribute("content");
check("expired detail noindex", /noindex/i.test(expiredRobots ?? ""), expiredRobots ?? "");

await visit("/eventos/evento-inexistente-123", 404);
await page.getByText("Esse rolê não existe").waitFor();
check("custom 404 page", true);
consoleErrors.length = 0; // expected 404 resource log

await visit(`/organizadores/${DEMO_ID}`);
await page.getByRole("heading", { level: 1 }).waitFor();
const organizerBody = await page.locator("body").innerText();
check("organizer page hides emails", !/demo@motormeetings|marina@motormeetings/.test(organizerBody));

for (const pathname of ["/como-funciona", "/sobre", "/privacidade", "/termos", "/entrar", "/cadastrar"]) {
  await visit(pathname);
}

const robots = await page.request.get(`${BASE}/robots.txt`);
const robotsText = await robots.text();
check("robots.txt 200 + Disallow /meus-eventos", robots.status() === 200 && robotsText.includes("Disallow: /meus-eventos"));
const sitemap = await page.request.get(`${BASE}/sitemap.xml`);
const sitemapText = await sitemap.text();
check("sitemap.xml 200", sitemap.status() === 200);
check("sitemap includes active event", sitemapText.includes("/eventos/role-noturno-da-serra"));
check("sitemap excludes expired event", !sitemapText.includes("/eventos/ultimo-encontro-do-mes"));
check("sitemap excludes cancelled event", !sitemapText.includes("/eventos/role-cancelado-por-chuva-forte"));

// ---------- Auth ----------
await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.getByLabel("E-mail").fill("demo@motormeetings.com.br");
await page.locator("#password").fill("senha-errada");
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("alert").waitFor({ timeout: 10000 });
check("login error message", true, (await page.getByRole("alert").innerText()).trim());

await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.getByLabel("E-mail").fill("demo@motormeetings.com.br");
await page.locator("#password").fill("motormeetings123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 15000 });
check("login demo ok", true);

// Protected redirect
const anonContext = await browser.newContext();
const anon = await anonContext.newPage();
const redirectResponse = await anon.goto(`${BASE}/meus-eventos`, { waitUntil: "networkidle" });
check("anonymous /meus-eventos redirected to /entrar", anon.url().includes("/entrar"), anon.url());
await anonContext.close();

// ---------- Full CRUD on production ----------
const title = `Teste Produção — Rolê ${Date.now()}`;
const editedTitle = `${title} (editado)`;

await page.goto(`${BASE}/eventos/criar`, { waitUntil: "networkidle" });
await page.getByLabel("Nome do evento").fill(title);
await page.getByRole("radio", { name: "Rolê noturno" }).click();
await page.getByLabel("Cidade").fill("Goiânia");
await page.getByLabel("Data do evento").fill(isoDaysFromNow(25));
await page.getByLabel("Horário de início").fill("20:30");
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(300);
await page.getByLabel("Ponto de encontro").fill("Praça do Sol — Setor Oeste, Goiânia");
await page.getByRole("checkbox", { name: /trajeto/ }).check();
await page.getByLabel("Ponto de saída").fill("Praça do Sol — Setor Oeste");
await page.getByLabel("Horário de saída").fill("21:15");
await page.getByLabel("Ponto de chegada").fill("Parque Vaca Brava — Setor Bueno");
await page.getByLabel("Horário de chegada").fill("22:00");
await page.getByLabel("Observações do trajeto").fill("Comboio único, ritmo tranquilo.");
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(300);
await page.getByLabel("Descrição do evento").fill(
  "Evento criado durante o smoke test da build de produção. Horários e pontos informados pelo organizador, sem distâncias inventadas.",
);
await page.getByLabel("Instagram do evento").fill("@a.alves_silva");
await page.locator('input[type="file"]').first().setInputFiles("public/images/events/custom.webp");
await page.getByAltText("Prévia da imagem de capa do evento").waitFor({ timeout: 20000 });
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Publicar evento" }).click();
await page.getByRole("heading", { name: "Evento publicado!" }).waitFor({ timeout: 30000 });
const publicUrl = await page.getByLabel("Link público do evento").inputValue();
const slug = new URL(publicUrl).pathname.split("/").pop();
check("event created in production build", /\/eventos\/.+-\w+$/.test(new URL(publicUrl).pathname), publicUrl);

const detail = await page.request.get(publicUrl);
check("created event public page 200", detail.status() === 200);
await page.goto(publicUrl, { waitUntil: "networkidle" });
const detailBody = await page.locator("body").innerText();
check("detail shows uploaded cover (img loaded)", (await page.locator("img[alt^='Capa do evento']").count()) > 0);
check("no raw file paths leaked", !/storage[\\/]uploads|[A-Z]:\\/.test(detailBody));
const uploadedCover = await page.evaluate(async () => {
  const img = document.querySelector("img[alt^='Capa do evento']");
  const src = img?.getAttribute("src") ?? "";
  const decoded = src.includes("url=") ? decodeURIComponent(new URL(src, location.origin).searchParams.get("url") ?? "") : src;
  if (!decoded.startsWith("/uploads/")) return null;
  const res = await fetch(decoded);
  return { decoded, status: res.status, type: res.headers.get("content-type") };
});
check("upload persisted and served as image/webp", uploadedCover?.status === 200 && uploadedCover?.type === "image/webp", JSON.stringify(uploadedCover));

await page.goto(`${BASE}/eventos/${slug}/editar`, { waitUntil: "networkidle" });
await page.getByLabel("Nome do evento").fill(editedTitle);
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(300);
const patchResponse = page.waitForResponse(
  (r) => r.url().includes("/api/events/") && r.request().method() === "PATCH",
);
await page.getByRole("button", { name: "Salvar alterações" }).click();
const patch = await patchResponse;
check("edit PATCH 200", patch.status() === 200);
await page.getByText("Alterações salvas com sucesso.").waitFor({ timeout: 10000 });
await page.goto(`${BASE}/eventos/${slug}`, { waitUntil: "networkidle" });
check("edited title persisted", (await page.getByRole("heading", { level: 1, name: editedTitle }).count()) > 0);

// Cancel + catalog removal
await page.goto(`${BASE}/meus-eventos`, { waitUntil: "networkidle" });
let row = page.locator("article").filter({ hasText: editedTitle });
await row.getByRole("button", { name: "Cancelar", exact: true }).click();
await page.getByRole("dialog").waitFor();
const cancelResponse = page.waitForResponse(
  (r) => r.url().endsWith("/status") && r.request().method() === "POST",
);
await page.getByRole("button", { name: "Sim, cancelar evento" }).click();
check("cancel status 200", (await cancelResponse).status() === 200);
await row.getByRole("button", { name: "Reativar" }).waitFor({ timeout: 10000 });
await page.goto(`${BASE}/eventos?q=${encodeURIComponent("Teste Produção")}`, { waitUntil: "networkidle" });
check("cancelled event absent from catalog", (await page.getByText(editedTitle).count()) === 0);

// Reactivate
await page.goto(`${BASE}/meus-eventos`, { waitUntil: "networkidle" });
row = page.locator("article").filter({ hasText: editedTitle });
const reactivateResponse = page.waitForResponse(
  (r) => r.url().endsWith("/status") && r.request().method() === "POST",
);
await row.getByRole("button", { name: "Reativar" }).click();
check("reactivate 200", (await reactivateResponse).status() === 200);
await row.getByRole("button", { name: "Cancelar", exact: true }).waitFor({ timeout: 10000 });
await page.waitForTimeout(500);

// Delete with confirmation
row = page.locator("article").filter({ hasText: editedTitle });
await row.getByRole("button", { name: "Excluir" }).click();
try {
  await page.getByRole("dialog").waitFor({ timeout: 5000 });
} catch {
  await row.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
}
const deleteResponse = page.waitForResponse(
  (r) => /\/api\/events\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === "DELETE",
);
await page.getByRole("button", { name: "Sim, excluir" }).click();
check("delete 200", (await deleteResponse).status() === 200);
await page.waitForTimeout(800);
check("event removed from Meus eventos", (await page.getByText(editedTitle).count()) === 0);
const gone = await page.request.get(`${BASE}/eventos/${slug}`);
check("deleted detail 404", gone.status() === 404);

// ---------- Cross-user authorization ----------
const marinaContext = await browser.newContext();
const marina = await marinaContext.newPage();
await marina.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await marina.getByLabel("E-mail").fill("marina@motormeetings.com.br");
await marina.locator("#password").fill("motormeetings123");
await marina.getByRole("button", { name: "Entrar" }).click();
await marina.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 15000 });
const forbidden = await marina.evaluate(async (id) => {
  const results = {};
  for (const [method, url, body] of [
    ["PATCH", `/api/events/${id}`, { title: "Hackeado" }],
    ["DELETE", `/api/events/${id}`, undefined],
    ["POST", `/api/events/${id}/status`, { status: "CANCELLED" }],
  ]) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    results[`${method} ${url.split("/").pop()}`] = res.status;
  }
  return results;
}, DEMO_EVENT_ID);
check("cross-user mutations 403", Object.values(forbidden).every((s) => s === 403), JSON.stringify(forbidden));
const crossEdit = await marina.goto(`${BASE}/eventos/role-noturno-da-serra/editar`, { waitUntil: "networkidle" });
check("cross-user edit page 404", crossEdit.status() === 404);
await marinaContext.close();

// ---------- Detail interactions: lightbox and map links ----------
await page.goto(`${BASE}/eventos/role-noturno-da-serra`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Ampliar imagem 1/ }).click();
await page.getByRole("dialog", { name: /Galeria de fotos/ }).waitFor();
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Escape");
await page.getByRole("dialog", { name: /Galeria de fotos/ }).waitFor({ state: "hidden" });
check("lightbox opens, navigates and closes with keyboard", true);
const mapHrefs = await page.locator("a[href*='google.com/maps']").evaluateAll((els) => els.map((e) => e.href));
check(
  "map links contain no invented dates/coordinates",
  mapHrefs.length > 0 && mapHrefs.every((href) => !/\d{4}-\d{2}-\d{2}|@-?\d+\.\d+,-?\d+\.\d+/.test(href)),
  `${mapHrefs.length} links`,
);

// ---------- Responsive layout and mobile menu ----------
for (const width of [360, 390, 768, 1024, 1440]) {
  const viewportContext = await browser.newContext({ viewport: { width, height: 900 } });
  const viewportPage = await viewportContext.newPage();
  for (const route of ["/", "/eventos", "/eventos/role-noturno-da-serra"]) {
    await viewportPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    const overflow = await viewportPage.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal overflow at ${width}px ${route}`, overflow <= 1, `${overflow}px`);
  }
  await viewportContext.close();
}

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobile = await mobileContext.newPage();
await mobile.goto(`${BASE}/eventos`, { waitUntil: "networkidle" });
await mobile.getByRole("button", { name: "Abrir menu" }).click();
const mobileMenu = mobile.locator("#menu-mobile");
await mobileMenu.waitFor({ state: "visible" });
const locked = await mobile.evaluate(() => getComputedStyle(document.body).overflow === "hidden");
await mobile.keyboard.press("Escape");
await mobileMenu.waitFor({ state: "hidden" });
const unlocked = await mobile.evaluate(() => getComputedStyle(document.body).overflow !== "hidden");
check("mobile menu opens, locks scroll and closes with Esc", locked && unlocked);
await mobileContext.close();

// ---------- Uploads served with correct headers ----------
check("no console errors during public browsing", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

await browser.close();

console.log(failures.length ? `\n${failures.length} FAILURE(S): ${failures.join("; ")}` : "\nE2E SMOKE: ALL CHECKS PASSED");
process.exit(failures.length ? 1 : 0);
