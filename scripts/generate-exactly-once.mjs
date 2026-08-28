import sharp from 'sharp';
const W=1200,H=630;
const BG='#0f2a43',INK='#e8eef4',DIM='#7fa0bc',ACC='#ff6b35',OK='#7fd1a0';
const LINE='rgba(232,238,244,0.16)',LS='rgba(232,238,244,0.32)';
const M="Menlo, monospace";
const tbY=H-96;

const row=(y,f,d,dec,col)=>`
 <text x="640" y="${y}" font-family="${M}" font-size="16" fill="${INK}">${f}</text>
 <text x="640" y="${y+22}" font-family="${M}" font-size="14" fill="${DIM}">${d}</text>
 <text x="1010" y="${y}" font-family="${M}" font-size="17" fill="${col}">${dec}</text>`;

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
 <defs><pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="${LINE}" stroke-width="1"/></pattern></defs>
 <rect width="${W}" height="${H}" fill="${BG}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
 <rect x="28" y="28" width="${W-56}" height="${H-56}" fill="none" stroke="${LS}" stroke-width="2"/>
 <text x="72" y="88" font-family="${M}" font-size="18" letter-spacing="4" fill="${DIM}">DEDUPLICATION / AT-LEAST-ONCE</text>

 <!-- record -->
 <text x="72" y="140" font-family="${M}" font-size="19" fill="${INK}">the record</text>
 <rect x="72" y="156" width="480" height="196" fill="none" stroke="${LS}" stroke-width="2"/>
 <text x="96" y="188" font-family="${M}" font-size="17" fill="${ACC}">id</text>
 <text x="270" y="188" font-family="${M}" font-size="15" fill="${DIM}">the signal</text>
 <text x="96" y="222" font-family="${M}" font-size="17" fill="${ACC}">processorId</text>
 <text x="270" y="222" font-family="${M}" font-size="15" fill="${DIM}">who is processing</text>
 <text x="96" y="256" font-family="${M}" font-size="17" fill="${INK}">startedAt</text>
 <text x="270" y="256" font-family="${M}" font-size="15" fill="${DIM}">attempt began</text>
 <text x="96" y="290" font-family="${M}" font-size="17" fill="${INK}">completedAt</text>
 <text x="270" y="290" font-family="${M}" font-size="15" fill="${DIM}">absent while in flight</text>
 <text x="96" y="324" font-family="${M}" font-size="17" fill="${INK}">expiresOn</text>
 <text x="270" y="324" font-family="${M}" font-size="15" fill="${DIM}">memory ends here</text>

 <!-- primitiva -->
 <text x="72" y="400" font-family="${M}" font-size="19" fill="${INK}">all it needs from the database</text>
 <rect x="72" y="416" width="480" height="76" fill="none" stroke="${ACC}" stroke-width="2"/>
 <text x="96" y="452" font-family="${M}" font-size="17" fill="${ACC}">a conditional write that returns</text>
 <text x="96" y="476" font-family="${M}" font-size="17" fill="${ACC}">what was there before</text>
 <text x="72" y="524" font-family="${M}" font-size="14" fill="${DIM}">no lock · no consensus · DynamoDB, Cassandra, Postgres all have it</text>

 <!-- decisioni -->
 <text x="640" y="140" font-family="${M}" font-size="19" fill="${INK}">what you find, and what you do</text>
 <line x1="640" y1="152" x2="1128" y2="152" stroke="${LS}" stroke-width="1.5"/>
 ${row(188,'nothing','never seen','process',OK)}
 <line x1="640" y1="220" x2="1128" y2="220" stroke="${LINE}" stroke-width="1"/>
 ${row(248,'completedAt set','already done','skip',DIM)}
 <line x1="640" y1="280" x2="1128" y2="280" stroke="${LINE}" stroke-width="1"/>
 ${row(308,'startedAt, old','attempt died','process',OK)}
 <line x1="640" y1="340" x2="1128" y2="340" stroke="${LINE}" stroke-width="1"/>
 ${row(368,'startedAt, recent','another node is on it','wait',ACC)}
 <line x1="640" y1="400" x2="1128" y2="400" stroke="${LS}" stroke-width="1.5"/>
 <text x="640" y="448" font-family="${M}" font-size="15" fill="${DIM}">&quot;old&quot; vs &quot;recent&quot; is maxProcessingTime —</text>
 <text x="640" y="470" font-family="${M}" font-size="15" fill="${DIM}">a domain decision wearing a config value&apos;s clothes</text>

 <line x1="28" y1="${tbY}" x2="${W-28}" y2="${tbY}" stroke="${LS}" stroke-width="2"/>
 <line x1="700" y1="${tbY}" x2="700" y2="${H-28}" stroke="${LS}" stroke-width="2"/>
 <text x="72" y="${tbY+34}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">RESULT</text>
 <text x="72" y="${tbY+66}" font-family="${M}" font-size="19" fill="${INK}">effectively-once, within a window</text>
 <text x="730" y="${tbY+34}" font-family="${M}" font-size="14" letter-spacing="3" fill="${DIM}">SHEET</text>
 <text x="730" y="${tbY+66}" font-family="${M}" font-size="19" fill="${ACC}">filippodeluca.com</text>
</svg>`;
await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile('public/og-exactly-once.png');
console.log('ok');
