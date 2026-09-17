/**
 * Asset generation.
 *
 * `expo prebuild` and every EAS build refuse to produce a binary without an
 * icon, and an icon committed as a binary blob is an icon nobody can change.
 * So the marks are generated: a small rasteriser with 3x3 supersampling and a
 * hand-rolled PNG encoder, both pure Node with no dependencies.
 *
 * The mark is CLOSER's own geometry - a measurement dial, three rings, a red
 * bullseye and a needle - the same language as the tier badges, so the icon and
 * the in-app art are recognisably one thing.
 *
 *   node tools/generate-assets.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "assets");

const NAVY = [11, 27, 43];
const NAVY_DEEP = [6, 18, 30];
const SNOW = [244, 247, 250];
const SNOW_DIM = [198, 212, 224];
const MIST = [110, 140, 166];
const RED = [229, 72, 77];

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** RGBA pixel buffer to a PNG file buffer. */
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Painter's-algorithm alpha compositing of `src` over `dst`, both premultiplied by alpha. */
function over(dst, src) {
  const a = src[3];
  if (a <= 0) return dst;
  if (a >= 1 && dst[3] <= 0) return src;
  const outA = a + dst[3] * (1 - a);
  if (outA <= 0) return [0, 0, 0, 0];
  return [
    (src[0] * a + dst[0] * dst[3] * (1 - a)) / outA,
    (src[1] * a + dst[1] * dst[3] * (1 - a)) / outA,
    (src[2] * a + dst[2] * dst[3] * (1 - a)) / outA,
    outA,
  ];
}

function ring(distance, radius, halfWidth) {
  return Math.abs(distance - radius) <= halfWidth ? 1 : 0;
}

/**
 * The mark, as a function of normalised coordinates in -0.5 .. 0.5.
 *
 * `mono` strips the palette back to a single colour for the Android monochrome
 * icon and the notification icon, both of which are tinted by the OS.
 */
function mark(x, y, { background, mono }) {
  const distance = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  let colour = background ? [background[0] / 255, background[1] / 255, background[2] / 255, 1] : [0, 0, 0, 0];

  const paint = (rgb, alpha) =>
    (colour = over(colour, mono
      ? [1, 1, 1, alpha]
      : [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alpha]));

  // Dial ticks: 24 around the outside, every third one long.
  const tickCount = 24;
  const tickAngle = ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * tickCount;
  const tickPhase = Math.abs(tickAngle - Math.round(tickAngle));
  const isMajor = Math.round(tickAngle) % 3 === 0;
  const tickInner = isMajor ? 0.425 : 0.437;
  if (distance > tickInner && distance < 0.472 && tickPhase < (isMajor ? 0.055 : 0.03)) {
    paint(isMajor ? SNOW_DIM : MIST, isMajor ? 0.95 : 0.7);
  }

  // Three rings, brightening inwards.
  if (ring(distance, 0.372, 0.014)) paint(MIST, 0.85);
  if (ring(distance, 0.286, 0.016)) paint(SNOW_DIM, 0.9);
  if (ring(distance, 0.196, 0.018)) paint(SNOW, 0.95);

  // The needle: a chord across the dial, stopping short of the bullseye so the
  // centre stays clean.
  const needleAngle = -Math.PI / 4;
  const along = x * Math.cos(needleAngle) + y * Math.sin(needleAngle);
  const across = -x * Math.sin(needleAngle) + y * Math.cos(needleAngle);
  if (Math.abs(across) < 0.0155 && along > 0.1 && along < 0.463) {
    paint(SNOW, 0.97);
  }
  // Needle cap.
  if (Math.hypot(x - 0.463 * Math.cos(needleAngle), y - 0.463 * Math.sin(needleAngle)) < 0.036) {
    paint(SNOW, 1);
  }

  // The bullseye.
  if (distance < 0.105) paint(RED, 1);
  if (distance < 0.042) paint(mono ? SNOW : NAVY_DEEP, mono ? 0.0 : 0.85);

  return colour;
}

function render({ size, background, mono, scale = 1, samples = 3 }) {
  const pixels = Buffer.alloc(size * size * 4);
  const step = 1 / (samples + 1);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 1; sy <= samples; sy += 1) {
        for (let sx = 1; sx <= samples; sx += 1) {
          const x = ((px + sx * step) / size - 0.5) / scale;
          const y = ((py + sy * step) / size - 0.5) / scale;
          const [cr, cg, cb, ca] = mark(x, y, { background, mono });
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const count = samples * samples;
      const alpha = a / count;
      const offset = (py * size + px) * 4;
      // Un-premultiply so the stored PNG is straight-alpha RGBA.
      pixels[offset] = Math.round((alpha > 0 ? r / a : 0) * 255);
      pixels[offset + 1] = Math.round((alpha > 0 ? g / a : 0) * 255);
      pixels[offset + 2] = Math.round((alpha > 0 ? b / a : 0) * 255);
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, size, pixels);
}

const targets = [
  // Store icon. Opaque, full bleed: iOS masks it and rejects transparency.
  { file: "icon.png", size: 1024, background: NAVY, mono: false, scale: 1 },
  // Android adaptive foreground. Transparent, and inset to survive the mask.
  { file: "adaptive-icon.png", size: 1024, background: null, mono: false, scale: 0.68 },
  { file: "adaptive-icon-monochrome.png", size: 1024, background: null, mono: true, scale: 0.68 },
  // Splash. Transparent so it sits on the configured background colour.
  { file: "splash-icon.png", size: 512, background: null, mono: false, scale: 0.92 },
  // Android notification icon: silhouette only, tinted by the system.
  { file: "notification-icon.png", size: 96, background: null, mono: true, scale: 0.86 },
  { file: "favicon.png", size: 64, background: NAVY, mono: false, scale: 1 },
];

mkdirSync(outDir, { recursive: true });

for (const target of targets) {
  const png = render(target);
  writeFileSync(join(outDir, target.file), png);
  console.log(`${target.file.padEnd(32)} ${target.size}x${target.size}  ${(png.length / 1024).toFixed(1)} KB`);
}
