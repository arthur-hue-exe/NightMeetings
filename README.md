# MotorMeetings

Plataforma web em português para divulgar e organizar encontros de motos em Goiânia, Aparecida de Goiânia e região metropolitana. O projeto entrega cadastro e login reais, publicação de eventos com upload de imagens, catálogo com filtros sobre o banco, área do organizador, expiração automática de eventos e páginas públicas compartilháveis. Também inclui a área **Comunidade**: grupos com convite oficial do WhatsApp, fórum global em tempo real (inclusive para visitantes), mensagens privadas, notificações internas, Web Push opcional, consentimento de cookies (LGPD) e moderação administrativa.

## Stack

- Next.js 15.5 (App Router) + React 19 + TypeScript estrito
- Tailwind CSS v4
- GSAP + ScrollTrigger (respeitando `prefers-reduced-motion`)
- Lucide React
- PostgreSQL em produção / SQLite no desenvolvimento + Prisma 6
- Zod + React Hook Form
- Sharp para processamento de imagens
- Web Push (VAPID) com service worker próprio
- SSE (Server-Sent Events) para tempo real, sem dependência de serviço externo
- Playwright para validação end-to-end

## Funcionalidades

### Conta e autenticação
- Cadastro com nome público, e-mail e senha (mínimo validado no cliente e no servidor).
- Senhas com `scrypt` (salt individual) e sessões opacas de 30 dias. Apenas o hash SHA-256 do token é gravado no banco.
- Cookie `mm_session` `HttpOnly`, `SameSite=Lax`, `Secure` em produção.
- Login com mensagens de erro, logout e redirecionamento de rotas protegidas.
- Somente o nome público do organizador é exibido. E-mails, hashes e IDs de sessão nunca aparecem em páginas públicas.
- Recuperação de senha por e-mail não está implementada (ver [Limitações](#limitações-e-decisões)).

### Eventos
- Formulário em quatro etapas: informações básicas, encontro/trajeto, detalhes e revisão, com validação Zod e prévia.
- Campos: título, categoria, cidade, data, horário, ponto de encontro, descrição, capa, galeria, regras, informações extras, Instagram público, observações de trajeto e dados opcionais de saída/chegada (incluindo chegada no dia seguinte).
- Upload de capa e até 6 fotos adicionais, com prévia, progresso, limite de tamanho e validação de formato.
- Publicação real no banco, página pública, confirmação e link compartilhável.
- Linha do tempo separando concentração, saída e chegada. Links do Google Maps usam somente os endereços informados (sem coordenadas, distâncias ou tempos inventados).
- Página de detalhe em `/eventos/nome-do-evento-id` com capa, galeria com lightbox, trajeto, mapa, compartilhamento (Web Share API com fallback de cópia) e aviso de evento cancelado/expirado.
- Expiração calculada no servidor: o evento permanece visível até o fim do dia final em `America/Sao_Paulo` e some das listagens no dia seguinte. Eventos de vários dias usam `endDate`. Registros não são apagados.
- Confirmação de presença (RSVP) nos cards e na página do evento, com cancelamento e reconfirmação. A API pública expõe apenas a contagem agregada de presenças ativas, nunca nomes, e-mails ou a lista de participantes. A contagem é calculada no banco e a chave única `(eventId, userId)` impede duplicidade mesmo em requisições simultâneas.

### Catálogo e organização
- Busca com debounce, filtros de cidade, categoria, data, período (dia/noite) e presença de rota, com ordenação por mais próximo ou mais recente.
- Paginação, estados de carregamento (skeleton), vazio, sem resultados e erro.
- "Meus eventos" com edição, cancelamento, reativação e exclusão lógica, sempre com confirmação para ações destrutivas.
- Autorização verificada no backend: um organizador não consegue editar, cancelar ou excluir eventos de outro, nem abrir a tela de edição alheia.
- Perfil público do organizador com nome, data de entrada e eventos ativos.
- Páginas institucionais: Como funciona, Sobre, Privacidade (LGPD), Termos, 404 personalizada e rodapé com Instagram oficial, links e ano dinâmico.

### Comunidade

- Aba **Comunidade** com grupos (WhatsApp), fórum global em tempo real e mensagens privadas.
- Criação de grupo apenas para usuários autenticados, com **emblema obrigatório** (upload próprio, persistido em WebP) e **convite oficial do WhatsApp** validado no servidor (`https://chat.whatsapp.com/...`). Links inventados ou de outros domínios são recusados.
- Campos opcionais: descrição, cidade/região e categoria. A página pública `/comunidade/nome-id` mostra o emblema, o convite e um aviso de que o WhatsApp é serviço externo. **Não há contagem de membros nem níveis de atividade inventados.**
- O criador pode editar, desativar, reativar e excluir o grupo; a autorização é verificada no backend. Grupos desativados somem das listagens e retornam 404 na página pública.

### Fórum global

- Mensagens em tempo real via SSE, com histórico paginado.
- Visitantes podem publicar com apelido automático estável (formato `User 4821`) vinculado a cookie anônimo `HttpOnly`; usuários autenticados aparecem com o nome público. IP e e-mail nunca são exibidos.
- Limite de 1000 caracteres, conteúdo tratado como texto (sem HTML) e sem anexos.
- Proteções no servidor: limite por sessão/identidade, por IP com hash (`FORUM_IP_SALT`), janelas de tempo e bloqueio de mensagens duplicadas.
- Denúncias de mensagens, ocultação pela moderação, banimento temporário de sessões anônimas e retenção automática de 90 dias.

### Mensagens privadas

- Conversas diretas e em grupo, com indicador de não lidas e atualização em tempo real.
- Administradores do grupo podem renomear, adicionar/remover participantes, definir imagem e encerrar a conversa.
- Todas as operações verificam participação no servidor; visitantes não autenticados não acessam conversas.
- **Não há criptografia ponta a ponta**; o conteúdo fica no servidor e nunca é incluído em notificações ou push.

### Cookies, notificações e push

- Banner LGPD com **Aceitar todos**, **Rejeitar opcionais** e **Personalizar**; a escolha é gravada em cookie versionado (`mm_consent`) e auditada no banco. Categorias opcionais só são ativadas após consentimento e o site nunca é bloqueado. A escolha pode ser revista no rodapé ou em `/cookies`.
- Central de notificações e sino com contador de não lidas (eventos novos, mensagens privadas, entrada/atualização em grupos). Itens abrem o destino e podem ser marcados como lidos.
- Web Push opcional via VAPID: o service worker é registrado apenas após ação do usuário, a permissão nunca é solicitada automaticamente e não há nova solicitação após recusa. Inscrições inválidas são removidas automaticamente.
- Avisos de push de evento são enviados uma única vez por evento, somente após a publicação bem-sucedida.

### Moderação

- Denúncias com fila, decisão (resolver/descartar), ocultação de mensagens, suspensão temporária de sessões anônimas e ativação/desativação de comunidades.
- Painel em `/moderacao` e APIs em `/api/admin/*` protegidos por papel `ADMIN` tanto na página quanto no servidor. Ações relevantes geram registro de auditoria.

### SEO e apresentação
- Metadados dinâmicos, Open Graph, Twitter Card, canonical, JSON-LD de evento, `sitemap.xml` e `robots.txt`.
- Eventos expirados/cancelados recebem `noindex`; expirados e cancelados não entram no sitemap.
- Identidade escura com roxo, gradientes e vidro fosco, navbar com transição ao rolar, indicador ativo e menu mobile.
- Layout validado em 360, 390, 768, 1024 e 1440 px, sem rolagem horizontal.

## Como rodar localmente

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
cp .env.example .env      # ajuste se necessário
npx prisma migrate deploy # aplica a migração inicial
npm run db:seed           # dados de demonstração
npm run dev
```

Acesse `http://localhost:3000`.

Para validar a build de produção:

```bash
npm run typecheck
npm run build
npm start
```

### Contas de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Organizador | `demo@motormeetings.com.br` | `motormeetings123` |
| Organizadora | `marina@motormeetings.com.br` | `motormeetings123` |

O seed recria os eventos de demonstração e remove eventos anteriores dos dois usuários demo. Não execute o seed em produção.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | SQLite (`file:./dev.db`) no desenvolvimento ou URL PostgreSQL em produção. |
| `NEXT_PUBLIC_SITE_URL` | Sim em produção | URL pública sem barra final. Usada em metadados, sitemap, robots e links absolutos. |
| `MAX_UPLOAD_MB` | Não | Limite por imagem em MB. Padrão: `5`. |
| `UPLOAD_DIR` | Não | Diretório dos uploads no driver `local`. Padrão: `./storage/uploads`. |
| `STORAGE_DRIVER` | Não | `local` ou `vercel-blob`. Sem valor, usa Blob quando `BLOB_READ_WRITE_TOKEN` existe e `local` fora da Vercel. |
| `BLOB_READ_WRITE_TOKEN` | Na Vercel | Token do Vercel Blob, injetado ao conectar um Blob store. Somente no servidor. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Para push | Chave pública VAPID (pode ir ao frontend; **nunca** a privada). |
| `VAPID_PRIVATE_KEY` | Para push | Chave privada VAPID, somente no servidor. |
| `VAPID_SUBJECT` | Para push | Contato `mailto:` ou URL exigido pelo protocolo Web Push. |
| `FORUM_IP_SALT` | Recomendada | Segredo aleatório para hash de IP nas proteções antispam do fórum. |

Credenciais reais de banco, storage ou e-mail não estão incluídas no repositório. Configure-as apenas no ambiente de execução.

## Banco de dados

Modelos Prisma em `prisma/schema.prisma`:

- `User`: `id`, `name`, `email` único, `passwordHash`, timestamps, relações com eventos e sessões.
- `Session`: `id`, `tokenHash` único, `userId`, `expiresAt`, `createdAt`; exclusão em cascata com o usuário.
- `Event`: dados do evento, status (`ACTIVE`, `CANCELLED`, `DELETED`), destaque, proprietário (`userId`) e timestamps.
- `EventImage`: galeria do evento (`eventId`, `imageUrl`, `altText`), cascata na exclusão do evento.
- `EventAttendance`: confirmação de presença (`eventId`, `userId`, `cancelledAt`), com chave única por evento/usuário. Cancelar mantém o registro para permitir reconfirmar sem duplicar a contagem.
- `AnonymousSession`: identidade anônima do fórum (`id`, apelido `User NNNN`, `lastSeenAt`).
- `GlobalMessage`: mensagens do fórum (`sessionId` ou `userId`, `displayName`, `content`, `ipHash`, `moderationStatus`).
- `Community`: grupos (`name`, `slug`, `description`, `city`, `category`, `emblemUrl`, `whatsappInviteUrl`, `status`, `creatorId`).
- `Conversation`, `ConversationMember`, `PrivateMessage`: conversas diretas/grupo, participantes com papel e mensagens.
- `Notification`: notificações internas por usuário (`type`, `title`, `body`, `targetUrl`, `readAt`).
- `PushSubscription`: inscrições Web Push por endpoint único.
- `CookieConsent`: auditoria da escolha de cookies (versão, categorias, data, sessão/usuário).
- `Report`, `ForumBan`, `ModerationLog`: denúncias, suspensões temporárias e auditoria de moderação.

Datas e horários são gravados como texto (`YYYY-MM-DD` e `HH:mm`) no fuso `America/Sao_Paulo`. Isso evita deslocamento de um dia em conversões UTC. A expiração compara `(endDate ?? eventDate)` com a data atual de São Paulo, tanto nas consultas quanto nas páginas.

Índices cobrem status/data, cidade/categoria/status, proprietário/status, destaque/status e criação.

### Migrações

A migração inicial está em `prisma/migrations/20261029122458_init`. A expansão social usa migrações incrementais:

- `20261029131449_community_social`: comunidades, fórum, conversas, notificações, push, consentimento e moderação.
- `20261029132213_event_notification`: marca `Event.notifiedAt` para envio idempotente de push/notificação de novo evento.
- `20261029160000_event_attendance`: cria `EventAttendance` e seus índices, sem alterar ou remover dados existentes.

```bash
npx prisma migrate dev    # desenvolvimento
npx prisma migrate deploy # produção
```

### Migrar de SQLite para PostgreSQL

1. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`.
2. Configure `DATABASE_URL` com a conexão PostgreSQL (variável de ambiente, nunca no código).
3. Crie uma história de migrações para o novo banco (`npx prisma migrate dev --name init_postgres`) em um ambiente limpo. Não reutilize a migração SQLite em PostgreSQL.
4. Em produção, execute `npx prisma migrate deploy` antes de subir a aplicação.

Os campos de data continuam como texto, portanto a troca de banco não altera a regra de fuso horário.

## Uploads e armazenamento

- Dois drivers em `src/lib/storage.ts`: `local` (disco em `UPLOAD_DIR`, padrão `storage/uploads`) e `vercel-blob` (Vercel Blob, URLs públicas em `*.public.blob.vercel-storage.com`). O driver é resolvido por `STORAGE_DRIVER` ou pela presença de `BLOB_READ_WRITE_TOKEN`.
- Na Vercel sem `BLOB_READ_WRITE_TOKEN`, o upload falha explicitamente com **503** (`STORAGE_UNCONFIGURED`) em vez de tentar gravar no sistema de arquivos somente leitura.
- Formatos aceitos: JPEG, PNG, WebP e AVIF, com verificação de assinatura binária além do MIME.
- Processamento com Sharp em memória: rotação EXIF, redimensionamento para no máximo 2000×2000 e conversão para WebP qualidade 82. Limite de 40 megapixels na entrada. O processamento não grava em disco.
- Limite de tamanho por arquivo via `MAX_UPLOAD_MB` (padrão 5 MB) e até 6 imagens na galeria.
- No driver `local`, a leitura continua por `/uploads/[filename]` com validação de nome, `Content-Type: image/webp`, cache imutável e `nosniff`. No driver `vercel-blob`, o arquivo é servido pelo CDN do Blob.
- Códigos de resposta de `POST /api/upload`: `400` arquivo ausente/ilegível, `413` acima do limite, `415` formato não permitido, `422` imagem inválida ou corrompida, `503` storage não configurado, `500`/`502` falha interna de processamento ou armazenamento. O corpo inclui `code` estável (`INVALID_IMAGE`, `TOO_LARGE`, `STORAGE_UNCONFIGURED` etc.).
- Falhas são registradas no servidor com etapa, driver, MIME, tamanho e mensagem do erro real (tokens e credenciais são mascarados); o conteúdo da imagem nunca é registrado.
- Ao editar um evento, imagens removidas da galeria/capa são apagadas do disco ou do Blob quando não estão em uso. Eventos excluídos logicamente permanecem no histórico; arquivos podem ficar sem vínculo, como descrito na Política de Privacidade.

## Tempo real, notificações e push

### SSE (fórum, mensagens e notificações)

- O tempo real usa Server-Sent Events em `/api/forum/stream`, `/api/conversations/[id]/stream` e `/api/notifications/stream`, com heartbeat a cada 25s.
- O pub/sub é em memória (`src/lib/realtime.ts`) e funciona em **uma única instância** do servidor. Para múltiplas instâncias atrás de balanceador, é necessário um barramento compartilhado (ex.: Redis Pub/Sub) ou sticky sessions; essa integração não está incluída.
- Notificações também são persistidas no banco; a SSE apenas avisa o cliente para recarregar, evitando perda de eventos.

### Web Push

- Service worker em `public/sw.js`, registrado em `/sw.js` somente após ação explícita do usuário.
- Chaves VAPID configuradas por variáveis de ambiente; a privada nunca é exposta ao cliente.
- Envio apenas no backend, após publicação bem-sucedida de evento, com `Event.notifiedAt` garantindo idempotência e remoção de inscrições que retornam 404/410.
- Push de mensagens privadas não está habilitado; notificações e push nunca carregam o conteúdo de conversas privadas.
- Push exige HTTPS (ou localhost) e permissão do navegador; sem isso, a interface informa indisponibilidade e a central de notificações continua funcionando.

## Segurança

- Validação Zod no cliente e no servidor; APIs recusam requisições de outra origem.
- Autorização por proprietário em todas as mutações de evento.
- Rate limiting em memória: login (12/15 min por IP), cadastro (8/h), criação de evento (12/h por usuário), upload (80/h por usuário), criação de comunidade (6/h por usuário), fórum (30/10 min por IP e 12/10 min por identidade, além de 3/min e verificação de duplicidade), denúncias (10/h), criação de conversa (20/h) e mensagens privadas (30/min).
- Limites do fórum combinam identidade em banco e hash de IP (`FORUM_IP_SALT`), sem depender apenas de cookies; sessões anônimas podem ser banidas temporariamente.
- Autorização por proprietário em eventos, apenas o criador gerencia comunidades, apenas participantes acessam conversas (leitura e escrita) e todas as rotas `/api/admin/*` e a página `/moderacao` exigem papel `ADMIN` verificado no servidor.
- Convites de WhatsApp validados por protocolo, host exato `chat.whatsapp.com`, ausência de credenciais/porta/query/hash e formato do código.
- Notificações e push não incluem conteúdo de mensagens privadas, e-mails ou hashes; o painel público nunca exibe esses dados.
- Dados de consentimento são versionados e auditados; categorias opcionais não são ativadas antes da escolha.
- Senhas com `scrypt` e salt; tokens de sessão opacos com hash no banco; cookies `HttpOnly`.
- Uploads com limite de tamanho, validação de tipo/assinatura, nome gerado e proteção contra path traversal.
- Erros internos não são devolvidos ao cliente; mensagens são genéricas e acionáveis.
- Nenhum segredo é embutido no frontend. Variáveis `NEXT_PUBLIC_*` contêm apenas a URL pública do site.
- Cabeçalhos de segurança (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) em `next.config.ts`.

## SEO, acessibilidade e performance

- Metadados por rota, Open Graph/Twitter, imagem de compartilhamento, canonical e JSON-LD.
- `sitemap.xml` revalidado a cada hora e `robots.txt` bloqueando áreas privadas e APIs.
- Auditoria axe-core (WCAG 2.1 A/AA) sem violações nas páginas públicas e autenticadas testadas.
- Link "Pular para o conteúdo", foco visível, rótulos em formulários, `aria-live` em mensagens, diálogos com foco gerenciado, fechamento por Esc e navegação por teclado no lightbox.
- Imagens via `next/image` quando servidas de `public`, `sizes` responsivos, lazy loading fora da primeira dobra e animações desativadas com `prefers-reduced-motion`.

## Testes

Validações executadas nesta entrega:

```bash
npm run typecheck          # sem erros
npm run build              # build de produção concluída
npm run test:e2e           # fluxo de eventos (servidor em localhost:3000)
npm run test:e2e:social    # comunidade, fórum, mensagens, cookies e notificações
```

O script `tests/e2e-social.mjs` também usa Playwright com o banco real (sem mocks) e cobre 58 verificações:

1. **Comunidades (16):** abas públicas, ausência de contagem de membros, bloqueio de criação para visitantes, emblema obrigatório no servidor, convite fora do WhatsApp recusado, criação válida com emblema WebP persistido, botão e aviso do WhatsApp, ausência de números inventados, listagem pública, 404/403 para não proprietário, edição persistida, desativação/reativação e exclusão.
2. **Fórum (10):** apelido `User NNNN` sem e-mail/IP, estabilidade do apelido, limite de 1000 caracteres, bloqueio de duplicidade, SSE entre dois visitantes, HTML exibido como texto, limite de 3/min por identidade, denúncia persistida e suspensão de sessão.
3. **Mensagens privadas (10):** bloqueio de visitante, conversa direta com envio, não lida e histórico, marcação de leitura, 404 para não membro (leitura e escrita), grupo com administrador, renomeação notificada, adição/remoção de participantes, grupo encerrado e ausência de conteúdo privado nas notificações.
4. **Cookies (10):** banner na primeira visita sem bloquear o site, rejeição (`0:0`), auditoria no banco, persistência sem novo banner, reabertura com escolhas atuais, personalização (`1:0`), página `/cookies`, aceite total (`1:1`) e payload inválido.
5. **Notificações (12):** redirecionamento e 401 para visitante, push expondo apenas chave pública, inscrição inválida recusada, evento notificando terceiros (não o autor), sino com não lidas, menu com evento/mensagem/grupo, clique abrindo o evento e marcando leitura, central dedicada, "marcar todas", API sem e-mail/conteúdo privado e atualização em tempo real.

O script também cria dados isolados por execução (`E2E-<timestamp>`), limpa apenas os registros que gerou e usa um usuário proprietário novo por execução para não esgotar limites de taxa entre testes.

Resultado da última execução: `npm run typecheck` e `npm run build` sem erros; `e2e.mjs` e `e2e-social.mjs` com todas as verificações passando no build de produção servido por `next start`.

O script `tests/e2e.mjs` usa Playwright e cobre:

1. Cadastro, sessão e bloqueio de rota protegida.
2. Erro de credenciais e login válido.
3. Criação de evento em quatro etapas com upload de capa e link público.
4. Persistência em `GET /eventos/[slug]` e verificação de que o upload é servido como `image/webp`.
5. Edição com `PATCH` e título persistido.
6. Cancelamento, ausência no catálogo e reativação.
7. Exclusão com confirmação, remoção de "Meus eventos" e detalhe em 404.
8. Autorização cruzada: `PATCH`, `DELETE` e status retornam 403; edição alheia retorna 404.
9. Catálogo com busca, filtros combinados, ordenação, paginação, sem resultados e estado vazio.
10. Expiração: evento antigo fora do catálogo e do sitemap, detalhe com aviso e `noindex`.
11. Detalhe: JSON-LD, lightbox por teclado e links de mapa sem datas ou coordenadas inventadas.
12. Perfil público sem e-mails.
13. `robots.txt`, `sitemap.xml`, 404 personalizada e todas as rotas institucionais.
14. Responsividade em 360/390/768/1024/1440, sem rolagem horizontal, e menu mobile com bloqueio de scroll e fechamento por Esc.
15. Ausência de erros de console durante a navegação pública.

Também foram validados manualmente: logout com limpeza do cookie e redirecionamento, compartilhamento com fallback de cópia, cadastro duplicado, auditoria axe-core e todas as rotas institucionais autenticadas.

Para instalar o navegador do Playwright em outra máquina:

```bash
npx playwright install chromium
```

## Deploy

### VPS ou container (recomendado para o storage local)

1. Configure as variáveis `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `MAX_UPLOAD_MB`, `UPLOAD_DIR`, `FORUM_IP_SALT` e, para push, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.
2. Gere as chaves VAPID com `npx web-push generate-vapid-keys` e mantenha a privada apenas no servidor.
3. Monte um volume persistente e aponte `UPLOAD_DIR` para ele (por exemplo `/data/uploads`).
4. Rode `npx prisma migrate deploy`.
5. Rode `npm run build` e inicie com `npm start` (ou use um processo supervisor).
6. Configure HTTPS no proxy reverso; o cookie de sessão usa `Secure` em produção e o Web Push exige HTTPS. O service worker é servido em `/sw.js`.
7. Mantenha **uma única instância** do Node ou configure sessões sticky/barramento compartilhado: o SSE e o rate limiting são em memória. Para várias instâncias, use Redis (ou equivalente) para pub/sub e contadores.

### Vercel ou ambiente serverless

1. No painel da Vercel, crie um **Blob store** (Storage → Blob) e conecte-o ao projeto. A Vercel injeta `BLOB_READ_WRITE_TOKEN` automaticamente; não é necessário copiar o token para o código.
2. Configure `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `MAX_UPLOAD_MB`, `FORUM_IP_SALT` e, para push, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`. `STORAGE_DRIVER=vercel-blob` é opcional (o token já seleciona o driver).
3. Rode `npx prisma migrate deploy` e faça o deploy. Funções de API usam o runtime Node.js; o upload declara `maxDuration = 30` para imagens maiores.
4. Sem o token do Blob, `POST /api/upload` responde `503` com `code: "STORAGE_UNCONFIGURED"` — o sistema não tenta usar o disco efêmero.
5. A Vercel limita o corpo de requisições de função a cerca de 4,5 MB. Defina `MAX_UPLOAD_MB=4` (ou menos) na Vercel para que imagens grandes recebam o `413` da aplicação em vez do erro da plataforma.
6. O SSE e o rate limiting continuam em memória: em múltiplas instâncias é necessário barramento compartilhado (ex.: Redis) e sessões sticky.

### Supabase

O acesso ao banco é feito via Prisma com conexão direta. Por isso, políticas RLS do Supabase não se aplicam a essa conexão; a autorização é garantida na aplicação e a credencial do banco deve ficar restrita ao servidor. Se o acesso passar a usar `supabase-js` no cliente, RLS deve ser configurada separadamente.

## Limitações e decisões

- Não há recuperação de senha nem envio de e-mails transacionais; não foram simulados fluxos inexistentes.
- Não há pagamentos, ingressos, confirmação de presença, contagem de participantes ou popularidade inventada.
- Distâncias, coordenadas e tempos de trajeto não são calculados; os links abrem buscas por endereço no Google Maps.
- Exclusão de evento é lógica (`DELETED`), preservando histórico e integridade referencial.
- O rate limiting é em memória e reinicia com o processo; para múltiplas instâncias, substitua por um store compartilhado (ex.: Redis).
- O tempo real (SSE) também é em memória e funciona em uma instância; múltiplas instâncias exigem barramento compartilhado.
- O armazenamento de imagens usa disco local em VPS/container (`UPLOAD_DIR`) e Vercel Blob em serverless; não há replicação entre os dois drivers.
- O emblema de comunidade aceita upload próprio persistido em `/uploads` ou no Vercel Blob; imagens da pasta de demonstração são válidas apenas para eventos.
- Links do WhatsApp são divulgados como enviados pelo criador; a plataforma não confirma a existência nem a moderação do grupo externo.
- Mensagens privadas não usam criptografia ponta a ponta; a moderação pode acessar conteúdo armazenado quando necessário.
- Web Push depende de navegador compatível, HTTPS e permissão do usuário; sem isso, as notificações internas continuam disponíveis.
- A Política de Privacidade descreve as práticas atuais (LGPD), incluindo cookies estritamente necessários e direitos do titular.

## Estrutura resumida

```
prisma/            schema, migrações e seed
public/sw.js        service worker de Web Push
public/images/     identidade visual e imagens de demonstração
src/app/           rotas (App Router), APIs, sitemap e robots
src/components/    layout, eventos, comunidade, notificações, moderação e UI
src/lib/           auth, storage, validação, realtime, push, moderação e utilitários
storage/uploads/   uploads persistentes (fora do versionamento)
tests/e2e.mjs      validação end-to-end de eventos com Playwright
tests/e2e-social.mjs  validação end-to-end da expansão social
```
