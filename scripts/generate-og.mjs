import sharp from 'sharp';
import { writeFileSync } from 'fs';

const W=1200, H=630, G=28;
const BG='#0f2a43', INK='#e8eef4', DIM='#7fa0bc', ACCENT='#ff6b35';
const LINE='rgba(232,238,244,0.16)', LINE_S='rgba(232,238,244,0.32)';
const MONO="Menlo, 'DejaVu Sans Mono', monospace";
const TB = 118;              // altezza cartiglio
const tbY = H - TB;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="g" width="${G}" height="${G}" patternUnits="userSpaceOnUse">
      <path d="M ${G} 0 L 0 0 0 ${G}" fill="none" stroke="${LINE}" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>

  <!-- cornice tavola -->
  <rect x="28" y="28" width="${W-56}" height="${H-56}" fill="none" stroke="${LINE_S}" stroke-width="2"/>

  <!-- contenuto -->
  <text x="72" y="150" font-family="${MONO}" font-size="19" letter-spacing="4.5" fill="${DIM}">SOFTWARE ENGINEER / EX PERITO MECCANICO</text>

  <text x="70" y="268" font-family="${MONO}" font-size="82" font-weight="600" fill="${INK}">Filippo De Luca</text>

  <rect x="72" y="300" width="86" height="5" fill="${ACCENT}"/>

  <text x="72" y="372" font-family="${MONO}" font-size="30" fill="${INK}">Event-driven &amp; distributed systems</text>
  <text x="72" y="416" font-family="${MONO}" font-size="26" fill="${DIM}">Scala · Cats Effect · Kafka · AWS</text>

  <!-- cartiglio -->
  <line x1="28" y1="${tbY}" x2="${W-28}" y2="${tbY}" stroke="${LINE_S}" stroke-width="2"/>
  <line x1="368" y1="${tbY}" x2="368" y2="${H-28}" stroke="${LINE_S}" stroke-width="2"/>
  <line x1="640" y1="${tbY}" x2="640" y2="${H-28}" stroke="${LINE_S}" stroke-width="2"/>

  <text x="72" y="${tbY+42}" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${DIM}">DRAWN BY</text>
  <text x="72" y="${tbY+82}" font-family="${MONO}" font-size="25" fill="${INK}">Filippo De Luca</text>

  <text x="404" y="${tbY+42}" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${DIM}">REV.</text>
  <text x="404" y="${tbY+82}" font-family="${MONO}" font-size="25" fill="${INK}">2026</text>

  <text x="676" y="${tbY+42}" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${DIM}">SHEET</text>
  <text x="676" y="${tbY+82}" font-family="${MONO}" font-size="25" fill="${ACCENT}">filippodeluca.com</text>
</svg>`;

writeFileSync('/tmp/og.svg', svg);
await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile('public/og-default.png');
const m = await sharp('public/og-default.png').metadata();
console.log(`generato public/og-default.png — ${m.width}x${m.height}`);
