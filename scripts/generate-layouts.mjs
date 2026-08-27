import sharp from 'sharp';
const W=1200,H=630;
const BG='#0f2a43',INK='#e8eef4',DIM='#7fa0bc',ACC='#ff6b35';
const LINE='rgba(232,238,244,0.16)',LS='rgba(232,238,244,0.32)';
const M="Menlo, monospace";
const TB=100, tbY=H-TB;

// una cella-messaggio
const cell=(x,y,w,t,col)=>`<rect x="${x}" y="${y}" width="${w}" height="34" fill="none" stroke="${col}" stroke-width="2"/>`+
  `<text x="${x+w/2}" y="${y+23}" font-family="${M}" font-size="15" fill="${col}" text-anchor="middle">${t}</text>`;

// una barra-topic con celle
const topic=(x,y,items,col)=>{let out='',cx=x;
  for(const [t,w] of items){out+=cell(cx,y,w,t,col);cx+=w+8;}
  out+=`<line x1="${x}" y1="${y+50}" x2="${cx-8}" y2="${y+50}" stroke="${col}" stroke-width="1.5" marker-end="url(#a-${col==ACC?'o':'w'})"/>`;
  return out;};

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
 <defs>
  <pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="${LINE}" stroke-width="1"/></pattern>
  <marker id="a-w" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${DIM}"/></marker>
  <marker id="a-o" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${ACC}"/></marker>
 </defs>
 <rect width="${W}" height="${H}" fill="${BG}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
 <rect x="28" y="28" width="${W-56}" height="${H-56}" fill="none" stroke="${LS}" stroke-width="2"/>

 <text x="72" y="88" font-family="${M}" font-size="18" letter-spacing="4" fill="${DIM}">EVENT LAYOUT / KAFKA TOPICS</text>

 <!-- 1 -->
 <text x="72" y="146" font-family="${M}" font-size="19" fill="${INK}">1 · one topic per entity, several event types</text>
 ${topic(72,160,[['Created',96],['Joined',88],['RoleUpd',104],['Left',72],['Renamed',104]],DIM)}
 <text x="72" y="240" font-family="${M}" font-size="16" fill="${INK}">keyed by organizationId → one partition → ordered</text>

 <!-- 2 -->
 <text x="72" y="296" font-family="${M}" font-size="19" fill="${INK}">2 · one topic per entity, self-contained snapshots</text>
 ${topic(72,310,[['Org v1',124],['Org v2',124],['Org v3',124]],DIM)}
 <text x="500" y="342" font-family="${M}" font-size="15" fill="${INK}">ordered · compactable · history gone</text>

 <!-- 3 -->
 <text x="72" y="402" font-family="${M}" font-size="19" fill="${ACC}">3 · one topic per event type</text>
 ${cell(72,414,96,'Created',ACC)}${cell(72,452,88,'Joined',ACC)}${cell(72,490,104,'RoleUpd',ACC)}
 <line x1="200" y1="431" x2="300" y2="431" stroke="${ACC}" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#a-o)"/>
 <line x1="200" y1="469" x2="300" y2="469" stroke="${ACC}" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#a-o)"/>
 <line x1="200" y1="507" x2="300" y2="507" stroke="${ACC}" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#a-o)"/>
 <text x="330" y="462" font-family="${M}" font-size="34" fill="${ACC}">?</text>
 <text x="370" y="442" font-family="${M}" font-size="17" fill="${ACC}">separate partitions</text>
 <text x="370" y="474" font-family="${M}" font-size="17" fill="${ACC}">no order between them</text>
 <text x="370" y="506" font-family="${M}" font-size="15" fill="${DIM}">every consumer needs a reordering buffer</text>

 <line x1="28" y1="${tbY}" x2="${W-28}" y2="${tbY}" stroke="${LS}" stroke-width="2"/>
 <line x1="640" y1="${tbY}" x2="640" y2="${H-28}" stroke="${LS}" stroke-width="2"/>
 <text x="72" y="${tbY+36}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">NOTE</text>
 <text x="72" y="${tbY+70}" font-family="${M}" font-size="20" fill="${INK}">Kafka orders per partition, not per topic</text>
 <text x="670" y="${tbY+36}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">SHEET</text>
 <text x="670" y="${tbY+70}" font-family="${M}" font-size="20" fill="${ACC}">filippodeluca.com</text>
</svg>`;
await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile('public/og-splitting-events-by-type.png');
console.log('ok');
