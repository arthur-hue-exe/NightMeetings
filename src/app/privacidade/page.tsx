import type { Metadata } from "next";
import Link from "next/link";
import { Instagram, Lock, ShieldCheck } from "lucide-react";
import { INSTAGRAM_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Saiba quais dados o MotorMeetings coleta, como eles são usados, protegidos e quais são os direitos do titular conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

const UPDATED_AT = "29 de outubro de 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/8 pt-6">
      <h2 className="display text-2xl tracking-wide text-fog sm:text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ash">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="pb-16 pt-28 lg:pt-32">
      <div className="shell">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">Privacidade</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="eyebrow">Institucional</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl">
            Política de <span className="text-gradient">privacidade</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ash">
            Esta política explica como o MotorMeetings trata dados pessoais no uso da plataforma,
            em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Última
            atualização: {UPDATED_AT}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.68rem] font-semibold text-ash">
              <ShieldCheck className="size-3.5 text-brand-light" aria-hidden="true" />
              LGPD
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.68rem] font-semibold text-ash">
              <Lock className="size-3.5 text-brand-light" aria-hidden="true" />
              Sem rastreadores de anúncio
            </span>
          </div>
        </header>

        <div className="mt-9 grid gap-8 lg:grid-cols-[0.35fr_0.65fr]">
          <aside className="h-fit rounded-2xl border border-white/8 bg-white/[0.025] p-5 lg:sticky lg:top-28">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ash">Nesta página</p>
            <ol className="mt-3 space-y-2 text-sm">
              {[
                ["dados", "1. Dados coletados"],
                ["uso", "2. Como usamos"],
                ["base-legal", "3. Base legal"],
                ["cookies", "4. Cookies e sessão"],
                ["comunidade", "5. Comunidade e mensagens"],
                ["compartilhamento", "6. Compartilhamento"],
                ["retencao", "7. Retenção"],
                ["seguranca", "8. Segurança"],
                ["direitos", "9. Seus direitos"],
                ["contato", "10. Contato"],
              ].map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-ash transition hover:text-fog">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="space-y-6">
            <Section id="dados" title="1. Dados coletados">
              <p>
                <strong className="text-fog">Cadastro e conta:</strong> nome público, endereço de
                e-mail e senha. A senha é armazenada apenas como hash criptográfico (scrypt com sal
                aleatório). O e-mail é usado para identificação e login e nunca aparece
                publicamente.
              </p>
              <p>
                <strong className="text-fog">Eventos publicados:</strong> título, categoria, cidade,
                data e horário, ponto de encontro, descrição, informações de rota, regras, contato
                de Instagram informado pelo organizador e imagens enviadas.
              </p>
              <p>
                <strong className="text-fog">Comunidade e fórum:</strong> comunidades que você cria
                (nome, descrição, cidade, categoria, emblema e link de convite do WhatsApp),
                mensagens publicadas no fórum global e denúncias enviadas à moderação. O fórum pode
                ser usado sem conta: nesse caso, criamos um apelido automático no formato{" "}
                <em>User 0000</em> vinculado a um cookie anônimo, sem usar seu e-mail.
              </p>
              <p>
                <strong className="text-fog">Mensagens privadas e notificações:</strong> conversas
                diretas e em grupo, lista de participantes, conteúdo das mensagens, notificações
                internas e, se você ativar, a inscrição de push do navegador (endpoint e chaves
                técnicas). O conteúdo de mensagens privadas não é incluído em notificações nem em
                push.
              </p>
              <p>
                <strong className="text-fog">Confirmações de presença:</strong> registramos que a sua
                conta confirmou presença em um evento, com data de criação e eventual cancelamento.
                Apenas a contagem total de presenças ativas é exibida publicamente; nomes, e-mails,
                fotos e a lista de participantes nunca são divulgados.
              </p>
              <p>
                <strong className="text-fog">Uso técnico:</strong> registro de sessão por cookie,
                endereço IP e dados básicos da requisição podem ser processados de forma transitória
                para autenticação, segurança e limitação de abuso (por exemplo, limite de uploads e
                publicações).
              </p>
              <p>
                Não solicitamos CPF, endereço residencial, dados de pagamento ou localização em
                tempo real. Não há compra, reserva ou pagamento dentro da plataforma.
              </p>
            </Section>

            <Section id="uso" title="2. Como usamos os dados">
              <ul className="list-disc space-y-2 pl-5">
                <li>Criar e autenticar sua conta e manter sua sessão ativa.</li>
                <li>Publicar, exibir, editar e compartilhar os eventos que você criou.</li>
                <li>Exibir seu nome como organizador e seus eventos ativos no perfil público.</li>
                <li>Registrar sua presença em eventos e exibir somente a contagem agregada.</li>
                <li>Validar formulários, armazenar imagens e proteger a plataforma contra abuso.</li>
                <li>Responder solicitações de suporte, correção ou exclusão de dados.</li>
              </ul>
              <p>
                Não usamos seus dados para publicidade comportamental, não vendemos dados pessoais e
                não montamos perfis de popularidade ou ranking de participantes.
              </p>
            </Section>

            <Section id="base-legal" title="3. Base legal">
              <p>
                Tratamos dados para execução de contrato e procedimentos preliminares (criação e uso
                da conta), cumprimento de obrigação legal ou regulatória quando aplicável, legítimo
                interesse na segurança e melhoria da plataforma, e consentimento quando solicitado
                para finalidades específicas. Você pode revogar o consentimento a qualquer momento,
                sem afetar o uso das funcionalidades essenciais.
              </p>
            </Section>

            <Section id="cookies" title="4. Cookies e sessão">
              <p>
                Utilizamos um cookie essencial de sessão, com as flags <code>HttpOnly</code>,{" "}
                <code>SameSite=Lax</code> e <code>Secure</code> em produção. Ele mantém você
                autenticado por até 30 dias e não é usado para rastreamento entre sites. Não
                utilizamos cookies de publicidade ou ferramentas de analytics de terceiros.
              </p>
              <p>
                Ao sair da conta, a sessão é encerrada e o cookie correspondente é invalidado. Você
                também pode apagar cookies nas configurações do navegador, o que encerra a sessão
                atual.
              </p>
              <p>
                Também usamos o cookie anônimo <code>mm_anon</code> para manter um apelido estável no
                fórum e o cookie <code>mm_consent</code> para registrar sua escolha de cookies
                (versão, categorias e data, além de um registro no servidor para auditoria).
                Categorias opcionais — preferências e medição — só são liberadas após o seu
                consentimento e nunca são ativadas antes disso.
              </p>
            </Section>

            <Section id="comunidade" title="5. Comunidade, fórum e mensagens">
              <p>
                <strong className="text-fog">Comunidades:</strong> os dados enviados na criação
                (incluindo o link de convite do WhatsApp) ficam visíveis publicamente. O
                MotorMeetings não valida a existência do grupo no WhatsApp nem participa dele; o
                link é apenas divulgado. Não exibimos contagem de membros nem níveis de atividade.
              </p>
              <p>
                <strong className="text-fog">Fórum global:</strong> mensagens são públicas, exibidas
                como texto (sem HTML) e associadas ao seu nome público (usuários autenticados) ou ao
                apelido automático (visitantes). O endereço IP é usado apenas de forma transitória e
                com hash para limites de abuso, nunca exibido publicamente. Mensagens podem ser
                denunciadas e moderadas, e o histórico é removido após o período de retenção desta
                política.
              </p>
              <p>
                <strong className="text-fog">Mensagens privadas:</strong> acessíveis apenas aos
                participantes da conversa. Não há criptografia ponta a ponta; o conteúdo é
                armazenado no servidor para entregar as mensagens e pode ser acessado pela moderação
                apenas quando necessário para segurança e cumprimento da lei.
              </p>
              <p>
                <strong className="text-fog">Push:</strong> a inscrição é opcional e só ocorre após
                você autorizar a permissão no navegador. O serviço de push recebe dados técnicos do
                navegador e um aviso genérico, sem o conteúdo de mensagens privadas. Ao desativar, a
                inscrição é removida.
              </p>
            </Section>

            <Section id="compartilhamento" title="6. Compartilhamento">
              <p>
                Dados podem ser processados por provedores de hospedagem, banco de dados e
                armazenamento de arquivos estritamente para operar a plataforma, sob obrigações de
                confidencialidade e segurança. Também podemos divulgar informações se houver
                determinação legal, ordem judicial ou necessidade de proteger direitos e a segurança
                de pessoas.
              </p>
              <p>
                O conteúdo de um evento publicado (incluindo nome do organizador, cidade, ponto de
                encontro, descrição, regras, Instagram informado e fotos) é público por natureza e
                pode ser acessado por qualquer pessoa com o link. Não publique informações que você
                não deseja tornar públicas.
              </p>
              <p>
                Links para o Google Maps e para o Instagram levam a serviços de terceiros, que
                aplicam suas próprias políticas de privacidade. Os convites de grupo abrem o
                WhatsApp, serviço externo que também possui política própria — o MotorMeetings não
                controla o grupo nem os dados compartilhados fora da plataforma.
              </p>
            </Section>

            <Section id="retencao" title="7. Retenção e exclusão">
              <p>
                Mantemos os dados da conta enquanto ela estiver ativa. Eventos encerrados continuam
                preservados no histórico do organizador, mas deixam de aparecer no catálogo, na
                busca e nos perfis públicos no dia seguinte à data final.
              </p>
              <p>
                Ao excluir um evento, ele é removido das listas e páginas públicas. O registro pode
                ser mantido internamente, com status de exclusão, para segurança e integridade
                histórica. Imagens enviadas podem permanecer no armazenamento sem vínculo público
                com a página. Você pode solicitar a exclusão definitiva dos seus dados pelo contato
                oficial.
              </p>
              <p>
                Mensagens do fórum global são removidas automaticamente após 90 dias. Conversas
                privadas permanecem disponíveis aos participantes enquanto a conversa existir.
                Inscrições de push inválidas são descartadas e registros de moderação e
                consentimento podem ser mantidos para auditoria e segurança.
              </p>
            </Section>

            <Section id="seguranca" title="8. Segurança">
              <p>
                Adotamos medidas técnicas como hash de senha com sal, sessões opacas com token
                armazenado apenas como hash, cookie <code>HttpOnly</code>, verificação de
                propriedade no servidor para edição e exclusão, validação de dados no cliente e no
                servidor, limite de tamanho e verificação de formato das imagens e limitação de
                requisições abusivas.
              </p>
              <p>
                Nenhum sistema é totalmente imune a incidentes. Se identificarmos um incidente
                relevante que possa afetar seus dados, adotaremos as medidas cabíveis e
                comunicaremos os titulares e a autoridade competente conforme a legislação.
              </p>
              <p>
                Em comunidades, mensagens privadas e moderação, a autorização é verificada no
                servidor em cada operação: apenas o criador gerencia a comunidade, apenas
                participantes acessam conversas e rotas administrativas exigem papel de
                administrador. Limites de envio combinam identidade, endereço com hash e janelas de
                tempo, sem depender apenas de cookies.
              </p>
            </Section>

            <Section id="direitos" title="9. Seus direitos">
              <p>
                Nos termos do art. 18 da LGPD, você pode solicitar confirmação de tratamento, acesso,
                correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade
                quando aplicável, informação sobre compartilhamentos e revogação de consentimento.
              </p>
              <p>
                Para exercer seus direitos, envie uma mensagem pelo Instagram oficial informando o
                e-mail cadastrado. Podemos solicitar confirmação de identidade para evitar acesso
                indevido. Responderemos dentro dos prazos legais.
              </p>
            </Section>

            <Section id="contato" title="10. Contato e alterações">
              <p>
                Dúvidas sobre esta política podem ser enviadas pelo Instagram oficial do
                MotorMeetings. Se houver mudanças relevantes, atualizaremos esta página e a data de
                revisão no topo.
              </p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-ash transition hover:border-brand-light/40 hover:text-fog"
              >
                <Instagram className="size-4" aria-hidden="true" />
                Falar no Instagram
                <span className="sr-only">(abre em nova aba)</span>
              </a>
              <p className="text-xs text-ash/70">
                Veja também os <Link href="/termos" className="underline underline-offset-2">Termos de uso</Link>.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
