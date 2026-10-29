import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const scrypt = promisify(scryptCallback);

const prisma = new PrismaClient();
const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const PASSWORD = "motormeetings123";
const TAG = `E2E-${Date.now()}`;
const COMMUNITY_NAME = `${TAG} Comunidade`;
const COMMUNITY_NAME_EDITED = `${COMMUNITY_NAME} editada`;
const WHATSAPP_URL = "https://chat.whatsapp.com/E2eInviteCode123456";

const failures = [];
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(name);
}

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const root = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((entry) => entry.startsWith("chromium-"))
    .sort()
    .reverse();
  for (const candidate of candidates) {
    const executable = path.join(root, candidate, "chrome-win64", "chrome.exe");
    if (existsSync(executable)) return executable;
  }
  return undefined;
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

const demo = await prisma.user.findUnique({ where: { email: "demo@motormeetings.com.br" } });
const marina = await prisma.user.findUnique({ where: { email: "marina@motormeetings.com.br" } });
if (!demo || !marina) {
  console.error("Seed ausente: rode npm run db:seed antes dos testes.");
  process.exit(1);
}

// ---------- Cleanup (only test-generated rows) ----------
async function cleanup() {
  await prisma.conversation.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "E2E" } },
        { messages: { some: { content: { startsWith: "E2E" } } } },
      ],
    },
  });
  await prisma.community.deleteMany({ where: { name: { startsWith: "E2E-" } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-owner-" } } });
  await prisma.globalMessage.deleteMany({ where: { content: { startsWith: "E2E" } } });
  await prisma.event.deleteMany({ where: { title: { startsWith: "E2E" } } });
  await prisma.notification.deleteMany({ where: { userId: { in: [demo.id, marina.id] } } });
}

await cleanup();

const guest = await prisma.user.upsert({
  where: { email: "e2e-social@motormeetings.local" },
  update: { name: `${TAG} Convidado`, passwordHash: await testPasswordHash() },
  create: {
    name: `${TAG} Convidado`,
    email: "e2e-social@motormeetings.local",
    passwordHash: await testPasswordHash(),
    role: "USER",
  },
});

const OWNER_EMAIL = `e2e-owner-${Date.now()}@motormeetings.local`;
const owner = await prisma.user.create({
  data: {
    name: `${TAG} Dono`,
    email: OWNER_EMAIL,
    passwordHash: await testPasswordHash(),
    role: "USER",
  },
});

async function testPasswordHash() {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(PASSWORD, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

const browser = await chromium.launch(
  resolveChromium() ? { executablePath: resolveChromium() } : {},
);
const viewport = { width: 1440, height: 1000 };
let clientIpCounter = 1;

// Cada contexto simula um cliente distinto para os limites por IP do servidor.
function newContext() {
  return browser.newContext({
    viewport,
    extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${(clientIpCounter++ % 250) + 1}` },
  });
}

async function dismissConsent(page) {
  const button = page.getByRole("button", { name: "Rejeitar opcionais" });
  try {
    if (await button.isVisible({ timeout: 1500 })) {
      await button.click();
      await page.getByRole("region", { name: "Preferências de cookies" }).waitFor({ state: "hidden" });
    }
  } catch {
    /* banner já decidido */
  }
}

async function login(email) {
  const context = await newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await dismissConsent(page);
  await page.getByLabel("E-mail").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 20000 });
  return { context, page };
}

async function api(page, method, url, body) {
  return page.evaluate(
    async ({ method: methodValue, url: urlValue, body: bodyValue }) => {
      const response = await fetch(urlValue, {
        method: methodValue,
        headers: bodyValue ? { "Content-Type": "application/json" } : undefined,
        body: bodyValue ? JSON.stringify(bodyValue) : undefined,
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      return { status: response.status, data };
    },
    { method, url, body },
  );
}

async function waitForCount(locator, minimum, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await locator.count()) >= minimum) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function waitForValue(fn, timeout = 15000) {
  const start = Date.now();
  let value = null;
  while (Date.now() - start < timeout) {
    value = await fn();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return value;
}

async function waitForComposerEmpty(page) {
  await page.waitForFunction(
    () => (document.querySelector("#forum-message")?.value ?? "") === "",
    undefined,
    { timeout: 15000 },
  );
}

function text(page) {
  return page.locator("body").innerText();
}

try {
  // ---------------------------------------------------------------- Communities
  console.log("\n=== Comunidades ===");
  const anonContext = await newContext();
  const anonPage = await anonContext.newPage();
  await anonPage.goto(`${BASE}/comunidade`, { waitUntil: "networkidle" });
  await dismissConsent(anonPage);

  check(
    "comunidade: visitante vê a aba de grupos",
    (await anonPage.getByRole("heading", { name: "Grupos da comunidade" }).count()) === 1,
  );
  check(
    "comunidade: cards não exibem contagem de membros",
    !/\b\d+\s+membros?\b/i.test(await text(anonPage)),
  );

  const anonCreateResponse = await anonPage.goto(`${BASE}/comunidade/criar`, { waitUntil: "networkidle" });
  check(
    "comunidade: visitante não acessa criação (redireciona para login)",
    anonCreateResponse?.status() === 200 && anonPage.url().includes("/entrar"),
    anonPage.url(),
  );

  const { context: ownerContext, page: ownerPage } = await login(OWNER_EMAIL);
  await ownerPage.goto(`${BASE}/comunidade/criar`, { waitUntil: "networkidle" });

  // Emblema obrigatório (sem upload)
  await ownerPage.getByLabel("Nome da comunidade").fill(`${TAG} Sem emblema`);
  await ownerPage.getByLabel("Convite do WhatsApp").fill(WHATSAPP_URL);
  await ownerPage.getByRole("button", { name: "Publicar comunidade" }).click();
  const emblemAlert = ownerPage.getByRole("alert").filter({ hasText: /emblema/i }).first();
  let emblemBlocked = true;
  try {
    await emblemAlert.waitFor({ timeout: 10000 });
  } catch {
    emblemBlocked = false;
  }
  check("comunidade: emblema é obrigatório no servidor", emblemBlocked, emblemBlocked ? await emblemAlert.innerText() : "");

  // Convite inválido
  await ownerPage.getByLabel("Nome da comunidade").fill(`${TAG} Convite inválido`);
  await ownerPage.getByLabel("Convite do WhatsApp").fill("https://example.com/grupo");
  await ownerPage.locator('input[type="file"]').first().setInputFiles("public/images/events/custom.webp");
  await ownerPage.getByAltText("Prévia de emblema da comunidade").waitFor({ timeout: 20000 });
  await ownerPage.getByRole("button", { name: "Publicar comunidade" }).click();
  const inviteAlert = ownerPage.getByRole("alert").filter({ hasText: /convite válido do WhatsApp/i }).first();
  let inviteBlocked = true;
  try {
    await inviteAlert.waitFor({ timeout: 10000 });
  } catch {
    inviteBlocked = false;
  }
  check("comunidade: convite fora do chat.whatsapp.com é rejeitado", inviteBlocked, inviteBlocked ? await inviteAlert.innerText() : "");

  // Criação válida
  await ownerPage.getByLabel("Nome da comunidade").fill(COMMUNITY_NAME);
  await ownerPage.getByLabel("Categoria").selectOption("NOTURNOS");
  await ownerPage.getByLabel("Cidade ou região (opcional)").fill("Goiânia");
  await ownerPage.getByLabel("Descrição (opcional)").fill("Comunidade criada pelo teste E2E da expansão social.");
  await ownerPage.getByLabel("Convite do WhatsApp").fill(WHATSAPP_URL);
  await ownerPage.getByRole("button", { name: "Publicar comunidade" }).click();
  await ownerPage.waitForURL(
    (url) =>
      /^\/comunidade\/[a-z0-9-]+$/.test(url.pathname) && !url.pathname.startsWith("/comunidade/criar"),
    { timeout: 20000 },
  );
  const detailUrl = ownerPage.url();
  const communitySlug = new URL(detailUrl).pathname.split("/").pop();
  const communityRow = await prisma.community.findUnique({ where: { slug: communitySlug } });
  check("comunidade: criação com emblema e convite válido", Boolean(communityRow), communitySlug);

  const emblem = await ownerPage.locator("img[alt^='Emblema de']").first().evaluate(async (img) => {
    const response = await fetch(img.getAttribute("src") ?? "");
    return { status: response.status, type: response.headers.get("content-type"), src: img.getAttribute("src") };
  });
  check(
    "comunidade: emblema persistido em /uploads como webp",
    emblem.status === 200 && emblem.type === "image/webp" && isUploadSrc(emblem.src),
    JSON.stringify(emblem),
  );

  const whatsappHref = await ownerPage
    .getByRole("link", { name: /Entrar no grupo do WhatsApp/i })
    .getAttribute("href");
  check("comunidade: botão do WhatsApp usa o convite validado", whatsappHref === WHATSAPP_URL, whatsappHref ?? "");
  check(
    "comunidade: página pública traz aviso de segurança do WhatsApp",
    /serviço externo/i.test(await text(ownerPage)),
  );
  check(
    "comunidade: detalhe não inventa número de membros",
    /Não exibimos contagem de membros/i.test(await text(ownerPage)),
  );

  // Listagem e autorização
  await anonPage.goto(`${BASE}/comunidade?q=${encodeURIComponent(TAG)}`, { waitUntil: "networkidle" });
  check(
    "comunidade: aparece na listagem pública para visitantes",
    (await anonPage.getByRole("heading", { name: COMMUNITY_NAME }).count()) > 0,
  );

  const { context: marinaContext, page: marinaPage } = await login("marina@motormeetings.com.br");
  const marinaEdit = await marinaPage.goto(`${BASE}/comunidade/${communitySlug}/editar`, {
    waitUntil: "networkidle",
  });
  const marinaPatch = await api(marinaPage, "PATCH", `/api/communities/${communityRow.id}`, {
    name: "Invadido",
  });
  check(
    "comunidade: não proprietário recebe 404 na edição e 403 na API",
    marinaEdit?.status() === 404 && marinaPatch.status === 403,
    `${marinaEdit?.status()} / ${marinaPatch.status}`,
  );

  // Edição pelo proprietário
  await ownerPage.goto(`${BASE}/comunidade/${communitySlug}/editar`, { waitUntil: "networkidle" });
  await ownerPage.getByLabel("Nome da comunidade").fill(COMMUNITY_NAME_EDITED);
  await ownerPage.getByRole("button", { name: "Salvar alterações" }).click();
  await ownerPage.waitForURL(detailUrl, { timeout: 20000 });
  check(
    "comunidade: proprietário edita e alteração persiste",
    (await ownerPage.getByRole("heading", { level: 1, name: COMMUNITY_NAME_EDITED }).count()) === 1,
  );

  // Desativar / reativar
  await ownerPage.getByRole("button", { name: "Desativar", exact: true }).click();
  await ownerPage.getByText(/Esta comunidade está desativada/i).waitFor({ timeout: 15000 });
  const disabledPublic = await marinaPage.goto(`${BASE}/comunidade/${communitySlug}`, {
    waitUntil: "networkidle",
  });
  await anonPage.goto(`${BASE}/comunidade?q=${encodeURIComponent(TAG)}`, { waitUntil: "networkidle" });
  const listedAfterDisable = (await anonPage.getByRole("heading", { name: COMMUNITY_NAME_EDITED }).count()) > 0;
  check(
    "comunidade: desativada some da listagem e do acesso público",
    disabledPublic?.status() === 404 && !listedAfterDisable,
    `detail=${disabledPublic?.status()} listed=${listedAfterDisable}`,
  );

  await ownerPage.getByRole("button", { name: "Reativar", exact: true }).click();
  await ownerPage.getByText(/Esta comunidade está desativada/i).waitFor({ state: "hidden", timeout: 15000 });
  await marinaPage.goto(`${BASE}/comunidade/${communitySlug}`, { waitUntil: "networkidle" });
  check(
    "comunidade: reativada volta ao acesso público",
    (await marinaPage.getByRole("heading", { level: 1, name: COMMUNITY_NAME_EDITED }).count()) === 1,
  );

  // Exclusão
  await ownerPage.getByRole("button", { name: "Excluir", exact: true }).click();
  await ownerPage.getByRole("button", { name: "Confirmar", exact: true }).click();
  await ownerPage.waitForURL(/\/comunidade\?aba=grupos/, { timeout: 20000 });
  const deletedCommunity = await marinaPage.goto(`${BASE}/comunidade/${communitySlug}`, {
    waitUntil: "networkidle",
  });
  check("comunidade: exclusão remove a página pública", deletedCommunity?.status() === 404);

  const { context: demoContext, page: demoPage } = await login("demo@motormeetings.com.br");

  // ---------------------------------------------------------------- Forum
  console.log("\n=== Fórum global ===");
  const forumContext = await newContext();
  const forumPage = await forumContext.newPage();
  await forumPage.goto(`${BASE}/comunidade?aba=forum`, { waitUntil: "networkidle" });
  await dismissConsent(forumPage);

  const forumMessage = `${TAG} primeira mensagem`;
  await forumPage.getByLabel("Escreva uma mensagem para o fórum global").fill(forumMessage);
  await forumPage.getByRole("button", { name: "Publicar mensagem" }).click();
  await forumPage.getByText(forumMessage, { exact: true }).waitFor({ timeout: 15000 });
  const anonMessage = await waitForValue(() =>
    prisma.globalMessage.findFirst({ where: { content: forumMessage } }),
  );
  check(
    "fórum: visitante publica com apelido automático User NNNN",
    Boolean(anonMessage?.sessionId) && /^User \d{4}$/.test(anonMessage?.displayName ?? ""),
    anonMessage?.displayName,
  );
  check(
    "fórum: mensagem anônima não expõe e-mail ou IP",
    !/@|127\.0\.0\.1/.test(await forumPage.locator("li", { hasText: forumMessage }).innerText()),
  );

  await forumPage.reload({ waitUntil: "networkidle" });
  check(
    "fórum: apelido do visitante permanece estável após recarregar",
    (await text(forumPage)).includes(`Publicando como ${anonMessage?.displayName ?? "__missing__"}`),
  );

  // Tempo real entre dois visitantes
  const liveContext = await newContext();
  const livePage = await liveContext.newPage();
  await livePage.goto(`${BASE}/comunidade?aba=forum`, { waitUntil: "networkidle" });
  await dismissConsent(livePage);

  // Limite de 1000 caracteres no servidor (identidade sem postagens anteriores)
  const overLimit = await api(livePage, "POST", "/api/forum/messages", { content: "E".repeat(1001) });
  check(
    "fórum: servidor rejeita mensagens acima de 1000 caracteres",
    overLimit.status === 422,
    String(overLimit.status),
  );

  // Duplicidade (antes de atingir o limite de 3/min)
  await forumPage.getByLabel("Escreva uma mensagem para o fórum global").fill(forumMessage);
  const [duplicateResponse] = await Promise.all([
    forumPage.waitForResponse(
      (response) => response.url().includes("/api/forum/messages") && response.request().method() === "POST",
      { timeout: 15000 },
    ),
    forumPage.getByRole("button", { name: "Publicar mensagem" }).click(),
  ]);
  const duplicateStatus = duplicateResponse.status();
  const duplicateAlert = forumPage.getByRole("alert").first();
  let duplicateBlocked = true;
  try {
    await duplicateAlert.waitFor({ timeout: 10000 });
  } catch {
    duplicateBlocked = false;
  }
  const duplicateText = duplicateBlocked ? await duplicateAlert.innerText() : "";
  check(
    "fórum: bloqueia mensagem duplicada em sequência",
    duplicateStatus === 409 && /mesma mensagem/i.test(duplicateText),
    `${duplicateStatus} ${duplicateText}`,
  );

  const liveMessage = `${TAG} tempo real`;
  await forumPage.getByLabel("Escreva uma mensagem para o fórum global").fill(liveMessage);
  await forumPage.getByRole("button", { name: "Publicar mensagem" }).click();
  await livePage.getByText(liveMessage, { exact: true }).waitFor({ timeout: 15000 });
  await waitForComposerEmpty(forumPage);
  check("fórum: entrega em tempo real via SSE entre visitantes", true);

  // HTML não interpretado
  const htmlMessage = `${TAG} <b>negrito</b>`;
  await forumPage.getByLabel("Escreva uma mensagem para o fórum global").fill(htmlMessage);
  await forumPage.getByRole("button", { name: "Publicar mensagem" }).click();
  await forumPage.getByText(htmlMessage, { exact: true }).waitFor({ timeout: 15000 });
  await waitForComposerEmpty(forumPage);
  const rawHtmlItem = forumPage.locator("li", { hasText: htmlMessage });
  check(
    "fórum: HTML é exibido como texto, sem interpretação",
    (await rawHtmlItem.locator("b").count()) === 0,
  );

  // Limite de 3 por minuto (identidade nova)
  const rateContext = await newContext();
  const ratePage = await rateContext.newPage();
  await ratePage.goto(`${BASE}/comunidade?aba=forum`, { waitUntil: "networkidle" });
  await dismissConsent(ratePage);
  let rateLimited = false;
  for (let index = 0; index < 4; index += 1) {
    await ratePage.getByLabel("Escreva uma mensagem para o fórum global").fill(`${TAG} rajada ${index}`);
    await ratePage.getByRole("button", { name: "Publicar mensagem" }).click();
    if (index < 3) {
      await ratePage.getByText(`${TAG} rajada ${index}`, { exact: true }).waitFor({ timeout: 15000 });
      await waitForComposerEmpty(ratePage);
    } else {
      const burstAlert = ratePage.getByRole("alert").filter({ hasText: /Calma aí/i }).first();
      try {
        await burstAlert.waitFor({ timeout: 10000 });
        rateLimited = true;
      } catch {
        rateLimited = false;
      }
    }
  }
  check("fórum: limite de 3 mensagens por minuto por identidade", rateLimited);

  // Denúncia
  const reportTarget = await prisma.globalMessage.findFirst({ where: { content: forumMessage } });
  await forumPage.locator("li", { hasText: forumMessage }).getByRole("button", { name: "Denunciar" }).click();
  await forumPage.getByLabel("Motivo da denúncia").selectOption("SPAM");
  await forumPage.getByRole("button", { name: "Enviar denúncia" }).click();
  await forumPage.getByText("Denúncia registrada.").first().waitFor({ timeout: 10000 });
  const reportRow = await prisma.report.findFirst({
    where: { targetType: "GLOBAL_MESSAGE", targetId: reportTarget.id },
  });
  check("fórum: denúncia é persistida para a moderação", Boolean(reportRow), reportRow?.status);

  // Suspensão temporária da sessão anônima
  const banResponse = await api(demoPage, "POST", "/api/admin/forum/bans", {
    sessionId: anonMessage.sessionId,
    reason: `${TAG} teste de suspensão`,
    hours: 1,
  });
  await forumPage.getByLabel("Escreva uma mensagem para o fórum global").fill(`${TAG} após banimento`);
  const [banPost] = await Promise.all([
    forumPage.waitForResponse(
      (response) => response.url().includes("/api/forum/messages") && response.request().method() === "POST",
      { timeout: 15000 },
    ),
    forumPage.getByRole("button", { name: "Publicar mensagem" }).click(),
  ]);
  const banAlert = forumPage.getByRole("alert").first();
  let banBlocked = true;
  try {
    await banAlert.waitFor({ timeout: 10000 });
  } catch {
    banBlocked = false;
  }
  const banText = banBlocked ? await banAlert.innerText() : "";
  check(
    "fórum: sessão suspensa pela moderação não publica",
    banResponse.status === 200 && banPost.status() === 403 && /suspensa/i.test(banText),
    `${banResponse.status}/${banPost.status()} ${banText}`,
  );

  await rateContext.close();
  await liveContext.close();
  await forumContext.close();
  await prisma.forumBan.deleteMany({ where: { sessionId: anonMessage.sessionId } });

  // ---------------------------------------------------------------- Private messages
  console.log("\n=== Mensagens privadas ===");
  const anonMessagesResponse = await api(anonPage, "GET", "/api/conversations");
  await anonPage.goto(`${BASE}/comunidade?aba=mensagens`, { waitUntil: "networkidle" });
  check(
    "mensagens: visitante não acessa conversas (UI + API)",
    anonMessagesResponse.status === 401 &&
      (await anonPage.getByText("Mensagens privadas só para membros").count()) === 1,
    String(anonMessagesResponse.status),
  );

  const directCreate = await api(demoPage, "POST", "/api/conversations", {
    type: "DIRECT",
    userId: marina.id,
  });
  const directId = directCreate.data?.conversationId;
  const secretMessage = `${TAG} conteúdo privado confidencial`;
  const sendDirect = directId
    ? await api(demoPage, "POST", `/api/conversations/${directId}/messages`, { content: secretMessage })
    : { status: 0 };
  check(
    "mensagens: conversa direta criada e mensagem enviada",
    [200, 201].includes(directCreate.status) && sendDirect.status === 201,
    `${directCreate.status}/${sendDirect.status}`,
  );

  const marinaInbox = await api(marinaPage, "GET", "/api/conversations");
  const directSummary = marinaInbox.data?.conversations?.find((item) => item.id === directId);
  const marinaThread = directId
    ? await api(marinaPage, "GET", `/api/conversations/${directId}`)
    : { data: null };
  check(
    "mensagens: destinatário vê não lida e o histórico",
    marinaInbox.status === 200 &&
      directSummary?.unread >= 1 &&
      (marinaThread.data?.messages?.items ?? []).some((item) => item.content === secretMessage),
    `unread=${directSummary?.unread}`,
  );

  if (directId) {
    await api(marinaPage, "POST", `/api/conversations/${directId}/read`);
  }
  const marinaAfterRead = await api(marinaPage, "GET", "/api/conversations");
  const readSummary = marinaAfterRead.data?.conversations?.find((item) => item.id === directId);
  check("mensagens: marcar como lida zera o indicador", readSummary?.unread === 0, `unread=${readSummary?.unread}`);

  const { context: guestContext, page: guestPage } = await login("e2e-social@motormeetings.local");
  const guestThread = directId
    ? await api(guestPage, "GET", `/api/conversations/${directId}`)
    : { status: 0 };
  const guestWrite = directId
    ? await api(guestPage, "POST", `/api/conversations/${directId}/messages`, { content: `${TAG} invasão` })
    : { status: 0 };
  check(
    "mensagens: não membro recebe 404 ao ler e ao enviar",
    guestThread.status === 404 && guestWrite.status === 404,
    `${guestThread.status}/${guestWrite.status}`,
  );

  const groupName = `${TAG} Grupo`;
  const groupCreate = await api(demoPage, "POST", "/api/conversations", {
    type: "GROUP",
    name: groupName,
    memberIds: [marina.id],
  });
  const groupId = groupCreate.data?.conversationId;
  check("mensagens: grupo privado criado com administrador", groupCreate.status === 201 && Boolean(groupId));

  const renamedGroup = groupId
    ? await api(demoPage, "PATCH", `/api/conversations/${groupId}`, { name: `${groupName} renomeado` })
    : { status: 0 };
  const groupNotification = groupId
    ? await prisma.notification.findFirst({
        where: { userId: marina.id, type: "GROUP_UPDATED", targetUrl: { contains: groupId } },
      })
    : null;
  check(
    "mensagens: renomear grupo notifica os participantes",
    renamedGroup.status === 200 && Boolean(groupNotification),
    String(renamedGroup.status),
  );

  const addGuest = groupId
    ? await api(demoPage, "POST", `/api/conversations/${groupId}/members`, { userIds: [guest.id] })
    : { status: 0 };
  const guestMember = groupId
    ? await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: groupId, userId: guest.id } },
      })
    : null;
  const removeGuest = groupId
    ? await api(demoPage, "DELETE", `/api/conversations/${groupId}/members`, { userIds: [guest.id] })
    : { status: 0 };
  const guestMemberAfter = groupId
    ? await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: groupId, userId: guest.id } },
      })
    : null;
  check(
    "mensagens: administrador adiciona e remove participantes",
    addGuest.status === 200 && Boolean(guestMember) && removeGuest.status === 200 && !guestMemberAfter,
  );

  const closeGroup = groupId
    ? await api(demoPage, "PATCH", `/api/conversations/${groupId}`, { status: "CLOSED" })
    : { status: 0 };
  const marinaSendClosed = groupId
    ? await api(marinaPage, "POST", `/api/conversations/${groupId}/messages`, { content: `${TAG} após encerrar` })
    : { status: 0 };
  check(
    "mensagens: grupo encerrado bloqueia novos envios",
    closeGroup.status === 200 && marinaSendClosed.status === 403,
    `${closeGroup.status}/${marinaSendClosed.status}`,
  );

  const privateNotification = await prisma.notification.findFirst({
    where: { userId: marina.id, type: "PRIVATE_MESSAGE" },
  });
  check(
    "mensagens: notificação de mensagem privada não inclui o conteúdo",
    Boolean(privateNotification) && !privateNotification.body.includes(secretMessage),
    privateNotification?.body,
  );
  await guestContext.close();

  // ---------------------------------------------------------------- Cookies / LGPD
  console.log("\n=== Consentimento de cookies ===");
  const cookieContext = await newContext();
  const cookiePage = await cookieContext.newPage();
  await cookiePage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const cookieBanner = cookiePage.getByRole("region", { name: "Preferências de cookies" });
  check("cookies: banner aparece na primeira visita", await cookieBanner.isVisible());

  const pageUsableWithBanner = await cookiePage
    .getByRole("heading", { level: 1 })
    .isVisible();
  check("cookies: banner não bloqueia o uso do site", pageUsableWithBanner);

  await cookieBanner.getByRole("button", { name: "Rejeitar opcionais" }).click();
  await cookieBanner.waitFor({ state: "hidden" });
  const rejectedCookies = await cookieContext.cookies(BASE);
  const consentCookie = rejectedCookies.find((cookie) => cookie.name === "mm_consent");
  check(
    "cookies: rejeitar opcionais grava apenas necessários",
    (consentCookie ? decodeURIComponent(consentCookie.value) : "") === "2026-10-29:0:0",
    consentCookie?.value,
  );

  const anonCookie = rejectedCookies.find((cookie) => cookie.name === "mm_anon");
  const consentRows = anonCookie
    ? await prisma.cookieConsent.count({ where: { anonymousSessionId: anonCookie.value } })
    : 0;
  check("cookies: escolha registrada no banco para auditoria", consentRows >= 1, String(consentRows));

  await cookiePage.reload({ waitUntil: "networkidle" });
  check(
    "cookies: escolha persiste e banner não reaparece",
    !(await cookieBanner.isVisible().catch(() => false)),
  );

  await cookiePage.getByRole("button", { name: "Preferências de cookies" }).first().click();
  await cookieBanner.waitFor();
  await cookiePage.waitForTimeout(500);
  const prefCheckbox = cookieBanner.getByLabel(/^Preferências/).first();
  const analyticsCheckbox = cookieBanner.getByLabel(/^Medição/).first();
  check(
    "cookies: reabrir pelo rodapé mostra a escolha atual",
    (await prefCheckbox.isChecked()) === false && (await analyticsCheckbox.isChecked()) === false,
  );

  await prefCheckbox.check();
  await cookieBanner.getByRole("button", { name: "Salvar escolhas" }).click();
  await cookieBanner.waitFor({ state: "hidden" });
  const customCookie = (await cookieContext.cookies(BASE)).find((cookie) => cookie.name === "mm_consent");
  check(
    "cookies: personalizar salva somente as categorias escolhidas",
    (customCookie ? decodeURIComponent(customCookie.value) : "") === "2026-10-29:1:0",
    customCookie?.value,
  );

  await cookiePage.goto(`${BASE}/cookies`, { waitUntil: "networkidle" });
  check(
    "cookies: página /cookies reflete a escolha e documenta mm_session",
    /Você liberou preferências/i.test(await text(cookiePage)) && /mm_session/.test(await text(cookiePage)),
  );

  await cookiePage.getByRole("button", { name: "Preferências de cookies" }).first().click();
  await cookieBanner.waitFor();
  await cookieBanner.getByRole("button", { name: "Aceitar todos" }).click();
  await cookieBanner.waitFor({ state: "hidden" });
  const acceptedCookie = (await cookieContext.cookies(BASE)).find((cookie) => cookie.name === "mm_consent");
  check(
    "cookies: aceitar todos libera as categorias opcionais",
    (acceptedCookie ? decodeURIComponent(acceptedCookie.value) : "") === "2026-10-29:1:1",
    acceptedCookie?.value,
  );

  const invalidConsent = await api(cookiePage, "POST", "/api/consent", { preferences: "sim" });
  check("cookies: payload inválido é rejeitado", invalidConsent.status === 422, String(invalidConsent.status));
  await cookieContext.close();

  // ---------------------------------------------------------------- Notifications
  console.log("\n=== Notificações ===");
  const anonNotificationPage = await anonPage.goto(`${BASE}/comunidade/notificacoes`, {
    waitUntil: "networkidle",
  });
  check(
    "notificações: visitante é redirecionado para o login",
    anonNotificationPage?.status() === 200 && anonPage.url().includes("/entrar"),
  );
  const anonNotificationApi = await api(anonPage, "GET", "/api/notifications");
  check("notificações: API protege dados do usuário", anonNotificationApi.status === 401);

  const pushConfig = await api(anonPage, "GET", "/api/push");
  const pushPayload = JSON.stringify(pushConfig.data ?? {});
  check(
    "notificações: push configurado expõe apenas a chave pública",
    pushConfig.data?.configured === true &&
      Boolean(pushConfig.data?.publicKey) &&
      !/VAPID_PRIVATE_KEY|privateKey/i.test(pushPayload),
  );
  const invalidPush = await api(anonPage, "POST", "/api/push/subscribe", {
    endpoint: "http://evil.example.com/push",
    keys: { p256dh: "x".repeat(20), auth: "y".repeat(10) },
  });
  check("notificações: inscrição push inválida é rejeitada", invalidPush.status === 422, String(invalidPush.status));

  const eventCreate = await api(demoPage, "POST", "/api/events", {
    title: `${TAG} Evento notificado`,
    category: "ROLE_NOTURNO",
    city: "Goiânia",
    eventDate: isoDaysFromNow(20),
    startTime: "20:00",
    meetingPoint: "Praça do Sol — Setor Oeste, Goiânia",
  });
  const createdEventId = eventCreate.data?.event?.id;
  const createdEventSlug = eventCreate.data?.event?.slug;
  await new Promise((resolve) => setTimeout(resolve, 600));
  const eventNotification = await prisma.notification.findFirst({
    where: { userId: marina.id, type: "NEW_EVENT", targetUrl: `/eventos/${createdEventSlug}` },
  });
  const ownEventNotification = createdEventId
    ? await prisma.notification.findFirst({
        where: { userId: demo.id, type: "NEW_EVENT", targetUrl: `/eventos/${createdEventSlug}` },
      })
    : null;
  check(
    "notificações: publicação de evento notifica outros usuários (não o autor)",
    eventCreate.status === 201 && Boolean(eventNotification) && !ownEventNotification,
    `status=${eventCreate.status}`,
  );

  await marinaPage.goto(`${BASE}/comunidade`, { waitUntil: "networkidle" });
  const bell = marinaPage.getByRole("button", { name: /Notificações/ }).first();
  await bell.waitFor();
  const bellLabel = (await bell.getAttribute("aria-label")) ?? "";
  check("notificações: sino mostra indicador de não lidas", /Notificações, \d+ não lidas/.test(bellLabel), bellLabel);

  await bell.click();
  const bellMenu = marinaPage.getByRole("menu", { name: "Notificações" });
  await bellMenu.waitFor();
  check(
    "notificações: sino lista eventos, mensagens e grupos",
    (await bellMenu.getByText("Novo rolê no MotorMeetings!").count()) >= 1 &&
      (await bellMenu.getByText(/Nova mensagem de Arthur Alves/).count()) >= 1 &&
      (await bellMenu.getByText("Você entrou em um grupo privado").count()) >= 1,
  );

  await bellMenu.getByText("Novo rolê no MotorMeetings!").first().click();
  await marinaPage.waitForURL(/\/eventos\//, { timeout: 15000 });
  await marinaPage.waitForTimeout(600);
  const readNotification = createdEventSlug
    ? await prisma.notification.findFirst({
        where: { userId: marina.id, type: "NEW_EVENT", targetUrl: `/eventos/${createdEventSlug}` },
      })
    : null;
  check(
    "notificações: clique abre o evento e marca como lida",
    marinaPage.url().includes(createdEventSlug) && Boolean(readNotification?.readAt),
    marinaPage.url(),
  );

  await marinaPage.goto(`${BASE}/comunidade/notificacoes`, { waitUntil: "networkidle" });
  check(
    "notificações: central dedicada lista o histórico",
    (await marinaPage.getByRole("heading", { name: "Suas notificações" }).count()) === 1 &&
      (await marinaPage.getByText("Novo rolê no MotorMeetings!").count()) >= 1,
  );
  await marinaPage.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await marinaPage.getByText(/Tudo em dia/i).waitFor({ timeout: 10000 });
  const unreadLeft = await prisma.notification.count({ where: { userId: marina.id, readAt: null } });
  check("notificações: marcar todas como lidas zera o contador", unreadLeft === 0, String(unreadLeft));

  const notificationsApi = await api(marinaPage, "GET", "/api/notifications?limit=50");
  const notificationItems = notificationsApi.data?.items ?? [];
  check(
    "notificações: API não expõe e-mail nem conteúdo privado",
    notificationItems.length > 0 &&
      !notificationItems.some(
        (item) => /@|demo@motormeetings|conteúdo privado confidencial/i.test(`${item.title} ${item.body}`),
      ),
  );

  // SSE: nova mensagem privada aparece sem recarregar
  await marinaPage.getByRole("heading", { name: "Suas notificações" }).waitFor();
  const realtimeItems = marinaPage.getByText("Nova mensagem de Arthur Alves");
  const initialCount = await realtimeItems.count();
  if (directId) {
    await api(demoPage, "POST", `/api/conversations/${directId}/messages`, {
      content: `${TAG} mensagem em tempo real`,
    });
  }
  check(
    "notificações: central recebe novas notificações em tempo real",
    await waitForCount(realtimeItems, initialCount + 1, 15000),
  );

  await demoContext.close();
  await anonContext.close();
  await marinaContext.close();
  await ownerContext.close();
} finally {
  await browser.close();
  await cleanup();
  await prisma.user.deleteMany({ where: { email: "e2e-social@motormeetings.local" } });
  await prisma.$disconnect();
}

console.log(
  failures.length
    ? `\n${failures.length} FAILURE(S): ${failures.join("; ")}`
    : "\nE2E SOCIAL: ALL CHECKS PASSED",
);
process.exit(failures.length ? 1 : 0);

function isUploadSrc(src) {
  return typeof src === "string" && (src.startsWith("/uploads/") || src.includes("%2Fuploads%2F"));
}
