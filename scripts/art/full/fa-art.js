// Full-art drawings. HERO: 100x100 subject that is allowed to break out of the card. SCENE: 100x108 backdrop that fills the art window.
// Shape classes (fR, fO, fY, fG, fT, fB, fP, fK, fN, fC, fW, fS, fD, fA, fU, fL) take gradients from FA_DEFS, same system as the small clean-gradient art.
window.FA_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8277"/><stop offset="1" stop-color="#d12e45"/></linearGradient>
<linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb862"/><stop offset="1" stop-color="#ec6a2b"/></linearGradient>
<linearGradient id="gY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a0"/><stop offset="1" stop-color="#ffc62e"/></linearGradient>
<linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a4ea72"/><stop offset="1" stop-color="#32a047"/></linearGradient>
<linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78e8da"/><stop offset="1" stop-color="#1c9ca6"/></linearGradient>
<linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86ccff"/><stop offset="1" stop-color="#3470de"/></linearGradient>
<linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfaaff"/><stop offset="1" stop-color="#7348cc"/></linearGradient>
<linearGradient id="gK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa6d0"/><stop offset="1" stop-color="#e5539a"/></linearGradient>
<linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bf8a5f"/><stop offset="1" stop-color="#6a4125"/></linearGradient>
<linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#ecd7b8"/></linearGradient>
<linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe9f4"/></linearGradient>
<linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bccadc"/><stop offset="1" stop-color="#697c96"/></linearGradient>
<linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6070b0"/><stop offset="1" stop-color="#262f5c"/></linearGradient>
<linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#e3a012"/></linearGradient>
<linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4d49a"/><stop offset="1" stop-color="#cc9648"/></linearGradient>
<linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d4c8ff"/></linearGradient>
<linearGradient id="gSF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6f86"/><stop offset=".55" stop-color="#6cc1a6"/><stop offset="1" stop-color="#c7e8a0"/></linearGradient>
<linearGradient id="gSW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f3b7c"/><stop offset=".6" stop-color="#2f86d0"/><stop offset="1" stop-color="#8fe0f0"/></linearGradient>
<linearGradient id="gSM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e48fb2"/><stop offset=".55" stop-color="#f7c4b8"/><stop offset="1" stop-color="#fff0cc"/></linearGradient>
<linearGradient id="gSD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241a66"/><stop offset=".55" stop-color="#7a4bc2"/><stop offset="1" stop-color="#f2b0d8"/></linearGradient>
<linearGradient id="gSN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141848"/><stop offset=".6" stop-color="#4f45a6"/><stop offset="1" stop-color="#f3c58a"/></linearGradient>
<linearGradient id="gSC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08507c"/><stop offset=".6" stop-color="#1ca0b6"/><stop offset="1" stop-color="#a4ead8"/></linearGradient>
<linearGradient id="gRay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="gCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a0" stop-opacity=".7"/><stop offset="1" stop-color="#fff2a0" stop-opacity="0"/></linearGradient>
<linearGradient id="gDoor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb938"/></linearGradient>
<radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
<radialGradient id="gMoonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4" stop-opacity=".7"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
</defs></svg>`;

window.FA_CSS = `
.fR{fill:url(#gR)}.fO{fill:url(#gO)}.fY{fill:url(#gY)}.fG{fill:url(#gG)}.fT{fill:url(#gT)}.fB{fill:url(#gB)}.fP{fill:url(#gP)}.fK{fill:url(#gK)}
.fN{fill:url(#gN)}.fC{fill:url(#gC)}.fW{fill:url(#gW)}.fS{fill:url(#gS)}.fD{fill:url(#gD)}.fA{fill:url(#gA)}.fU{fill:url(#gU)}.fL{fill:url(#gL)}
.sh{fill:rgba(40,20,70,.2)}.hl{fill:#fff;opacity:.72}.ink{fill:#3a2a33}
svg.fa-svg{display:block;overflow:visible}svg.fa-svg path,svg.fa-svg circle,svg.fa-svg ellipse{stroke-linecap:round;stroke-linejoin:round}
`;

const star = (x, y, r, cls) => `<path class="${cls}" d="M${x} ${y - r}l${r * .28} ${r * .72} ${r * .72} ${r * .28}-${r * .72} ${r * .28}-${r * .28} ${r * .72}-${r * .28}-${r * .72}-${r * .72}-${r * .28} ${r * .72}-${r * .28}z"/>`;
const glow = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gGlow)"/>`;
const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .25}" fill="#fff" opacity=".85"/>`;

window.FA = {
  // ---------------------------------------------------------------- Toadstool (common)
  toadstool: {
    scene: `<rect width="100" height="108" fill="url(#gSF)"/>
      <path d="M0 74c8-20 14-20 22 0v34H0zM18 70c9-26 17-26 26 0v38H18zM62 72c8-22 15-22 22 0v36H62zM80 64c9-28 17-28 26 0v44H80z" fill="#245f5a" opacity=".55"/>
      <path d="M30 0h14L26 108H6zM62 0h9L66 108H40z" fill="url(#gRay)" opacity=".55"/>
      ${glow(18, 40, 7)}${glow(82, 34, 7)}${glow(72, 62, 6)}${glow(28, 64, 6)}${glow(54, 22, 6)}
      <circle cx="18" cy="40" r="1.3" fill="#fff6b0"/><circle cx="82" cy="34" r="1.3" fill="#fff6b0"/><circle cx="72" cy="62" r="1.1" fill="#fff6b0"/><circle cx="28" cy="64" r="1.1" fill="#fff6b0"/><circle cx="54" cy="22" r="1.1" fill="#fff6b0"/>
      <path d="M0 90c22-8 44-10 100-4v22H0z" fill="#3a9a52"/><path d="M0 100c30-5 62-5 100 0v8H0z" fill="#2c7a4a"/>`,
    hero: `<ellipse cx="50" cy="94" rx="40" ry="5" fill="#0a1a14" opacity=".35"/>
      <path class="fG" d="M8 94c6-10 16-14 28-14h28c12 0 22 4 28 14z"/><path class="sh" d="M60 80h4c12 0 22 4 28 14H70z"/>
      <path class="fG" d="M12 92l-2-14 6 10 2-12 4 14zM84 92l-1-12 5 9 3-11 1 14z"/>
      <path class="fC" d="M20 74h9c-1 6 0 11 1 16H18c1-5 2-10 2-16z"/><path class="fO" d="M10 72c0-9 6-15 14-15s14 6 14 15c0 1-3 2-14 2s-14-1-14-2z"/><circle class="fW" cx="18" cy="66" r="2"/><circle class="fW" cx="27" cy="63" r="1.5"/>
      <path class="fC" d="M74 72h8c-1 6 0 11 1 18H72c1-5 2-12 2-18z"/><path class="fK" d="M66 70c0-8 5-13 12-13s12 5 12 13c0 1-3 2-12 2s-12-1-12-2z"/><circle class="fW" cx="73" cy="65" r="1.8"/><circle class="fW" cx="82" cy="63" r="1.4"/>
      <path class="fC" d="M42 52c1 12 0 26-3 40h26c-3-14-4-28-3-40z"/><path class="sh" d="M56 52c0 14 1 28 4 40h5c-3-14-4-28-3-40z"/>
      <path d="M44 66c0 8 1 16-1 24M52 62c0 10 0 20 0 28" stroke="#c9a77a" stroke-width=".8" fill="none" opacity=".6"/>
      <path class="fW" d="M39 60c9 5 21 5 30 0l1 4c-10 6-22 6-32 0z"/>
      <path class="fC" d="M16 52c8 5 22 8 37 8s29-3 37-8c0 6-14 12-37 12S16 58 16 52z"/><path class="sh" d="M16 52c8 5 22 8 37 8s29-3 37-8c0 6-14 12-37 12S16 58 16 52z" opacity=".5"/>
      <path d="M26 56c-1 3 0 5 2 7M38 59c0 3 1 5 2 6M54 60v6M68 59c0 3-1 5-2 6M80 56c1 3 0 5-2 7" stroke="#b78e5e" stroke-width=".7" fill="none" opacity=".6"/>
      <path class="fR" d="M10 52C10 30 28 12 52 12s42 18 42 40c0 3-8 6-42 6S10 55 10 52z"/>
      <path class="sh" d="M52 12c24 0 42 18 42 40 0 3-8 6-42 6 14-8 18-26 0-46z" opacity=".7"/>
      <circle class="fW" cx="34" cy="32" r="6.5"/><circle class="fW" cx="60" cy="24" r="5.2"/><circle class="fW" cx="78" cy="38" r="4.6"/><circle class="fW" cx="48" cy="44" r="3.8"/><circle class="fW" cx="24" cy="46" r="3.2"/><circle class="fW" cx="68" cy="50" r="3"/><circle class="fW" cx="86" cy="50" r="2"/>
      <ellipse class="hl" cx="28" cy="22" rx="10" ry="4" transform="rotate(-32 28 22)"/>
      ${star(88, 16, 5, 'fY')}${star(10, 28, 4, 'fY')}${star(70, 8, 3, 'fY')}<circle class="hl" cx="92" cy="30" r="1"/><circle class="hl" cx="6" cy="44" r="1"/>`
  },

  // ---------------------------------------------------------------- Lantern Fish (ultra)
  'lantern-fish': {
    scene: `<rect width="100" height="108" fill="url(#gSW)"/>
      <path d="M10 0h10L40 108H10zM44 0h8L72 108H52zM78 0h8L100 90V108H84z" fill="url(#gRay)" opacity=".45"/>
      ${bubble(14, 70, 3)}${bubble(22, 52, 2)}${bubble(86, 60, 3.4)}${bubble(78, 36, 2)}${bubble(90, 24, 1.6)}${bubble(8, 30, 1.4)}
      <path d="M0 96c16-6 30-2 48-4s36 4 52-2v22H0z" fill="#f2d9a0" opacity=".9"/><path d="M0 100c20-4 40 0 60-2s28 2 40 0v10H0z" fill="#d9b878"/>
      <path d="M8 98c-4-12 4-16 0-30 6 8 4 18 2 30zM16 98c-2-8 2-12 0-22 5 6 3 14 2 22zM90 98c-3-14 4-20 0-34 6 10 4 22 2 34z" fill="#2f9a5a"/>`,
    hero: `<ellipse cx="50" cy="92" rx="34" ry="4" fill="#06223f" opacity=".3"/>
      <path d="M50 20l-18 52h36z" fill="url(#gCone)"/>${glow(48, 16, 20)}
      <path class="fY" d="M68 54c6-4 14-14 26-22-4 8-4 14-3 22 1 8 1 14 3 22-12-8-20-18-26-22z"/>
      <path d="M72 54l18-14M72 54h18M72 54l18 14" stroke="#d9852a" stroke-width=".9" fill="none" opacity=".8"/>
      <path class="fO" d="M30 30c6-14 22-14 34 2-8-2-16-2-22 2-4 0-8-2-12-4z"/><path d="M36 28l2 6M44 24l1 8M52 24l1 8M58 27l-1 6" stroke="#d9852a" stroke-width=".8" fill="none"/>
      <path class="fO" d="M10 55C10 37 30 27 50 27s26 10 24 28c-2 19-12 27-24 27C30 82 10 74 10 55z"/>
      <path class="fC" d="M14 62c6 12 22 18 38 18 14 0 22-6 24-14-8 6-20 8-34 6-12-1-22-4-28-10z"/>
      <path class="sh" d="M50 82c14 0 24-8 24-27 0 14-8 24-24 24z" opacity=".5"/>
      <path d="M36 29c-6 16-6 36 0 52M50 27c-5 17-5 37 0 55M63 28c-4 16-4 36 0 50" stroke="#fff" stroke-width="3.6" fill="none" opacity=".82"/>
      <path d="M36 29c-6 16-6 36 0 52M50 27c-5 17-5 37 0 55M63 28c-4 16-4 36 0 50" stroke="#c75a1a" stroke-width=".6" fill="none" opacity=".5" transform="translate(2.2 0)"/>
      <path d="M44 48a4 4 0 0 1 8 0M54 54a4 4 0 0 1 8 0M42 58a4 4 0 0 1 8 0M54 66a4 4 0 0 1 8 0M66 50a3 3 0 0 1 6 0" stroke="#fff" stroke-width=".9" fill="none" opacity=".4"/>
      <path class="fY" d="M38 60c-8 4-8 14-3 18 8-1 13-8 15-14z"/>
      <path d="M31 40c-3 9-3 16 0 22" stroke="#b64a14" stroke-width="1.1" fill="none" opacity=".4"/>
      <circle class="fW" cx="23" cy="49" r="7.5"/><circle class="ink" cx="22" cy="49.5" r="4.2"/><circle class="hl" cx="20" cy="47" r="1.8"/><circle class="hl" cx="24" cy="52" r=".9"/>
      <path d="M10 57c3 3 7 4 11 3" stroke="#3a2a33" stroke-width="1" fill="none"/><path class="fW" d="M12 58l1.5 3 1.5-2.5z"/>
      <path d="M22 31C17 12 34 5 48 11" stroke="#7a4b2a" stroke-width="1.7" fill="none"/><circle class="fA" cx="50" cy="12" r="6"/><circle class="hl" cx="48" cy="10" r="1.7"/>
      <circle cx="86" cy="26" r="3.2" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-opacity=".8" stroke-width=".8"/><circle cx="92" cy="14" r="2" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-opacity=".8" stroke-width=".7"/><circle cx="80" cy="10" r="1.3" fill="#fff" opacity=".8"/>`
  },

  // ---------------------------------------------------------------- Mossmind Titan (mythic)
  'mossy-titan': {
    scene: `<rect width="100" height="108" fill="url(#gSM)"/>
      <circle cx="68" cy="40" r="22" fill="url(#gMoonGlow)"/><circle cx="68" cy="40" r="9" fill="#fff4cf"/>
      <path d="M0 80c14-14 24-10 36-18 12 6 22 0 34-10 12 8 22 6 30 16v48H0z" fill="#b99ab8" opacity=".55"/>
      <path d="M0 92c18-10 32-4 48-12 18 8 34 2 52 12v16H0z" fill="#8a7aa8" opacity=".75"/>
      <path d="M12 26q4-3 8 0q4-3 8 0M70 18q3-2 6 0q3-2 6 0M30 14q3-2 5 0q3-2 5 0" stroke="#6a4a6e" stroke-width=".9" fill="none"/>`,
    hero: `<ellipse cx="50" cy="94" rx="44" ry="4" fill="#2a1f3a" opacity=".3"/>
      <path class="fS" d="M46 84L72 34l24 50z"/><path class="fW" d="M72 34l7 11-4-2-3 5-3-5-4 2z"/>
      <path class="fS" d="M2 92L40 14l25 40 12-16 21 54z"/>
      <path class="sh" d="M40 14l25 40 12-16 21 54H44z" opacity=".9"/>
      <path class="fW" d="M40 14l12 20-6-3-6 9-5-9-7 4z"/><path class="sh" d="M40 14l12 20-6-3-4 6z" opacity=".5"/>
      <path d="M26 50q5 4 10 0M46 52q5 4 10 0" stroke="#3a2a33" stroke-width="1.7" fill="none"/><path d="M24 46q6-3 12-1M44 48q6-3 12-1" stroke="#3a2a33" stroke-width="1" fill="none" opacity=".6"/>
      <path d="M40 54c1 5 2 8 4 10" stroke="#4f5f78" stroke-width="1.3" fill="none" opacity=".6"/>
      <path class="fG" d="M4 84c10-6 14-2 22-8 6 5 12 1 20 8 8-6 14-6 22 0 6-4 14-6 28 4v6H2z"/>
      <path class="fG" d="M24 74c3 9 5 12 6 18M34 78c2 8 4 10 6 14M50 82c2 6 4 8 6 12" stroke="#32a047" stroke-width="3.2" fill="none"/>
      <path class="hl" d="M10 82c6-3 10-1 14-4" stroke="#d9f5b8" stroke-width="1.2" fill="none"/>
      <path class="fG" d="M8 94l5-16 5 16zM18 94l4-12 4 12zM72 94l5-16 5 16zM84 94l4-12 4 12z"/><path class="sh" d="M13 78l5 16h-5zM77 78l5 16h-5z"/>
      <ellipse cx="22" cy="60" rx="14" ry="3.5" class="fW" opacity=".8"/><ellipse cx="78" cy="68" rx="14" ry="3.5" class="fW" opacity=".75"/><ellipse cx="60" cy="72" rx="10" ry="2.6" class="fW" opacity=".6"/>
      ${star(88, 18, 4, 'fY')}${star(12, 20, 3, 'fY')}`
  },

  // ---------------------------------------------------------------- Duermevela (divine)
  duermevela: {
    scene: `<rect width="100" height="108" fill="url(#gSN)"/>
      <circle cx="28" cy="26" r="20" fill="url(#gMoonGlow)"/><path class="fA" d="M32 16a11 11 0 1 0 8 18 9.500 9.500 0 0 1-8-18z"/>
      ${star(70, 22, 3, 'fW')}${star(84, 40, 2.4, 'fW')}${star(56, 12, 2.2, 'fW')}${star(14, 52, 2.4, 'fW')}${star(90, 14, 2, 'fW')}${star(46, 34, 1.8, 'fW')}
      <circle cx="10" cy="14" r=".9" fill="#fff"/><circle cx="64" cy="40" r=".8" fill="#fff"/><circle cx="76" cy="8" r=".9" fill="#fff"/><circle cx="92" cy="58" r=".9" fill="#fff"/><circle cx="30" cy="60" r=".8" fill="#fff"/>
      <path d="M0 84c14-6 26-4 40-8s34-2 60-6v44H0z" fill="#fff" opacity=".18"/><path d="M0 94c20-6 40-2 60-6 16-3 28-2 40-4v24H0z" fill="#fff" opacity=".22"/>`,
    hero: `<ellipse cx="50" cy="95" rx="42" ry="4" fill="#0c0d30" opacity=".35"/>
      <path d="M31 84L16 96h68L69 84z" fill="url(#gCone)" opacity=".9"/>
      <path class="fS" d="M12 92h76l3 4H9zM16 88h68l3 4H13zM20 84h60l3 4H17z"/><path class="sh" d="M12 92h76l3 4H9z" opacity=".6"/>
      <path class="fS" d="M24 84V42a26 26 0 0 1 52 0v42z"/><path class="sh" d="M62 20a26 26 0 0 1 14 22v42h-8z" opacity=".5"/>
      <path class="fW" d="M43 14h14l-2 10h-10z" opacity=".95"/><path class="sh" d="M50 14h7l-2 10h-5z" opacity=".5"/>
      <path class="fDoor" fill="url(#gDoor)" d="M31 84V43a19 19 0 0 1 38 0v41z"/>
      <path d="M40 84V50M50 84V44M60 84V50" stroke="#fff" stroke-width="2.4" opacity=".28"/>
      ${star(52, 46, 7, 'fW')}${star(60, 62, 4, 'fW')}${star(43, 68, 3, 'fW')}<circle class="hl" cx="58" cy="40" r="1.4"/><circle class="hl" cx="46" cy="58" r="1"/>
      <path class="fU" d="M31 84V43a19 19 0 0 1 9-16.500V84z"/><path class="sh" d="M36 26.500V84h4V27z" opacity=".5"/>
      <path d="M31 56h9M31 70h9M33 40c2-4 4-7 7-9" stroke="#a9742f" stroke-width="1" fill="none" opacity=".8"/>
      <rect class="fN" x="31" y="52" width="3" height="5" rx="1"/><rect class="fN" x="31" y="72" width="3" height="5" rx="1"/>
      <circle class="fA" cx="37" cy="64" r="1.5"/><circle class="hl" cx="36.500" cy="63.500" r=".5"/>
      <path d="M22 84c-5-10 1-16-2-24s3-14 0-22" stroke="#32a047" stroke-width="2.4" fill="none"/>
      <circle class="fG" cx="20" cy="62" r="2.6"/><circle class="fG" cx="23" cy="48" r="2.4"/><circle class="fG" cx="19" cy="40" r="2.2"/><circle class="fG" cx="23" cy="74" r="2.4"/><circle class="fK" cx="21" cy="56" r="1.4"/>
      ${star(86, 30, 5, 'fW')}${star(12, 24, 4, 'fA')}${star(88, 60, 3, 'fY')}<circle class="hl" cx="92" cy="46" r="1.1"/>`
  },

  // ---------------------------------------------------------------- Marea Lenta (divine)
  'marea-lenta': {
    scene: `<rect width="100" height="108" fill="url(#gSC)"/>
      <path d="M6 0h12L36 108H4zM46 0h9L68 108H42zM80 0h8l12 90v18H80z" fill="url(#gRay)" opacity=".5"/>
      ${bubble(16, 60, 3)}${bubble(24, 40, 2)}${bubble(84, 52, 3.2)}${bubble(74, 28, 1.8)}${bubble(90, 74, 2)}${bubble(10, 24, 1.4)}
      <path d="M0 94c18-6 34-2 52-4s32 4 48-2v22H0z" fill="#f5e0a8"/><path d="M0 100c22-4 44 0 66-2 14-1 24 1 34 0v10H0z" fill="#dcbc7c"/>`,
    hero: `<ellipse cx="50" cy="94" rx="40" ry="4" fill="#04243c" opacity=".3"/>
      <path class="fS" d="M10 94c4-9 12-12 22-12h36c10 0 18 3 22 12z"/><path class="sh" d="M60 82h8c10 0 18 3 22 12H70z" opacity=".7"/>
      <path class="fK" d="M80 88c-5-16-9-28-5-42 9 7 16 20 16 42z"/><path d="M80 88c-2-14-4-24-3-34M84 88c-1-12-1-22 2-30" stroke="#ffd0e4" stroke-width=".8" fill="none" opacity=".8"/>
      <g fill="none" stroke="#ff7a8e" stroke-width="6.500" stroke-linecap="round" stroke-linejoin="round"><path d="M50 88V56"/><path d="M50 72L34 56V34"/><path d="M50 62l16-14V28"/><path d="M34 56L22 48"/><path d="M66 48l12-8"/><path d="M34 44l-8-6"/></g>
      <g fill="none" stroke="#ffc4cc" stroke-width="1.700" stroke-linecap="round"><path d="M48 86V58"/><path d="M32 54V36"/><path d="M64 46V30"/></g>
      <g fill="none" stroke="#ff9a52" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 90C20 78 28 74 24 62"/><path d="M24 74l-8-8"/><path d="M26 66l8-4"/></g>
      <circle class="fO" cx="34" cy="32" r="4.200"/><circle class="fO" cx="66" cy="26" r="4.200"/><circle class="fO" cx="22" cy="46" r="3.600"/><circle class="fO" cx="78" cy="38" r="3.600"/><circle class="fO" cx="26" cy="36" r="3.200"/><circle class="fO" cx="50" cy="52" r="3.600"/>
      <circle class="fY" cx="24" cy="60" r="3"/><circle class="fY" cx="16" cy="64" r="2.600"/><circle class="fY" cx="35" cy="60" r="2.600"/>
      <circle class="hl" cx="33" cy="30.500" r="1.200"/><circle class="hl" cx="65" cy="24.500" r="1.200"/>
      <path class="fO" d="M34 92l2-6 3 4 5-1-3 5 2 5-5-2-4 3z"/>
      <path class="fY" d="M80 22c-4-4-10-3-12 1 4 3 10 3 12-1zM88 18l5-3-1 6z"/><circle class="ink" cx="72" cy="22" r=".9"/>
      <path class="fK" d="M12 40c-3-3-8-2-9 1 3 3 8 2 9-1zM17 38l4-3-1 5z"/>
      ${bubble(90, 60, 2.600)}${bubble(8, 76, 2)}${bubble(46, 12, 1.600)}`
  },

  // ---------------------------------------------------------------- Ensueño (divine)
  ensueno: {
    scene: `<rect width="100" height="108" fill="url(#gSD)"/>
      <path d="M0 40c20-18 40-14 60-26 14-8 28-10 40-6v26c-14-4-26 0-40 8-22 12-38 8-60 18z" fill="#ff9ad0" opacity=".28"/>
      <path d="M0 64c24-14 44-8 66-20 12-6 24-8 34-4v22c-12-2-22 4-34 12-24 14-44 8-66 18z" fill="#7de0ff" opacity=".22"/>
      ${star(20, 18, 4, 'fW')}${star(78, 14, 3.4, 'fW')}${star(88, 50, 3, 'fW')}${star(10, 56, 2.6, 'fW')}${star(54, 8, 2.4, 'fW')}${star(34, 40, 2, 'fW')}${star(70, 36, 2, 'fW')}
      <circle cx="44" cy="22" r="1" fill="#fff"/><circle cx="92" cy="26" r="1" fill="#fff"/><circle cx="16" cy="36" r=".9" fill="#fff"/><circle cx="62" cy="14" r=".9" fill="#fff"/><circle cx="84" cy="70" r="1" fill="#fff"/><circle cx="24" cy="74" r=".9" fill="#fff"/>
      <ellipse cx="30" cy="96" rx="30" ry="9" fill="#fff" opacity=".22"/><ellipse cx="78" cy="100" rx="28" ry="8" fill="#fff" opacity=".2"/>`,
    hero: `<ellipse cx="50" cy="92" rx="36" ry="4" fill="#1c1050" opacity=".3"/>
      <circle cx="50" cy="52" r="34" fill="url(#gGlow)" opacity=".55"/>
      <circle class="fL" cx="30" cy="60" r="16"/><circle class="fL" cx="48" cy="46" r="20"/><circle class="fL" cx="68" cy="56" r="17"/><circle class="fL" cx="82" cy="64" r="11"/><circle class="fL" cx="50" cy="66" r="18"/><circle class="fL" cx="20" cy="70" r="10"/>
      <ellipse class="fL" cx="50" cy="74" rx="40" ry="13"/>
      <path class="sh" d="M12 76c4 12 22 14 38 14s34-2 38-14c-6 6-22 8-38 8s-32-2-38-8z" opacity=".7"/>
      <path d="M26 62c6-6 14-6 20 0M54 40c8-4 16 0 18 8M60 66c6 4 14 2 18-4" stroke="#b9a4f0" stroke-width="1.200" fill="none" opacity=".8"/>
      <ellipse class="hl" cx="40" cy="36" rx="9" ry="3.600" transform="rotate(-22 40 36)"/><ellipse class="hl" cx="66" cy="46" rx="5" ry="2.400" transform="rotate(-18 66 46)"/><ellipse class="hl" cx="22" cy="58" rx="4" ry="2" transform="rotate(-30 22 58)"/>
      ${star(50, 58, 15, 'fA')}${star(50, 58, 8, 'fY')}${star(28, 52, 4.500, 'fY')}${star(72, 48, 4, 'fY')}${star(66, 72, 3.200, 'fK')}${star(24, 74, 3, 'fK')}
      <path class="fA" d="M80 6a15 15 0 1 0 11 24 12.500 12.500 0 0 1-11-24z"/><path class="hl" d="M76 12a10 10 0 0 0-3 14" stroke="#fff" stroke-width="1.400" fill="none" opacity=".7"/>
      <circle class="fL" cx="16" cy="86" r="5.500"/><circle class="fL" cx="8" cy="94" r="3.200"/><circle class="fL" cx="3.500" cy="99" r="1.800"/>
      ${star(90, 78, 4, 'fW')}${star(8, 32, 3.400, 'fW')}<circle class="hl" cx="94" cy="44" r="1.200"/><circle class="hl" cx="6" cy="52" r="1"/>`
  }
};
window.FA_ORDER = ['toadstool', 'lantern-fish', 'mossy-titan', 'duermevela', 'marea-lenta', 'ensueno'];
