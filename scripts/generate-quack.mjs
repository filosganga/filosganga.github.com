import sharp from 'sharp';
const W=1200,H=630;
const BG='#0f2a43',INK='#e8eef4',DIM='#7fa0bc',ACC='#ff6b35';
const LINE='rgba(232,238,244,0.16)',LS='rgba(232,238,244,0.32)';
const M="Menlo, monospace";
const TB=100, tbY=H-TB;

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
 <defs>
  <pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse">
   <path d="M 28 0 L 0 0 0 28" fill="none" stroke="${LINE}" stroke-width="1"/></pattern>
  <marker id="ar" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
   <path d="M0,0 L9,4.5 L0,9 z" fill="${ACC}"/></marker>
 </defs>
 <rect width="${W}" height="${H}" fill="${BG}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
 <rect x="28" y="28" width="${W-56}" height="${H-56}" fill="none" stroke="${LS}" stroke-width="2"/>

 <g stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
   <!-- coda -->
   <path d="M302 428 C 250 434, 206 404, 214 366 C 220 338, 254 334, 262 358"/>
   <!-- corpo seduto -->
   <path d="M300 432 C 296 372, 306 322, 330 300"/>
   <path d="M300 432 L 420 432"/>
   <path d="M420 432 C 424 380, 418 330, 402 306"/>
   <!-- zampe -->
   <path d="M318 432 q 14 -16 30 0"/><path d="M372 432 q 14 -16 30 0"/>
   <!-- testa -->
   <circle cx="366" cy="252" r="60"/>
   <!-- orecchie -->
   <path d="M322 214 L 312 168 L 352 194"/>
   <path d="M410 214 L 420 168 L 380 194"/>
   <!-- occhi -->
   <circle cx="345" cy="243" r="5" fill="${INK}"/><circle cx="389" cy="243" r="5" fill="${INK}"/>
   <!-- baffi -->
   <path d="M330 272 L 292 264" opacity=".75"/><path d="M330 280 L 294 282" opacity=".75"/>
   <path d="M402 272 L 440 264" opacity=".75"/><path d="M402 280 L 438 282" opacity=".75"/>
 </g>

 <!-- modulo quack: becco montato sopra -->
 <g stroke="${ACC}" stroke-width="3" fill="none" stroke-linejoin="round">
   <path d="M340 266 C 340 258, 392 258, 392 266 C 392 286, 372 296, 366 296 C 360 296, 340 286, 340 266 Z" fill="${ACC}" fill-opacity="0.18"/>
   <path d="M344 278 L 388 278" stroke-width="2"/>
 </g>
 <!-- bulloni di fissaggio -->
 <circle cx="346" cy="264" r="3.5" fill="${ACC}"/><circle cx="386" cy="264" r="3.5" fill="${ACC}"/>

 <!-- richiami -->
 <line x1="640" y1="200" x2="404" y2="272" stroke="${ACC}" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#ar)"/>
 <circle cx="640" cy="200" r="4" fill="${ACC}"/>
 <text x="660" y="194" font-family="${M}" font-size="20" fill="${ACC}">QUACK MODULE</text>
 <text x="660" y="222" font-family="${M}" font-size="15" fill="${DIM}">fitted externally — type unchanged</text>

 <line x1="330" y1="400" x2="640" y2="330" stroke="${LS}" stroke-width="1.5" stroke-dasharray="5 4"/>
 <circle cx="640" cy="330" r="4" fill="${DIM}"/>
 <text x="660" y="324" font-family="${M}" font-size="20" fill="${INK}">CAT</text>
 <text x="660" y="352" font-family="${M}" font-size="15" fill="${DIM}">not a duck. never was.</text>

 <text x="660" y="440" font-family="${M}" font-size="15" letter-spacing="3" fill="${DIM}">ASSEMBLY</text>
 <text x="660" y="472" font-family="${M}" font-size="24" fill="${INK}">given Quacks[Cat]</text>

 <text x="72" y="108" font-family="${M}" font-size="18" letter-spacing="4" fill="${DIM}">TYPE CLASSES / SCALA 3</text>

 <line x1="28" y1="${tbY}" x2="${W-28}" y2="${tbY}" stroke="${LS}" stroke-width="2"/>
 <line x1="500" y1="${tbY}" x2="500" y2="${H-28}" stroke="${LS}" stroke-width="2"/>
 <line x1="840" y1="${tbY}" x2="840" y2="${H-28}" stroke="${LS}" stroke-width="2"/>
 <text x="72" y="${tbY+36}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">TITLE</text>
 <text x="72" y="${tbY+70}" font-family="${M}" font-size="22" fill="${INK}">How a cat can quack</text>
 <text x="530" y="${tbY+36}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">DRAWN BY</text>
 <text x="530" y="${tbY+70}" font-family="${M}" font-size="22" fill="${INK}">Filippo De Luca</text>
 <text x="870" y="${tbY+36}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">SHEET</text>
 <text x="870" y="${tbY+70}" font-family="${M}" font-size="22" fill="${ACC}">filippodeluca.com</text>
</svg>`;
await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile('public/og-how-a-cat-can-quack.png');
console.log('ok');
