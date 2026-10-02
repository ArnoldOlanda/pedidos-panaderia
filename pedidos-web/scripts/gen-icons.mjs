// Generates the placeholder PWA icons (180x180, 192x192, 512x512) using only
// Node stdlib (zlib + fs). Same artwork across all sizes: flat amber
// (#f59e0b) background with a white circle outline and a small checkmark
// glyph inside, matching the existing favicon motif. PNG bytes are written
// directly to pedidos-web/public/.
//
// Re-run on every commit:  `node scripts/gen-icons.mjs`

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public');

// PNG helpers --------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

// Pixel art ---------------------------------------------------------------

const BG = [0xf5, 0x9e, 0x0b, 0xff]; // amber-500
const FG = [0xff, 0xff, 0xff, 0xff]; // white outline + check

function rgba(buf, x, y, w, px) {
  const idx = (y * w + x) * 4;
  buf[idx] = px[0];
  buf[idx + 1] = px[1];
  buf[idx + 2] = px[2];
  buf[idx + 3] = px[3];
}

function paint(size) {
  const buf = Buffer.alloc(size * size * 4);
  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rgba(buf, x, y, size, BG);
    }
  }

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size * 0.36;
  const stroke = Math.max(1.5, size * 0.045);

  // White ring (anti-aliased on a band of distance ~ radius +/- stroke/2)
  const inner = radius - stroke / 2;
  const outer = radius + stroke / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= inner && d <= outer) {
        // Soft 1px edge
        const edge = Math.min(d - inner, outer - d);
        const alpha = edge < 0.6 ? Math.max(0, edge / 0.6) : 1;
        const [r, g, b] = FG;
        rgba(buf, x, y, size, [r, g, b, Math.round(255 * alpha)]);
      }
    }
  }

  // Checkmark: two strokes meeting near the centre. Drawn with Bresenham
  // and a thickness proportional to size.
  const t = Math.max(1, Math.round(size * 0.05));
  const p1 = { x: cx - radius * 0.45, y: cy + radius * 0.05 };
  const p2 = { x: cx - radius * 0.12, y: cy + radius * 0.38 };
  const p3 = { x: cx + radius * 0.5, y: cy - radius * 0.32 };
  const drawLine = (a, b) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let i = 0; i <= steps; i++) {
      const t01 = i / steps;
      const px = a.x + (b.x - a.x) * t01;
      const py = a.y + (b.y - a.y) * t01;
      for (let oy = -t; oy <= t; oy++) {
        for (let ox = -t; ox <= t; ox++) {
          if (ox * ox + oy * oy > t * t) continue;
          const x = Math.round(px + ox);
          const y = Math.round(py + oy);
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const [r, g, b] = FG;
          rgba(buf, x, y, size, [r, g, b, 0xff]);
        }
      }
    }
  };
  drawLine(p1, p2);
  drawLine(p2, p3);

  return buf;
}

// PNG writer --------------------------------------------------------------

function encodePng(rgba, width, height) {
  const sig = PNG_SIGNATURE;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Add per-row filter byte (0 = None) before each scanline.
  const rowStride = width * 4;
  const filtered = Buffer.alloc(height * (rowStride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (rowStride + 1)] = 0;
    rgba.copy(filtered, y * (rowStride + 1) + 1, y * rowStride, y * rowStride + rowStride);
  }
  const idatData = deflateSync(filtered, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Main ---------------------------------------------------------------------

const targets = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

for (const { file, size } of targets) {
  const rgba = paint(size);
  const png = encodePng(rgba, size, size);
  const out = resolve(OUT_DIR, file);
  writeFileSync(out, png);
  console.log(`wrote ${file} — ${size}x${size} — ${png.length} bytes`);
}