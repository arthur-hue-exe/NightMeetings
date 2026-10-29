import type { Metadata } from "next";
import Link from "next/link";
import { Instagram, Scale } from "lucide-react";
import { INSTAGRAM_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Condições de uso do MotorMeetings: cadastro, publicação de eventos, responsabilidades do organizador, condutas proibidas e regras da plataforma.",
  alternates: { canonical: "/termos" },
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

export default function TermsPage() {
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
          <span className="text-ash">Termos</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="eyebrow">Institucional</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl">
            Termos de <span className="text-gradient">uso</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ash">
            Ao criar uma conta ou usar o MotorMeetings, você concorda com estas condições. Leia com
            atenção. Última atualização: {UPDATED_AT}.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.68rem] font-semibold text-ash">
            <Scale className="size-3.5 text-brand-light" aria-hidden="true" />
            Plataforma gratuita, sem pagamentos
          </span>
        </header>

        <div className="mt-9 grid gap-8 lg:grid-cols-[0.35fr_0.65fr]">
          <aside className="h-fit rounded-2xl border border-white/8 bg-white/[0.025] p-5 lg:sticky lg:top-28">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ash">Nesta página</p>
            <ol className="mt-3 space-y-2 text-sm">
              {[
                ["aceitacao", "1. Aceitação"],
                ["conta", "2. Conta e segurança"],
                ["conteudo", "3. Conteúdo publicado"],
                ["eventos", "4. Responsabilidade"],
                ["comunidade", "5. Comunidade e mensagens"],
                ["condutas", "6. Condutas proibidas"],
                ["propriedade", "7. Propriedade intelectual"],
                ["disponibilidade", "8. Disponibilidade"],
                ["encerramento", "9. Cancelamento e exclusão"],
                ["limitacao", "10. Limitação de responsabilidade"],
                ["contato", "11. Contato e foro"],
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
            <Section id="aceitacao" title="1. Aceitação dos termos">
              <p>
                Estes termos regulam o uso do MotorMeetings, plataforma de divulgação de encontros
                de moto em Goiânia, Aparecida de Goiânia e região metropolitana. Se você não
                concorda com alguma condição, não utilize a plataforma.
              </p>
              <p>
                Você deve ter capacidade civil para aceitar estes termos. Menores de 18 anos devem
                usar a plataforma com autorização e acompanhamento de responsável legal.
              </p>
            </Section>

            <Section id="conta" title="2. Conta e segurança">
              <p>
                Para publicar eventos é necessário criar uma conta com nome público, e-mail válido e
                senha. Você é responsável por manter a senha em segredo e por todas as ações
                realizadas com sua conta.
              </p>
              <p>
                O nome informado é público e aparece como organizador nos eventos e no perfil. O
                e-mail e a senha não são exibidos publicamente. Não compartilhe sua sessão nem
                permita que terceiros usem sua conta para publicar conteúdo.
              </p>
            </Section>

            <Section id="conteudo" title="3. Conteúdo publicado">
              <p>
                O organizador é o único responsável pelas informações do evento: título, data,
                horário, cidade, ponto de encontro, rota, regras, descrição, contato e imagens. A
                plataforma valida formato e campos obrigatórios, mas não verifica a veracidade de
                cada informação.
              </p>
              <p>
                Ao publicar fotos, você declara ter os direitos necessários ou autorização do autor
                e das pessoas retratadas. É proibido enviar conteúdo ilegal, ofensivo, discriminatório,
                violento, de exploração de menores ou que viole direitos de terceiros.
              </p>
              <p>
                Você concede ao MotorMeetings uma licença não exclusiva e gratuita para armazenar,
                redimensionar e exibir o conteúdo publicado enquanto o evento estiver no ar, com a
                finalidade de operar a plataforma.
              </p>
            </Section>

            <Section id="eventos" title="4. Responsabilidade sobre os eventos">
              <p>
                O MotorMeetings é uma vitrine de divulgação. Não organiza, não promove, não
                intermedeia pagamentos, inscrições ou reservas e não garante a realização, a
                segurança ou a presença de participantes em qualquer encontro.
              </p>
              <p>
                A participação em eventos é decisão e risco exclusivos do participante, que deve
                cumprir a legislação de trânsito, usar equipamento de proteção adequado e confirmar
                data, horário e local diretamente com o organizador.
              </p>
              <p>
                A plataforma não calcula distâncias, coordenadas ou tempos de viagem. Os links de
                mapa usam apenas os endereços informados pelo organizador.
              </p>
            </Section>

            <Section id="comunidade" title="5. Comunidade, fórum e mensagens privadas">
              <p>
                <strong className="text-fog">Comunidades:</strong> somente usuários autenticados
                podem criar grupos, com emblema e link de convite oficial do WhatsApp
                (<code>chat.whatsapp.com</code>). O criador é responsável pelo conteúdo e pela
                administração do grupo. O MotorMeetings não cria, valida a existência, administra
                nem garante a segurança de grupos no WhatsApp; entrar em um grupo é decisão e risco
                do participante. Não exibimos contagem de membros nem níveis de atividade.
              </p>
              <p>
                <strong className="text-fog">Fórum global:</strong> é público e pode ser usado por
                visitantes com apelido automático ou por usuários autenticados com nome público. Não
                são permitidos anexos nem HTML. Mensagens podem ser denunciadas, ocultadas e
                moderadas, e sessões podem ser temporariamente suspensas em caso de abuso.
              </p>
              <p>
                <strong className="text-fog">Mensagens privadas:</strong> conversas diretas e em
                grupo são acessíveis apenas aos participantes. Não há criptografia ponta a ponta; o
                conteúdo é armazenado no servidor para entrega das mensagens e pode ser revisado pela
                moderação quando necessário para segurança ou cumprimento da lei. As regras de
                conduta valem também nas conversas privadas.
              </p>
              <p>
                <strong className="text-fog">Notificações e push:</strong> são opcionais e dependem
                da sua permissão no navegador. Notificações não incluem o conteúdo de mensagens
                privadas.
              </p>
            </Section>

            <Section id="condutas" title="6. Condutas proibidas">
              <ul className="list-disc space-y-2 pl-5">
                <li>Publicar eventos falsos, golpes, rifas, vendas ou cobranças não autorizadas.</li>
                <li>Usar linguagem ofensiva, discriminatória, ameaçadora ou assédio a qualquer pessoa.</li>
                <li>Tentar acessar contas, eventos ou dados de outras pessoas sem autorização.</li>
                <li>Sobrecarregar, automatizar abusivamente ou tentar burlar limites de upload e publicação.</li>
                <li>Enviar arquivos maliciosos, imagens de terceiros sem autorização ou conteúdo ilegal.</li>
                <li>Expor dados pessoais de outras pessoas sem consentimento.</li>
              </ul>
            </Section>

            <Section id="propriedade" title="7. Propriedade intelectual">
              <p>
                A marca MotorMeetings, o logotipo, o layout, os textos institucionais e o código da
                plataforma pertencem aos seus responsáveis ou são usados com autorização. Não é
                permitido copiar, modificar ou explorar comercialmente esses elementos sem
                autorização prévia.
              </p>
              <p>
                Os textos e fotos de cada evento permanecem de responsabilidade e titularidade de
                quem os publicou, respeitadas a licença de exibição descrita acima.
              </p>
            </Section>

            <Section id="disponibilidade" title="8. Disponibilidade e mudanças">
              <p>
                Buscamos manter a plataforma disponível, mas ela pode passar por manutenção,
                atualizações ou indisponibilidades temporárias. Funcionalidades podem ser alteradas,
                suspensas ou removidas sem aviso prévio, respeitados os direitos adquiridos.
              </p>
              <p>
                Eventos encerrados saem do catálogo automaticamente no dia seguinte à data final.
                Eventos cancelados deixam as listas públicas, mas o registro permanece no histórico
                do organizador. As páginas de eventos encerrados ou cancelados não são indexadas em
                buscadores.
              </p>
            </Section>

            <Section id="encerramento" title="9. Cancelamento e exclusão">
              <p>
                O organizador pode cancelar ou excluir seus próprios eventos a qualquer momento. A
                exclusão remove o evento das listas e páginas públicas. Registros internos podem ser
                mantidos para segurança e integridade, conforme a Política de Privacidade.
              </p>
              <p>
                Podemos suspender ou encerrar contas que violem estes termos, publiquem conteúdo
                ilegal ou representem risco à comunidade, sem prejuízo de outras medidas cabíveis.
              </p>
            </Section>

            <Section id="limitacao" title="10. Limitação de responsabilidade">
              <p>
                Na máxima extensão permitida pela lei, o MotorMeetings não responde por danos
                decorrentes de eventos publicados por terceiros, de informações incorretas fornecidas
                por organizadores, de deslocamentos, de acidentes ou de condutas de participantes.
              </p>
              <p>
                A plataforma é fornecida “como está”, sem garantia de adequação a uma finalidade
                específica, sem prejuízo das garantias legais obrigatórias.
              </p>
            </Section>

            <Section id="contato" title="11. Contato, alterações e foro">
              <p>
                Podemos atualizar estes termos para refletir mudanças na plataforma ou na legislação.
                A data de revisão no topo indica a versão vigente. O uso continuado após a
                atualização representa concordância com a nova versão.
              </p>
              <p>
                Dúvidas podem ser enviadas pelo Instagram oficial. Estes termos são regidos pela
                legislação brasileira, incluindo o Código de Defesa do Consumidor e o Marco Civil da
                Internet, quando aplicáveis.
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
                Leia também a <Link href="/privacidade" className="underline underline-offset-2">Política de privacidade</Link>.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
