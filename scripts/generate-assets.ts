import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const imagesDir = path.join(root, "public", "images");
const eventsDir = path.join(imagesDir, "events");
const appDir = path.join(root, "src", "app");
const vibe = path.join(root, "vibe_images");

const LOGO_SRC = path.join(root, "Gemini_Generated_Image_mc6btjmc6btjmc6b.jpg");

const HERO_SRC = path.join(vibe, "motor-og_1793275481500_d4b2e2a0.png");
const COVERS: Array<{ src: string; out: string }> = [
  { src: path.join(vibe, "cover-posto_1793275501154_a950e9c8.png"), out: "posto-alpha" },
  { src: path.join(vibe, "cover-role_1793275522844_592d4a1e.png"), out: "role-noturno" },
  { src: path.join(vibe, "cover-custom_1793275541387_71ce1e64.png"), out: "custom" },
  { src: path.join(vibe, "cover-expo_1793275561091_349cde1f.png"), out: "expo" },
  { src: path.join(vibe, "cover-passeio_1793275583279_1fe3e889.png"), out: "passeio" },
];

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Adapta a logo oficial para fundo escuro:
 * - remove o fundo branco (alpha)
 * - clareia os traços pretos para um prata/lavanda, mantendo o roxo original
 * A arte não é redesenhada, apenas adaptada em cor para contraste no tema dark.
 */
async function buildDarkLogo() {
  const { data, info } = await sharp(LOGO_SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  const channels = info.channels;
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < data.length; i += channels) {
    let r = data[i] ?? 0;
    let g = data[i + 1] ?? 0;
    let b = data[i + 2] ?? 0;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;

    let alpha = 255;
    if (min >= 238) alpha = 0;
    else if (min > 212) alpha = Math.round(((238 - min) / 26) * 255);

    // Traços pretos/neutros escuros -> prata claro para leitura no fundo escuro
    if (sat < 26 && max < 92) {
      const t = Math.min(1, (92 - max) / 92);
      r = Math.round(r * (1 - t) + 233 * t);
      g = Math.round(g * (1 - t) + 229 * t);
      b = Math.round(b * (1 - t) + 246 * t);
    } else if (sat < 26 && max < 170) {
      const t = (170 - max) / 78;
      r = Math.round(r * (1 - t * 0.55) + 210 * t * 0.55);
      g = Math.round(g * (1 - t * 0.55) + 206 * t * 0.55);
      b = Math.round(b * (1 - t * 0.55) + 232 * t * 0.55);
    }

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = alpha;

    if (alpha > 24) {
      const x = (i / channels) % info.width;
      const y = Math.floor(i / channels / info.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const pad = 12;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(info.width - left, maxX - minX + pad * 2);
  const height = Math.min(info.height - top, maxY - minY + pad * 2);

  const base = sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).extract({ left, top, width, height });

  const meta = await base.clone().png().toBuffer({ resolveWithObject: true });

  const mark = await sharp(meta.data).resize(760, 760, { fit: "contain", background: TRANSPARENT }).png().toBuffer();

  await sharp(mark).toFile(path.join(imagesDir, "logo-mark.png"));
  await sharp(mark).resize(256, 256).png().toFile(path.join(imagesDir, "logo-mark-256.png"));

  // Ícone do app: emblema sobre fundo escuro com brilho roxo
  const iconBg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="38%" r="72%">
          <stop offset="0%" stop-color="#3B0764"/>
          <stop offset="62%" stop-color="#100D15"/>
          <stop offset="100%" stop-color="#08070B"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#g)"/>
      <circle cx="256" cy="256" r="186" fill="none" stroke="#8000FF" stroke-opacity="0.35" stroke-width="2"/>
    </svg>`);

  const markIcon = await sharp(mark).resize(340, 340, { fit: "contain", background: TRANSPARENT }).png().toBuffer();

  const icon = await sharp(iconBg)
    .composite([{ input: markIcon, gravity: "center" }])
    .png()
    .toBuffer();

  await sharp(icon).toFile(path.join(appDir, "icon.png"));
  await sharp(icon).resize(180, 180).toFile(path.join(appDir, "apple-icon.png"));
  await sharp(icon).resize(192, 192).toFile(path.join(root, "public", "icon-192.png"));
  await sharp(icon).resize(512, 512).toFile(path.join(root, "public", "icon-512.png"));

  return { mark, darkLogo: mark };
}

async function buildHero() {
  await sharp(HERO_SRC)
    .resize(1920, 1080, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(imagesDir, "hero-night.webp"));

  await sharp(HERO_SRC)
    .resize(1200, 675, { fit: "cover" })
    .jpeg({ quality: 84 })
    .toFile(path.join(imagesDir, "hero-night.jpg"));
}

async function buildCovers() {
  for (const cover of COVERS) {
    await sharp(cover.src)
      .resize(1600, 1000, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(path.join(eventsDir, `${cover.out}.webp`));
  }
}

async function buildDefaultCover(mark: Buffer) {
  const svg = Buffer.from(`
    <svg width="1600" height="1000" viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="30%" r="90%">
          <stop offset="0%" stop-color="#2A0A4A"/>
          <stop offset="55%" stop-color="#100D15"/>
          <stop offset="100%" stop-color="#08070B"/>
        </radialGradient>
        <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M64 0H0V64" fill="none" stroke="#A855F7" stroke-opacity="0.07" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)"/>
      <rect width="1600" height="1000" fill="url(#grid)"/>
      <circle cx="800" cy="470" r="290" fill="none" stroke="#8000FF" stroke-opacity="0.28" stroke-width="2"/>
      <circle cx="800" cy="470" r="360" fill="none" stroke="#A855F7" stroke-opacity="0.12" stroke-width="1"/>
    </svg>`);

  const markLogo = await sharp(mark).resize(470, 470, { fit: "contain", background: TRANSPARENT }).png().toBuffer();

  await sharp(svg)
    .composite([{ input: markLogo, gravity: "center", top: 220, left: 565 }])
    .webp({ quality: 82 })
    .toFile(path.join(eventsDir, "cover-default.webp"));
}

async function buildOg(mark: Buffer) {
  const overlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#08070B" stop-opacity="0.97"/>
          <stop offset="52%" stop-color="#08070B" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="#08070B" stop-opacity="0.28"/>
        </linearGradient>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8000FF"/>
          <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#fade)"/>
      <rect x="0" y="590" width="1200" height="2" fill="url(#line)"/>
      <text x="96" y="512" fill="#F5F3F7" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800" letter-spacing="2">MOTORMEETINGS</text>
      <text x="98" y="560" fill="#A7A1B0" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="6">ENCONTROS • ROLÊS • GOIÂNIA E REGIÃO</text>
    </svg>`);

  const markLogo = await sharp(mark).resize(300, 300, { fit: "contain", background: TRANSPARENT }).png().toBuffer();

  await sharp(HERO_SRC)
    .resize(1200, 630, { fit: "cover" })
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: markLogo, top: 96, left: 94 },
    ])
    .jpeg({ quality: 88 })
    .toFile(path.join(imagesDir, "og-default.jpg"));
}

async function main() {
  await mkdir(imagesDir, { recursive: true });
  await mkdir(eventsDir, { recursive: true });
  await mkdir(appDir, { recursive: true });
  await mkdir(path.join(root, "public", "uploads"), { recursive: true });
  await copyFile(LOGO_SRC, path.join(imagesDir, "logo-original.jpg"));

  const { mark } = await buildDarkLogo();
  await buildHero();
  await buildCovers();
  await buildDefaultCover(mark);
  await buildOg(mark);

  console.log("Assets gerados em public/images e src/app (icon).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
