import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const DEMO_PASSWORD = "motormeetings123";

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const today = todayISO();
const day = (offset: number) => addDays(today, offset);

const covers = {
  posto: "/images/events/posto-alpha.webp",
  role: "/images/events/role-noturno.webp",
  custom: "/images/events/custom.webp",
  expo: "/images/events/expo.webp",
  passeio: "/images/events/passeio.webp",
  padrao: "/images/events/cover-default.webp",
};

type SeedEvent = {
  title: string;
  slug: string;
  description: string;
  category: string;
  city: string;
  eventDate: string;
  startTime: string;
  endDate?: string;
  meetingPoint: string;
  departurePoint?: string;
  departureTime?: string;
  arrivalPoint?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  coverImageUrl: string;
  gallery?: string[];
  rules?: string;
  additionalInfo?: string;
  routeNotes?: string;
  contactInstagram?: string;
  featured?: boolean;
  status?: "ACTIVE" | "CANCELLED";
  owner: "arthur" | "marina";
};

const events: SeedEvent[] = [
  {
    title: "Rolê Noturno da Serra",
    slug: "role-noturno-da-serra",
    description:
      "Encontro aberto para quem gosta de rodar à noite com segurança e boa companhia. Concentração na Praça do Sol, saída em comboio e chegada no mirante para um café antes de voltar. Todos os ritmos são bem-vindos — o importante é chegar junto.",
    category: "ROLE_NOTURNO",
    city: "Goiânia",
    eventDate: day(2),
    startTime: "20:00",
    meetingPoint: "Praça do Sol — Setor Oeste, Goiânia",
    departurePoint: "Praça do Sol — Setor Oeste",
    departureTime: "21:00",
    arrivalPoint: "Mirante do Parque Altamiro de Moura Pacheco",
    arrivalTime: "22:30",
    coverImageUrl: covers.role,
    gallery: [covers.role, covers.passeio],
    rules:
      "Uso obrigatório de capacete e equipamento de proteção. Respeite a sinalização e mantenha o comboio unido. Proibido manobras perigosas.",
    additionalInfo: "Ponto de apoio com café e água no mirante. Leve sua garrafinha.",
    routeNotes:
      "Saída em comboio pela Av. 85, entrada na GO-020 e subida tranquila até o mirante. Sem pressa e sem ultrapassagens dentro do grupo.",
    contactInstagram: "a.alves_silva",
    featured: true,
    owner: "arthur",
  },
  {
    title: "Encontro dos Motoclubes — Posto Alpha",
    slug: "encontro-motoclubes-posto-alpha",
    description:
      "O clássico encontro no Posto Alpha. Motoclubes da região se reúnem para trocar ideia, apresentar as máquinas e combinar os próximos rolês. Estrutura de conveniência no local.",
    category: "ENCONTRO_POSTO",
    city: "Aparecida de Goiânia",
    eventDate: day(5),
    startTime: "19:30",
    meetingPoint: "Posto Alpha — Av. Independência, Aparecida de Goiânia",
    coverImageUrl: covers.posto,
    gallery: [covers.posto],
    rules: "Respeite o espaço do posto e o estacionamento dos clientes.",
    additionalInfo: "Encontro aberto a todos os estilos de moto.",
    contactInstagram: "a.alves_silva",
    owner: "arthur",
  },
  {
    title: "Café com Custom — Oficina Vila Nova",
    slug: "cafe-com-custom-oficina-vila-nova",
    description:
      "Manhã de café, customização e conversa boa. Traga sua custom, mostre o projeto e conheça quem constrói moto na região. Evento tranquilo, em família e com espaço para as crianças.",
    category: "ENCONTRO_CUSTOM",
    city: "Goiânia",
    eventDate: day(3),
    startTime: "09:00",
    meetingPoint: "Oficina Vila Nova — Rua 9, Vila Nova, Goiânia",
    coverImageUrl: covers.custom,
    gallery: [covers.custom, covers.padrao],
    additionalInfo: "Café e pão de queijo no local, contribuição espontânea.",
    contactInstagram: "a.alves_silva",
    featured: true,
    owner: "arthur",
  },
  {
    title: "Passeio ao Lago das Rosas",
    slug: "passeio-ao-lago-das-rosas",
    description:
      "Passeio curto e tranquilo para quem está começando ou quer rodar sem pressa. Concentração na Praça Cívica, saída em grupo e parada no Lago das Rosas para fotos e descanso.",
    category: "PASSEIO_GRUPO",
    city: "Goiânia",
    eventDate: day(9),
    startTime: "08:30",
    meetingPoint: "Praça Cívica — Setor Central, Goiânia",
    departurePoint: "Praça Cívica — Setor Central",
    departureTime: "09:15",
    arrivalPoint: "Lago das Rosas — Setor Oeste",
    arrivalTime: "10:00",
    coverImageUrl: covers.passeio,
    gallery: [covers.passeio, covers.role],
    rules: "Ritmo de passeio, sem ultrapassagens e com respeito aos pedestres.",
    routeNotes: "Percurso urbano curto com parada para fotos na chegada.",
    contactInstagram: "a.alves_silva",
    owner: "arthur",
  },
  {
    title: "Motos pela Vida — Doação de Sangue",
    slug: "motos-pela-vida-doacao-de-sangue",
    description:
      "Mobilização da galera motociclista para doação de sangue. Concentração no estacionamento do hemocentro, cadastro e doação em grupo. Quem puder, leve documentos e vá bem alimentado.",
    category: "EVENTO_BENEFICENTE",
    city: "Goiânia",
    eventDate: day(11),
    startTime: "08:00",
    meetingPoint: "Hemocentro de Goiás — Setor Coimbra, Goiânia",
    coverImageUrl: covers.padrao,
    rules:
      "Requisitos da doação: estar bem de saúde, alimentado, com documento oficial com foto e dentro dos critérios do hemocentro.",
    additionalInfo: "Não é necessário agendamento para participar da mobilização.",
    contactInstagram: "a.alves_silva",
    owner: "arthur",
  },
  {
    title: "Expo Duas Rodas — Edição Goiânia",
    slug: "expo-duas-rodas-edicao-goiania",
    description:
      "Dois dias de exposição de motos especiais, customização, acessórios e food trucks. Um encontro para ver de perto máquinas únicas da região e conhecer oficinas e projetos.",
    category: "EXPOSICAO",
    city: "Goiânia",
    eventDate: day(16),
    startTime: "10:00",
    endDate: day(17),
    meetingPoint: "Centro de Convenções de Goiânia — Setor Marista",
    coverImageUrl: covers.expo,
    gallery: [covers.expo, covers.custom, covers.padrao],
    additionalInfo: "Entrada gratuita. Estacionamento para motos no local.",
    contactInstagram: "a.alves_silva",
    featured: true,
    owner: "arthur",
  },
  {
    title: "Encontro de Esportivas no Autódromo",
    slug: "encontro-de-esportivas-no-autodromo",
    description:
      "Encontro de esportivas com exposição de motos, bate-papo sobre pilotagem e treino livre para quem já tem experiência em pista. Respeito às regras do autódromo em primeiro lugar.",
    category: "ENCONTRO_ESPORTIVAS",
    city: "Senador Canedo",
    eventDate: day(23),
    startTime: "08:00",
    meetingPoint: "Autódromo Internacional de Goiânia — Senador Canedo",
    coverImageUrl: covers.role,
    rules:
      "Uso obrigatório de equipamento completo para entrada na pista. Treino livre somente para pilotos habilitados e com moto em condições.",
    additionalInfo: "Área de arquibancada aberta ao público.",
    contactInstagram: "a.alves_silva",
    owner: "marina",
  },
  {
    title: "Rolê de Domingo no Parque",
    slug: "role-de-domingo-no-parque",
    description:
      "Domingo de manhã com saída da Praça Tamandaré em direção ao Parque Flamboyant. Passeio leve, parada para café e volta pelo mesmo caminho, com apoio de um carro de suporte.",
    category: "PASSEIO_GRUPO",
    city: "Goiânia",
    eventDate: day(10),
    startTime: "07:30",
    meetingPoint: "Praça Tamandaré — Setor Oeste, Goiânia",
    departurePoint: "Praça Tamandaré — Setor Oeste",
    departureTime: "08:00",
    arrivalPoint: "Parque Flamboyant — Jardim Goiás",
    arrivalTime: "08:40",
    coverImageUrl: covers.passeio,
    gallery: [covers.passeio],
    routeNotes: "Trajeto curto, ritmo de passeio e paradas para reagrupar.",
    contactInstagram: "a.alves_silva",
    owner: "marina",
  },
  {
    title: "Encontro de Motos Antigas — Praça do Relógio",
    slug: "encontro-de-motos-antigas-praca-do-relogio",
    description:
      "Exposição informal de motos antigas e clássicas na Praça do Relógio. Venha conhecer histórias, projetos de restauração e conversar com colecionadores da região.",
    category: "EXPOSICAO",
    city: "Goiânia",
    eventDate: day(30),
    startTime: "16:00",
    meetingPoint: "Praça do Relógio — Setor Central, Goiânia",
    coverImageUrl: covers.custom,
    gallery: [covers.custom, covers.expo],
    additionalInfo: "Evento gratuito e aberto ao público.",
    owner: "marina",
  },
  {
    title: "Rolê de Aniversário MotorMeetings",
    slug: "role-de-aniversario-motormeetings",
    description:
      "Um rolê para celebrar a comunidade que cresce a cada encontro. Concentração no Parque Vaca Brava, saída em comboio e confraternização na chegada. Traga quem te acompanha nas estradas.",
    category: "OUTROS",
    city: "Aparecida de Goiânia",
    eventDate: day(45),
    startTime: "18:00",
    meetingPoint: "Parque Vaca Brava — Setor Bueno, Goiânia",
    departurePoint: "Parque Vaca Brava — Setor Bueno",
    departureTime: "19:00",
    arrivalPoint: "Praça da Igreja Matriz — Aparecida de Goiânia",
    arrivalTime: "20:00",
    coverImageUrl: covers.padrao,
    gallery: [covers.padrao, covers.role, covers.passeio],
    routeNotes: "Comboio único com carro de apoio e paradas para reagrupamento.",
    contactInstagram: "a.alves_silva",
    owner: "arthur",
  },
  {
    title: "Último Encontro do Mês",
    slug: "ultimo-encontro-do-mes",
    description:
      "Edição passada do nosso encontro mensal. Registro para quem participou e quer relembrar.",
    category: "ENCONTRO_POSTO",
    city: "Goiânia",
    eventDate: day(-6),
    startTime: "20:00",
    meetingPoint: "Posto Alpha — Av. Independência, Aparecida de Goiânia",
    coverImageUrl: covers.posto,
    owner: "arthur",
  },
  {
    title: "Rolê Cancelado por Chuva Forte",
    slug: "role-cancelado-por-chuva-forte",
    description:
      "Este rolê foi cancelado por causa das chuvas fortes na região. Acompanhe os próximos encontros por aqui.",
    category: "ROLE_NOTURNO",
    city: "Goiânia",
    eventDate: day(7),
    startTime: "20:30",
    meetingPoint: "Praça do Sol — Setor Oeste, Goiânia",
    coverImageUrl: covers.role,
    status: "CANCELLED",
    owner: "arthur",
  },
];

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const arthur = await prisma.user.upsert({
    where: { email: "demo@motormeetings.com.br" },
    update: { name: "Arthur Alves", passwordHash, role: "ADMIN" },
    create: {
      name: "Arthur Alves",
      email: "demo@motormeetings.com.br",
      passwordHash,
      role: "ADMIN",
    },
  });

  const marina = await prisma.user.upsert({
    where: { email: "marina@motormeetings.com.br" },
    update: { name: "Marina Duarte", passwordHash, role: "USER" },
    create: {
      name: "Marina Duarte",
      email: "marina@motormeetings.com.br",
      passwordHash,
      role: "USER",
    },
  });

  await prisma.event.deleteMany({
    where: { userId: { in: [arthur.id, marina.id] } },
  });

  for (const event of events) {
    const owner = event.owner === "marina" ? marina : arthur;
    await prisma.event.create({
      data: {
        title: event.title,
        slug: event.slug,
        description: event.description,
        category: event.category,
        city: event.city,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endDate: event.endDate ?? null,
        meetingPoint: event.meetingPoint,
        departurePoint: event.departurePoint ?? null,
        departureTime: event.departureTime ?? null,
        arrivalPoint: event.arrivalPoint ?? null,
        arrivalDate: event.arrivalDate ?? null,
        arrivalTime: event.arrivalTime ?? null,
        coverImageUrl: event.coverImageUrl,
        rules: event.rules ?? null,
        additionalInfo: event.additionalInfo ?? null,
        routeNotes: event.routeNotes ?? null,
        contactInstagram: event.contactInstagram ?? null,
        featured: event.featured ?? false,
        status: event.status ?? "ACTIVE",
        userId: owner.id,
        images: {
          create: (event.gallery ?? []).map((imageUrl, index) => ({
            imageUrl,
            altText: `${event.title} — foto ${index + 1}`,
          })),
        },
      },
    });
  }

  console.log(`Seed concluído: ${events.length} eventos, 2 organizadores.`);
  console.log(`Login demo: demo@motormeetings.com.br / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
