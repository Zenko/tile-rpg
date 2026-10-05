// Full art for the remaining mythic cards. Same system as fa-art.js: HERO is a 100x100 subject, SCENE a 100x108 backdrop.
window.FA_DEFS2 = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gSDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06193a"/><stop offset=".6" stop-color="#0d4a7a"/><stop offset="1" stop-color="#1b8aa0"/></linearGradient>
<linearGradient id="gSStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f45"/><stop offset=".55" stop-color="#4a4f86"/><stop offset="1" stop-color="#8d86b8"/></linearGradient>
<linearGradient id="gSCave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1330"/><stop offset=".6" stop-color="#2d2a5a"/><stop offset="1" stop-color="#3a7a80"/></linearGradient>
<linearGradient id="gSDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7fd0"/><stop offset=".45" stop-color="#f2a8c8"/><stop offset="1" stop-color="#ffe3a8"/></linearGradient>
<linearGradient id="gSTwi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a8a"/><stop offset=".55" stop-color="#a98ad8"/><stop offset="1" stop-color="#ffcfa8"/></linearGradient>
<linearGradient id="gSRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1230"/><stop offset=".6" stop-color="#6a2a58"/><stop offset="1" stop-color="#e07a8a"/></linearGradient>
<linearGradient id="gSStage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a0f2a"/><stop offset=".6" stop-color="#b02a48"/><stop offset="1" stop-color="#f08a5a"/></linearGradient>
<linearGradient id="gSVoid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05061a"/><stop offset=".6" stop-color="#1a1650"/><stop offset="1" stop-color="#5a3a9a"/></linearGradient>
<linearGradient id="gSMoon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1f4a"/><stop offset=".6" stop-color="#1a5a8a"/><stop offset="1" stop-color="#7ad0d8"/></linearGradient>
<linearGradient id="gSStormSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27456a"/><stop offset=".55" stop-color="#3d8a9a"/><stop offset="1" stop-color="#b8e0d0"/></linearGradient>
</defs></svg>`;

const S4 = (x, y, r, c) => `<path class="${c}" d="M${x} ${y - r}l${r * .28} ${r * .72} ${r * .72} ${r * .28}-${r * .72} ${r * .28}-${r * .28} ${r * .72}-${r * .28}-${r * .72}-${r * .72}-${r * .28} ${r * .72}-${r * .28}z"/>`;
const GL = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gGlow)"/>`;
const BU = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .25}" fill="#fff" opacity=".85"/>`;
const STARS = (pts) => pts.map(([x, y, r]) => r > 1.6 ? S4(x, y, r, 'fW') : `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".9"/>`).join('');
const MOON = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r * 2}" fill="url(#gMoonGlow)"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff6d6"/><circle cx="${x - r * .3}" cy="${y - r * .2}" r="${r * .22}" fill="#e8dcb8" opacity=".7"/><circle cx="${x + r * .35}" cy="${y + r * .3}" r="${r * .16}" fill="#e8dcb8" opacity=".7"/>`;
const SEAFLOOR = `<path d="M0 94c18-6 34-2 52-4s32 4 48-2v22H0z" fill="#d9c08a" opacity=".85"/><path d="M0 100c22-4 44 0 66-2 14-1 24 1 34 0v10H0z" fill="#b8a070"/>`;
const RAYS = (o) => `<path d="M8 0h12L40 108H6zM46 0h9L70 108H44zM82 0h8l10 90v18H82z" fill="url(#gRay)" opacity="${o || .4}"/>`;
const NOTE = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><ellipse cx="0" cy="0" rx="3.2" ry="2.4" transform="rotate(-20)"/><path d="M2.600 -1.200h1.400V-12c3 .8 5 2.600 5 5.600-2-1.600-3.400-1.800-5-1.600z"/></g>`;

Object.assign(window.FA, {
  // ---------------------------------------------------------------- Dawn Stag
  'aurora-stag': {
    scene: `<rect width="100" height="108" fill="url(#gSDawn)"/>
      <path d="M0 24C20 8 40 22 60 8 76 -2 90 8 100 4V0H0z" fill="#7de0c8" opacity=".3"/><path d="M0 40C24 22 46 34 68 18 82 8 92 16 100 12V0H0z" fill="#ff9ad0" opacity=".25"/>
      <circle cx="70" cy="62" r="26" fill="url(#gMoonGlow)"/><circle cx="70" cy="62" r="10" fill="#fff4cf"/>
      <path d="M0 74c10-22 18-22 26 0v34H0zM20 70c9-28 19-28 28 0v38H20zM66 72c8-24 17-24 24 0v36H66zM84 66c9-30 19-30 28 0v42H84z" fill="#4a7a5c" opacity=".6"/>
      <ellipse cx="30" cy="90" rx="42" ry="7" fill="#fff" opacity=".35"/><path d="M0 92c24-6 50-8 100-4v20H0z" fill="#5aa860"/><path d="M0 102c30-4 60-4 100 0v6H0z" fill="#3a8a4c"/>
      <path d="M14 28q3-2 6 0q3-2 6 0M74 22q3-2 5 0q3-2 5 0" stroke="#5a3a6a" stroke-width=".9" fill="none"/>`,
    hero: `<ellipse cx="50" cy="94" rx="38" ry="4" fill="#1a2a20" opacity=".3"/>
      <path d="M10 22C26 4 40 10 54 2 68-4 82 6 94 2" stroke="#7de0c8" stroke-width="5" fill="none" opacity=".5"/><path d="M6 32C24 14 44 22 60 10 74 0 86 12 98 8" stroke="#ff9ad0" stroke-width="4" fill="none" opacity=".45"/>
      <path class="fN" d="M60 70l3 20h6l-2-20zM34 70l-3 20h6l3-20z"/><path class="sh" d="M60 70l3 20h6l-2-20zM34 70l-3 20h6l3-20z" opacity=".5"/>
      <path class="fU" d="M26 58c0-12 14-18 30-16 14 2 24 8 24 18 0 9-10 14-24 14-18 0-30-4-30-16z"/>
      <path class="fC" d="M30 66c8 6 28 8 42 2-4 8-14 10-24 10-10 0-16-4-18-12z"/>
      <circle class="fW" cx="46" cy="52" r="1.700" opacity=".85"/><circle class="fW" cx="56" cy="48" r="1.500" opacity=".85"/><circle class="fW" cx="66" cy="52" r="1.700" opacity=".85"/><circle class="fW" cx="52" cy="58" r="1.300" opacity=".85"/><circle class="fW" cx="62" cy="60" r="1.300" opacity=".85"/><circle class="fW" cx="40" cy="58" r="1.300" opacity=".85"/>
      <path class="fU" d="M70 70l2 20h6l-3-22zM42 72l-2 18h6l2-20z"/><path class="ink" d="M72 90h6v3h-7zM40 90h6v3h-7zM63 90h6v3h-7zM31 90h6v3h-7z"/>
      <path class="fU" d="M32 54C26 44 24 34 28 24l10-2c0 10 4 20 12 28z"/><path class="fC" d="M34 44c-2 6 0 10 4 12 0-6-1-10-4-12z"/>
      <path class="fU" d="M16 30c0-8 8-12 16-10l6 4-2 10-8 8c-6 2-12-2-12-12z"/><path class="fC" d="M14 34c2 4 6 6 10 6l4-6c-4 2-10 2-14 0z"/>
      <ellipse class="ink" cx="14.500" cy="35" rx="1.400" ry="1.100"/><path d="M23 27q2.500 2.500 5 0" stroke="#3a2a33" stroke-width="1.100" fill="none"/>
      <path class="fU" d="M32 18l9-9-1 12z"/><path class="fK" d="M34 17l5-5v7z"/>
      <g fill="none" stroke="#ffe27a" stroke-width="2.600" stroke-linecap="round"><path d="M30 20C28 10 20 6 14 8M24 12L20 4M30 20C34 10 42 6 48 8M40 10L44 2M34 15l11 2"/></g>
      <g fill="none" stroke="#fff7c8" stroke-width=".9" stroke-linecap="round"><path d="M30 20C28 10 20 6 14 8M30 20C34 10 42 6 48 8"/></g>
      ${GL(14, 8, 6)}${GL(20, 4, 5)}${GL(48, 8, 6)}${GL(44, 2, 5)}<circle class="fY" cx="14" cy="8" r="1.700"/><circle class="fY" cx="20" cy="4" r="1.500"/><circle class="fY" cx="48" cy="8" r="1.700"/><circle class="fY" cx="44" cy="2" r="1.500"/>
      <path class="fG" d="M8 92l3-12 4 12zM86 92l2-10 4 10zM46 94l2-9 3 9z"/>
      <circle class="fK" cx="38" cy="91" r="2.600"/><circle class="fY" cx="38" cy="91" r="1"/><circle class="fK" cx="68" cy="92" r="2.400"/><circle class="fY" cx="68" cy="92" r=".9"/><circle class="fK" cx="54" cy="93" r="2"/>
      ${S4(90, 40, 4, 'fY')}${S4(10, 52, 3, 'fW')}`
  },

  // ---------------------------------------------------------------- Slow Current
  'deep-current': {
    scene: `<rect width="100" height="108" fill="url(#gSW)"/>${RAYS(.45)}
      <path d="M0 30c14-8 26 8 40 0s26-8 40 0 16 4 20 0M0 52c14-8 26 8 40 0s26-8 40 0 16 4 20 0M0 74c14-8 26 8 40 0s26-8 40 0 16 4 20 0" stroke="#bfefff" stroke-width="1.200" fill="none" opacity=".35"/>
      ${BU(12, 70, 3)}${BU(22, 48, 2)}${BU(88, 58, 3.400)}${BU(78, 30, 2)}${BU(92, 20, 1.600)}${SEAFLOOR}`,
    hero: `<ellipse cx="50" cy="94" rx="34" ry="3.600" fill="#06223f" opacity=".3"/>
      <path d="M6 82c14 8 30-6 46 2M10 14c12-6 26 4 40-2" stroke="#bfefff" stroke-width="2.200" fill="none" opacity=".6" stroke-linecap="round"/>
      <path class="fB" d="M80 50c6-8 8-18 4-26 8 2 14 10 12 20 4-6 4-14 0-20 8 8 8 22 0 32z"/>
      <path class="fB" d="M8 54c0-18 18-30 42-28 16 2 28 10 32 24-4 4-10 8-18 8-8 12-24 16-40 12-12-4-16-12-16-16z"/>
      <path class="fC" d="M14 62c6 12 22 18 40 14 12-3 20-8 26-14-4 10-12 18-28 20-20 3-34-6-38-20z"/>
      <path d="M22 66c14 6 30 6 48-2M28 72c12 4 26 4 38-2M36 77c8 2 18 2 26-2" stroke="#cdb892" stroke-width=".9" fill="none" opacity=".7"/>
      <path class="sh" d="M50 26c16 2 28 10 32 24-4 4-10 8-18 8 6-12 0-26-14-32z" opacity=".5"/>
      <path class="fB" d="M42 62c-8 8-10 16-5 22 10-2 16-10 18-18z"/><path class="sh" d="M42 62c-8 8-10 16-5 22l6-2c-2-6 0-14 4-20z" opacity=".5"/>
      <path d="M20 50q4 3 8 0" stroke="#1a2f5a" stroke-width="1.600" fill="none"/><path d="M12 62c4 3 10 4 16 3" stroke="#1a2f5a" stroke-width="1.200" fill="none"/>
      <path d="M26 28l5-10M34 26l3-9M42 26l1-8" stroke="#bfefff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".85"/><path d="M26 18q-2-4 2-6M37 17q0-4 4-4" stroke="#fff" stroke-width="1.200" fill="none" opacity=".8"/>
      <ellipse class="hl" cx="38" cy="34" rx="10" ry="3" transform="rotate(-8 38 34)"/>
      <circle fill="#fff" opacity=".5" cx="60" cy="42" r="1.100"/><circle fill="#fff" opacity=".5" cx="66" cy="50" r="1"/>
      ${BU(90, 70, 3)}${BU(94, 58, 1.800)}${BU(8, 34, 2)}`
  },

  // ---------------------------------------------------------------- Mountain of Memory
  'mountain-heart': {
    scene: `<rect width="100" height="108" fill="url(#gSTwi)"/>${STARS([[14, 14, 2.4], [30, 28, 1.2], [60, 10, 2], [84, 22, 2.4], [92, 44, 1.2], [8, 44, 1.2], [46, 18, 1.2], [72, 36, 1.2]])}
      <circle cx="50" cy="56" r="34" fill="url(#gGlow)" opacity=".55"/>
      <path d="M0 78c10-18 18-12 26-24 8 10 16 4 24-8 10 16 20 10 28 22 8-8 16-4 22 4v40H0z" fill="#7a68b8" opacity=".6"/><path d="M0 92c20-8 38-4 54-12 16 6 30 4 46 10v18H0z" fill="#5a4a98" opacity=".8"/>`,
    hero: `<ellipse cx="50" cy="94" rx="42" ry="4" fill="#1c1040" opacity=".35"/>
      <path class="fS" d="M4 92L34 26l16 22 16-34 30 78z"/><path class="sh" d="M50 48l16-34 30 78H52z" opacity=".8"/>
      <path class="fW" d="M34 26l6 9-3-1-3 5-3-5-3 1zM66 14l7 13-4-2-3 6-3-6-4 2z"/>
      ${GL(50, 64, 22)}<path class="fK" d="M50 82C30 68 34 52 43 54c4 0 7 3 7 7 0-4 3-7 7-7 9-2 13 14-7 28z"/><path class="sh" d="M50 82C70 68 66 52 57 54c-4 0-7 3-7 7z" opacity=".35"/><ellipse class="hl" cx="43" cy="58" rx="2.600" ry="1.600" transform="rotate(-30 43 58)"/>
      <path d="M44 92c-4-6 2-10-2-14M58 92c4-6-2-10 2-14" stroke="#fff6d0" stroke-width="1.200" stroke-dasharray="2 2.400" fill="none" opacity=".8"/>
      <path class="fG" d="M4 90c8-6 12-2 18-6 6 4 10 2 16 6v6H4zM66 90c8-4 14-4 20 0l10-2v8H66z"/>
      ${GL(20, 40, 8)}${GL(82, 36, 8)}${GL(12, 64, 7)}${GL(88, 68, 7)}${GL(70, 10, 7)}${GL(34, 8, 7)}${GL(52, 18, 6)}
      <circle class="fY" cx="20" cy="40" r="2.400"/><circle class="fL" cx="82" cy="36" r="2.400"/><circle class="fK" cx="12" cy="64" r="2.200"/><circle class="fT" cx="88" cy="68" r="2.200"/><circle class="fY" cx="70" cy="10" r="2.200"/><circle class="fL" cx="34" cy="8" r="2.200"/><circle class="fK" cx="52" cy="18" r="1.800"/>
      <ellipse cx="20" cy="56" rx="14" ry="3" class="fW" opacity=".6"/><ellipse cx="82" cy="52" rx="12" ry="3" class="fW" opacity=".55"/>`
  },

  // ---------------------------------------------------------------- Whisper Whale
  'sky-whale': {
    scene: `<rect width="100" height="108" fill="url(#gSTwi)"/>${STARS([[12, 14, 2.4], [34, 8, 1.2], [60, 16, 2], [86, 10, 2.4], [92, 38, 1.2], [8, 40, 1.2], [48, 30, 1.2]])}
      <ellipse cx="20" cy="76" rx="30" ry="9" fill="#fff" opacity=".5"/><ellipse cx="78" cy="70" rx="28" ry="8" fill="#fff" opacity=".45"/><ellipse cx="50" cy="94" rx="52" ry="12" fill="#fff" opacity=".6"/><ellipse cx="10" cy="100" rx="30" ry="9" fill="#ffe8d0" opacity=".7"/>`,
    hero: `<ellipse cx="50" cy="94" rx="36" ry="4" fill="#2a1f5a" opacity=".25"/>
      <ellipse cx="22" cy="86" rx="18" ry="6" class="fW" opacity=".9"/><ellipse cx="78" cy="88" rx="18" ry="6" class="fW" opacity=".9"/>
      <path class="fP" d="M80 44c6-8 8-18 4-26 8 2 14 10 12 20 4-6 4-14 0-20 8 8 8 22 0 32z"/>
      <path class="fP" d="M6 52c0-18 18-30 42-28 16 2 28 10 32 24-4 4-10 8-18 8-8 12-24 16-40 12-12-4-16-12-16-16z"/>
      <path class="fL" d="M12 60c6 12 22 18 40 14 12-3 20-8 26-14-4 10-12 18-28 20-20 3-34-6-38-20z"/>
      <path class="sh" d="M48 24c16 2 28 10 32 24-4 4-10 8-18 8 6-12 0-26-14-32z" opacity=".5"/>
      <path class="fB" d="M46 58c-10 8-18 10-24 6 4 8 16 10 26 4z"/><path class="sh" d="M46 58c-10 8-18 10-24 6 6 0 14-2 20-8z" opacity=".5"/>
      <path d="M18 48q4 3 8 0" stroke="#2a1f5a" stroke-width="1.600" fill="none"/><path d="M10 60c4 3 10 4 16 3" stroke="#2a1f5a" stroke-width="1.200" fill="none"/>
      <ellipse class="hl" cx="36" cy="32" rx="10" ry="3" transform="rotate(-8 36 32)"/>
      <path d="M26 24c-2-6 2-10 6-12M30 14c4-2 8 0 8 4" stroke="#fff" stroke-width="1.400" fill="none" stroke-dasharray="1 2.600" stroke-linecap="round"/>
      ${S4(30, 8, 4, 'fY')}${S4(44, 14, 3, 'fW')}${S4(18, 14, 2.600, 'fK')}${S4(88, 60, 3.600, 'fY')}${S4(10, 76, 3, 'fW')}<circle class="hl" cx="92" cy="40" r="1.200"/><circle class="hl" cx="64" cy="40" r="1"/>
      <path d="M6 22q4-3 8 0q4-3 8 0M76 14q3-2 6 0q3-2 6 0" stroke="#5a3a7a" stroke-width=".9" fill="none"/>`
  },

  // ---------------------------------------------------------------- Moonwhisper Dragon
  'moon-dragon': {
    scene: `<rect width="100" height="108" fill="url(#gSMoon)"/>${MOON(66, 34, 19)}${STARS([[12, 14, 2.4], [30, 30, 1.2], [88, 12, 2.4], [90, 60, 1.2], [8, 52, 1.2], [44, 10, 1.2]])}
      <ellipse cx="20" cy="78" rx="32" ry="9" fill="#fff" opacity=".3"/><ellipse cx="82" cy="88" rx="32" ry="9" fill="#fff" opacity=".35"/><path d="M0 98c20-4 40-2 60-4 20-2 30 0 40-2v16H0z" fill="#fff" opacity=".28"/>`,
    hero: `<ellipse cx="50" cy="94" rx="34" ry="3.400" fill="#04162e" opacity=".3"/>
      <path d="M78 88C42 90 16 74 30 58S72 56 66 40 40 26 32 26" stroke="#0e6f80" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M78 88C42 90 16 74 30 58S72 56 66 40 40 26 32 26" stroke="#2fb8b8" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M78 88C42 90 16 74 30 58S72 56 66 40 40 26 32 26" stroke="#8ae8d8" stroke-width="2.200" fill="none" stroke-linecap="round" transform="translate(0 -2)" opacity=".8"/>
      <path d="M78 88C42 90 16 74 30 58S72 56 66 40 40 26 32 26" stroke="#e8fff6" stroke-width="3" fill="none" stroke-dasharray="1 7.500" stroke-linecap="round" opacity=".85"/>
      <path class="fA" d="M82 92l10-6-4 10zM84 84l10-10-2 12z" opacity=".9"/>
      <path class="fK" d="M60 52c-6-4-8-10-4-14 2 4 6 6 10 6zM38 66c-8-2-12-8-8-12 2 4 6 6 10 6z" opacity=".95"/>
      <path class="fT" d="M12 28C12 16 24 8 36 12l10 6-6 12-14 6C16 38 12 34 12 28z"/><path class="fC" d="M10 32c2 6 8 8 14 6l10-8c-8 4-16 4-24 2z"/>
      <path class="fK" d="M30 12c4-4 10-6 14-4-2 6-6 8-10 8zM24 14c-2-6 0-10 4-12 0 6 2 8 6 10z"/>
      <path d="M20 12C14 6 8 6 4 10M30 10C28 4 22 2 18 4" stroke="#ffe27a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M12 34c-6 2-8 8-6 14M18 38c-2 6 0 10 4 12" stroke="#fff" stroke-width="1.100" fill="none" stroke-linecap="round" opacity=".9"/>
      <ellipse class="fY" cx="26" cy="22" rx="3.400" ry="2.400"/><ellipse class="ink" cx="26.500" cy="22" rx="1.200" ry="1.800"/><circle class="hl" cx="25" cy="21" r=".8"/>
      <path d="M12 30l2 1.500" stroke="#0e6f80" stroke-width="1.200"/>
      ${GL(8, 46, 9)}<circle class="fW" cx="8" cy="46" r="4"/><circle class="hl" cx="7" cy="45" r="1.200"/>
      ${S4(88, 24, 4, 'fY')}${S4(92, 52, 3, 'fW')}${S4(14, 78, 3, 'fY')}`
  },

  // ---------------------------------------------------------------- Stormkeeper Ram
  'thundering-ram': {
    scene: `<rect width="100" height="108" fill="url(#gSStorm)"/>
      <ellipse cx="22" cy="14" rx="30" ry="12" fill="#2a2a5a" opacity=".9"/><ellipse cx="74" cy="10" rx="32" ry="13" fill="#34346a" opacity=".9"/><ellipse cx="50" cy="26" rx="40" ry="10" fill="#4a4a86" opacity=".7"/>
      <path d="M60 24l-8 16h8l-10 22 22-28h-9l8-10z" fill="#fff2a0" opacity=".85"/><path d="M12 30l-4 10h5l-6 12 14-16h-6l4-6z" fill="#fff2a0" opacity=".5"/>
      <path d="M20 40l-3 14M36 44l-3 14M52 46l-3 14M68 44l-3 14M84 42l-3 14M10 64l-3 14M28 68l-3 14M60 66l-3 14M78 64l-3 14" stroke="#cfd6ff" stroke-width=".7" opacity=".5"/>
      <path d="M0 88c20-10 40-6 56-12 18 8 30 4 44 10v22H0z" fill="#3a3a6a"/><path d="M0 98c24-6 48-4 100-2v12H0z" fill="#2a2a50"/>`,
    hero: `<ellipse cx="50" cy="94" rx="36" ry="4" fill="#0a0a2a" opacity=".4"/>
      <path class="fN" d="M34 74l2 16h6l-1-16zM64 74l2 16h6l-1-16z"/><path class="fS" d="M34 90h8v3h-9zM66 90h8v3h-9z"/>
      <circle class="fC" cx="48" cy="58" r="14"/><circle class="fC" cx="62" cy="54" r="15"/><circle class="fC" cx="74" cy="62" r="12"/><circle class="fC" cx="56" cy="68" r="14"/><circle class="fC" cx="40" cy="68" r="10"/><circle class="fC" cx="70" cy="72" r="10"/>
      <path class="sh" d="M44 76c10 6 28 4 38-4-2 10-10 16-22 16-10 0-16-4-16-12z" opacity=".5"/>
      <path class="fN" d="M16 46c0-8 8-12 14-10l8 4-2 14c-4 6-14 6-18-2z"/><path class="fS" d="M14 50c2 5 6 7 11 6l6-5c-6 2-12 1-17-1z"/>
      <ellipse class="ink" cx="14.500" cy="50" rx="1.400" ry="1"/><circle class="fW" cx="27" cy="43" r="2.200"/><circle class="ink" cx="27.600" cy="43.200" r="1.100"/><path class="fN" d="M34 38l6-8-1 12z"/>
      <path d="M32 40C20 34 14 20 26 14c12-4 18 8 10 14-4 2-8 0-8-4" stroke="#f0d28a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M32 40C20 34 14 20 26 14c12-4 18 8 10 14-4 2-8 0-8-4" stroke="#fff3c8" stroke-width="1.400" fill="none" stroke-linecap="round" transform="translate(-1 -1)"/>
      <path d="M38 38C52 34 62 22 54 14c-10-6-20 4-14 12 3 4 7 2 8-1" stroke="#d8b46a" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>
      <path class="fY" d="M14 6l-6 14h6l-8 18 18-22h-8l6-10z"/><path class="fY" d="M84 8l-5 11h5l-7 15 15-18h-7l5-8z"/>
      ${GL(20, 10, 9)}${GL(86, 14, 9)}${S4(70, 20, 3.400, 'fY')}${S4(40, 8, 2.600, 'fW')}${S4(92, 40, 3, 'fY')}
      <ellipse class="fS" cx="34" cy="14" rx="26" ry="9" opacity=".9"/><ellipse class="fS" cx="72" cy="10" rx="22" ry="8" opacity=".85"/><path class="sh" d="M10 18c10 6 40 6 50-2-4 8-14 10-26 10-10 0-20-2-24-8z" opacity=".6"/>`
  },

  // ---------------------------------------------------------------- Starless Koi
  'void-koi': {
    scene: `<rect width="100" height="108" fill="url(#gSVoid)"/>${STARS([[12, 14, 2.4], [36, 8, 1.2], [64, 16, 2], [88, 10, 2.4], [92, 38, 1.2], [8, 36, 1.2], [50, 26, 1.4]])}
      <ellipse cx="50" cy="66" rx="46" ry="14" fill="none" stroke="#b9a4f0" stroke-width=".8" opacity=".5"/><ellipse cx="50" cy="66" rx="34" ry="9" fill="none" stroke="#b9a4f0" stroke-width=".8" opacity=".4"/><ellipse cx="50" cy="66" rx="22" ry="5" fill="none" stroke="#b9a4f0" stroke-width=".8" opacity=".35"/>
      <ellipse cx="14" cy="92" rx="14" ry="5" class="fG" opacity=".8"/><ellipse cx="88" cy="96" rx="14" ry="5" class="fG" opacity=".75"/><path d="M0 84c16-4 30 2 50 0s34-4 50 0v24H0z" fill="#4a3a8a" opacity=".5"/>`,
    hero: `<ellipse cx="50" cy="92" rx="36" ry="4" fill="#05061a" opacity=".35"/>
      <path class="fP" d="M36 36c8-14 22-14 32 0-8-3-16-3-22 2z" opacity=".9"/>
      <path class="fD" d="M10 52C22 30 52 26 72 42c8 6 16 6 22 2-4 8-6 14-4 26-8-6-16-6-24-2C48 82 20 76 10 52z"/>
      <path class="fP" d="M72 42c8 6 16 6 22 2-4 8-6 14-4 26-8-6-16-6-24-2 6-8 6-18 6-26z" opacity=".9"/>
      <path d="M78 48l12-2M80 56l10 0M80 64l10 4" stroke="#e8c8ff" stroke-width=".8" opacity=".8" fill="none"/>
      <path class="fP" d="M38 64c-6 8-8 14-4 18 8-2 12-8 14-14z" opacity=".9"/>
      <path class="sh" d="M10 52C22 30 52 26 72 42 58 38 30 44 10 52z" opacity=".5"/>
      ${S4(30, 50, 4, 'fW')}${S4(46, 44, 3, 'fW')}${S4(58, 56, 3.600, 'fW')}${S4(40, 62, 2.600, 'fY')}${S4(24, 60, 2.200, 'fW')}<circle fill="#fff" cx="52" cy="66" r="1"/><circle fill="#fff" cx="34" cy="42" r=".9"/><circle fill="#fff" cx="64" cy="48" r=".9"/>
      ${GL(19, 48, 10)}<circle class="fW" cx="19" cy="48" r="4.600"/><circle class="fY" cx="19" cy="48" r="3"/><circle class="ink" cx="19" cy="48" r="1.400"/><circle class="hl" cx="17.500" cy="46.500" r="1"/>
      <path d="M10 54c-6 2-8 8-6 14M12 58c-5 4-5 10-2 14" stroke="#e8c8ff" stroke-width="1.200" fill="none" stroke-linecap="round"/>
      <path d="M8 52c3 3 7 4 11 3" stroke="#e8c8ff" stroke-width=".9" fill="none"/>
      ${S4(88, 20, 4, 'fY')}${S4(10, 22, 3, 'fW')}${S4(92, 82, 3, 'fW')}<circle class="hl" cx="70" cy="14" r="1.200"/>`
  },

  // ---------------------------------------------------------------- Drowsy Leviathan
  'sunken-leviathan': {
    scene: `<rect width="100" height="108" fill="url(#gSDeep)"/>${RAYS(.3)}
      <path d="M62 70l8-16 6 6 6-10v34H58z" fill="#0a2a46" opacity=".8"/><path d="M70 54v-12M70 48l12 4" stroke="#0a2a46" stroke-width="1.500" fill="none"/>
      ${BU(14, 60, 3)}${BU(24, 36, 2)}${BU(88, 44, 2.600)}${BU(80, 22, 1.600)}${BU(8, 20, 1.400)}${SEAFLOOR}`,
    hero: `<ellipse cx="50" cy="94" rx="40" ry="4" fill="#031a30" opacity=".4"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M26 62C10 66 6 78 14 88c6 4 12-2 8-8" stroke="#7a4fd0" stroke-width="7"/><path d="M36 66C26 76 26 88 38 92c6 0 6-8 0-8" stroke="#7a4fd0" stroke-width="7"/>
      <path d="M50 68C50 80 52 90 60 92c6-2 4-10-2-8" stroke="#7a4fd0" stroke-width="7"/><path d="M62 66C72 74 76 86 70 92c-6 2-10-4-6-8" stroke="#7a4fd0" stroke-width="7"/>
      <path d="M72 60C86 62 94 72 88 84c-4 4-12 0-10-6" stroke="#7a4fd0" stroke-width="7"/>
      <path d="M26 62C10 66 6 78 14 88M36 66C26 76 26 88 38 92M62 66C72 74 76 86 70 92M72 60C86 62 94 72 88 84" stroke="#cfaaff" stroke-width="2" opacity=".7"/></g>
      <circle class="fW" cx="12" cy="80" r="1.200"/><circle class="fW" cx="18" cy="86" r="1.200"/><circle class="fW" cx="30" cy="82" r="1.200"/><circle class="fW" cx="60" cy="90" r="1.200"/><circle class="fW" cx="76" cy="84" r="1.200"/><circle class="fW" cx="90" cy="78" r="1.200"/>
      <path class="fP" d="M24 46C24 18 76 18 76 46c0 12-12 20-26 20S24 58 24 46z"/><path class="sh" d="M50 18c18 0 26 14 26 28 0 12-12 20-26 20 10-8 14-30 0-48z" opacity=".6"/>
      <ellipse class="hl" cx="38" cy="30" rx="9" ry="3.200" transform="rotate(-24 38 30)"/>
      <circle class="fK" cx="34" cy="46" r="3" opacity=".7"/><circle class="fK" cx="66" cy="46" r="3" opacity=".7"/>
      <path d="M36 44q5 4 10 0M54 44q5 4 10 0" stroke="#2a1a5a" stroke-width="1.800" fill="none"/><path d="M46 54q4 3 8 0" stroke="#2a1a5a" stroke-width="1.200" fill="none"/>
      <circle class="fA" cx="26" cy="90" r="3"/><circle class="fA" cx="34" cy="94" r="2.400"/><circle class="fA" cx="80" cy="94" r="2.800"/><circle class="fA" cx="88" cy="90" r="2"/>
      <text x="74" y="26" font-size="9" font-weight="700" fill="#e8d8ff" font-family="sans-serif">z</text><text x="82" y="16" font-size="6.500" font-weight="700" fill="#e8d8ff" font-family="sans-serif" opacity=".8">z</text>
      ${BU(14, 40, 3)}${BU(86, 34, 2.400)}${BU(20, 22, 1.600)}`
  },

  // ---------------------------------------------------------------- Briar King
  'bramble-king': {
    scene: `<rect width="100" height="108" fill="url(#gSRose)"/>
      <path d="M0 0c10 14 6 26 14 40S8 74 14 108H0zM100 0c-10 14-6 26-14 40s6 34 0 68h14z" fill="#1a0f26" opacity=".7"/>
      <path d="M20 108V60M80 108V50" stroke="#1a0f26" stroke-width="7" opacity=".6"/>
      ${GL(50, 40, 24)}<path d="M0 90c20-8 40-6 52-10 16 6 34 4 48 8v20H0z" fill="#2a4a3a" opacity=".85"/><path d="M0 100c30-6 60-4 100 0v8H0z" fill="#1a3a2a"/>
      <circle cx="14" cy="30" r="1.600" fill="#ff9aa8"/><circle cx="86" cy="22" r="1.600" fill="#ff9aa8"/><circle cx="26" cy="64" r="1.400" fill="#ff9aa8"/><circle cx="76" cy="70" r="1.400" fill="#ff9aa8"/><circle cx="60" cy="12" r="1.400" fill="#ff9aa8"/>`,
    hero: `<ellipse cx="50" cy="94" rx="38" ry="4" fill="#12071c" opacity=".4"/>
      <g fill="none" stroke-linecap="round"><path d="M10 92C2 76 14 66 8 52S14 30 8 18" stroke="#2f7a3a" stroke-width="5"/><path d="M90 92c8-16-4-26 2-40s-6-22 0-34" stroke="#2f7a3a" stroke-width="5"/><path d="M10 92C2 76 14 66 8 52" stroke="#7fd070" stroke-width="1.300"/></g>
      <path class="fG" d="M8 70l-6-2 6-2zM12 52l-6-3 7-1zM12 34l-7-3 8-1zM92 66l6-2-6-2zM88 46l7-3-8-1zM90 28l7-3-8-1z"/>
      <circle class="fR" cx="9" cy="22" r="5"/><circle class="fR" cx="9" cy="22" r="2.600" opacity=".6"/><circle class="fR" cx="91" cy="26" r="5"/><circle class="fR" cx="91" cy="26" r="2.600" opacity=".6"/><circle class="fR" cx="10" cy="62" r="4"/><circle class="fR" cx="90" cy="60" r="4"/>
      <path class="fG" d="M20 90c4-6 8-8 14-6 6-2 10 0 14 6zM52 90c4-6 8-8 14-6 6-2 10 0 14 6z"/>
      <path class="fG" d="M28 62c-4 14-2 26 6 30l16 2 16-2c8-4 10-16 6-30z"/><path class="sh" d="M50 62h22c4 14 2 26-6 30l-16 2z" opacity=".6"/>
      <path d="M32 74c6 8 10 12 18 14M68 74c-6 8-10 12-18 14M40 70c4 8 6 12 10 14M60 70c-4 8-6 12-10 14" stroke="#2f7a3a" stroke-width="2.200" fill="none" stroke-linecap="round"/>
      <path class="fG" d="M30 74l-5 2 5 1zM36 84l-5 3 6 0zM70 74l5 2-5 1zM64 84l5 3-6 0z"/>
      <path class="fU" d="M26 44c0-14 10-22 24-22s24 8 24 22c0 14-10 24-24 24S26 58 26 44z"/><path class="sh" d="M50 22c14 0 24 8 24 22 0 14-10 24-24 24 8-14 8-34 0-46z" opacity=".5"/>
      <path d="M36 42q5-3 10 0M54 42q5-3 10 0" stroke="#3a2a33" stroke-width="2.200" fill="none" stroke-linecap="round"/><circle class="fY" cx="41" cy="45" r="1.600"/><circle class="fY" cx="59" cy="45" r="1.600"/>
      <path d="M44 56c4 3 8 3 12 0" stroke="#3a2a33" stroke-width="1.600" fill="none" stroke-linecap="round"/><path d="M50 46v6" stroke="#b8905a" stroke-width="1.800" stroke-linecap="round"/>
      <path class="fG" d="M30 34c-6 2-10 8-8 14 6-2 8-8 8-14zM70 34c6 2 10 8 8 14-6-2-8-8-8-14z"/>
      <path class="fA" d="M24 26l4-14 9 9 7-15 7 15 9-9 4 14z"/><path class="sh" d="M50 6l7 15 9-9 4 14H50z" opacity=".35"/><rect class="fA" x="24" y="24" width="52" height="6" rx="2"/>
      <circle class="fR" cx="38" cy="27" r="2.200"/><circle class="fB" cx="50" cy="27" r="2.200"/><circle class="fR" cx="62" cy="27" r="2.200"/><circle class="hl" cx="37.500" cy="26.200" r=".7"/>
      <circle class="fY" cx="28" cy="12" r="1.400"/><circle class="fY" cx="44" cy="6" r="1.400"/><circle class="fY" cx="57" cy="6" r="1.400"/><circle class="fY" cx="72" cy="12" r="1.400"/>
      ${S4(88, 8, 3, 'fY')}${S4(12, 8, 2.600, 'fW')}`
  },

  // ---------------------------------------------------------------- Starfall (spell)
  starfall: {
    scene: `<rect width="100" height="108" fill="url(#gSVoid)"/>${STARS([[10, 10, 2.4], [30, 20, 1.2], [52, 8, 2], [76, 26, 2.4], [90, 52, 1.2], [6, 48, 1.2], [44, 38, 1.2], [66, 12, 1.2], [20, 60, 1.2]])}
      <path d="M96 0L50 70 44 64z" fill="#fff2a0" opacity=".12"/><path d="M80 0L40 62 36 58z" fill="#fff2a0" opacity=".1"/>
      <path d="M0 84c14-12 28-8 40-14 16 8 30 4 60 14v24H0z" fill="#2a2470"/><path d="M0 96c20-6 40-4 56-8 16 4 30 2 44 4v16H0z" fill="#1a1650"/>
      <circle cx="18" cy="90" r="1.800" fill="#ff9ad0"/><circle cx="30" cy="94" r="1.600" fill="#ffe27a"/><circle cx="74" cy="92" r="1.800" fill="#ff9ad0"/><circle cx="86" cy="96" r="1.600" fill="#7de0ff"/>`,
    hero: `<ellipse cx="38" cy="92" rx="30" ry="4" fill="#0a0a30" opacity=".4"/>
      <path d="M40 60L96 4 98 12 50 74z" fill="url(#gCone)"/><path d="M40 60L84 2 90 4 50 72z" fill="#fff2a0" opacity=".45"/>
      <path d="M52 52L92 18M56 62L98 38M46 48L72 14" stroke="#ffe27a" stroke-width="1.600" stroke-linecap="round" opacity=".7"/>
      ${GL(38, 66, 30)}${S4(38, 66, 24, 'fA')}${S4(38, 66, 13, 'fY')}<circle class="fW" cx="38" cy="66" r="4"/>
      ${S4(78, 36, 5, 'fY')}${S4(66, 22, 4, 'fW')}${S4(88, 50, 4, 'fY')}${S4(18, 36, 4, 'fW')}${S4(12, 54, 3, 'fY')}${S4(86, 74, 3.400, 'fW')}${S4(56, 82, 3, 'fK')}
      <circle class="hl" cx="70" cy="46" r="1.300"/><circle class="hl" cx="82" cy="22" r="1.100"/><circle class="hl" cx="26" cy="44" r="1.100"/><circle class="hl" cx="8" cy="72" r="1"/>
      <ellipse cx="38" cy="90" rx="22" ry="3.600" fill="url(#gGlow)"/>`
  },

  // ---------------------------------------------------------------- Forgotten Wyrm
  'deep-wyrm': {
    scene: `<rect width="100" height="108" fill="url(#gSCave)"/>
      <path d="M0 0h100v14l-10 10-8-8-10 14-8-12-10 16-10-14-10 14-8-12-10 10-8-10z" fill="#0e0a20"/>
      <path d="M0 108V70l10-14 8 16 8-26 8 20 8-8v50zM100 108V64l-10-18-8 22-8-22-8 18-8-8v52z" fill="#140f2c" opacity=".9"/>
      <path d="M18 100l6-24 6 24zM74 100l5-20 5 20z" fill="#7348cc" opacity=".8"/><path d="M26 104l5-18 5 18z" fill="#86ccff" opacity=".8"/>
      ${GL(22, 86, 14)}${GL(76, 88, 14)}<path d="M0 98c20-6 36-2 50-6s32 2 50-2v18H0z" fill="#1a3a46"/>`,
    hero: `<ellipse cx="50" cy="94" rx="40" ry="4" fill="#06041a" opacity=".45"/>
      <path class="fP" d="M6 90l7-26 7 26zM80 92l6-20 6 20z"/><path class="fB" d="M16 92l5-16 5 16zM90 92l4-12 4 12z"/><path class="sh" d="M13 64l7 26h-5z" opacity=".5"/>
      <path d="M82 84C48 94 14 82 22 62S70 56 72 40 46 22 30 28" stroke="#1d5a3c" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M82 84C48 94 14 82 22 62S70 56 72 40 46 22 30 28" stroke="#4aa86a" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M82 84C48 94 14 82 22 62S70 56 72 40 46 22 30 28" stroke="#b8f0b0" stroke-width="2.600" fill="none" stroke-linecap="round" transform="translate(-1 -3)" opacity=".7"/>
      <path d="M82 84C48 94 14 82 22 62S70 56 72 40 46 22 30 28" stroke="#e8ffd8" stroke-width="3" fill="none" stroke-dasharray="1 8" stroke-linecap="round" opacity=".6" transform="translate(0 2)"/>
      <path class="fG" d="M30 78c8 6 18 6 26 4-2 4-8 6-14 6-8 0-12-4-12-10zM56 54c8-2 14-6 16-12-2 8-8 14-14 16zM36 34c8 0 14 2 18 6-8 0-14-2-18-6z" opacity=".9"/>
      <path class="fA" d="M80 78l4-10 3 9zM70 68l8-6 0 9zM74 50l8-4-2 9zM60 38l6-8 2 9zM44 32l4-9 4 7z" opacity=".95"/>
      <path class="fN" d="M12 26C10 14 22 6 34 10l12 6-8 14-16 6C18 38 12 34 12 26z"/><path class="fG" d="M10 28c2 8 10 12 18 10l14-10c-10 6-22 6-32 0z"/>
      <path class="fA" d="M30 10c4-6 10-8 16-6-3 6-8 8-12 8zM22 12c-3-7 0-12 6-13 0 6 2 10 6 12z"/>
      <path d="M12 30c-6 2-8 8-6 14M16 34c-3 6-1 10 3 12" stroke="#e8ffd8" stroke-width="1.100" fill="none" stroke-linecap="round" opacity=".9"/>
      <path d="M22 22q3-3 8 0" stroke="#3a2a33" stroke-width="1.100" fill="none"/><path d="M22 23q4 3 8 0" fill="#ffb938"/><path d="M22 23q4-2 8 0" stroke="#3a2a33" stroke-width="1" fill="none"/>
      ${GL(8, 52, 8)}${S4(88, 22, 3, 'fW')}${S4(12, 70, 3, 'fY')}<circle class="hl" cx="92" cy="40" r="1.100"/>`
  },

  // ---------------------------------------------------------------- Rook's Ace
  'rooks-ace': {
    scene: `<rect width="100" height="108" fill="url(#gSStage)"/>
      <path d="M0 0h18c-2 30-6 60-18 108zM100 0H82c2 30 6 60 18 108z" fill="#3a0a1c" opacity=".85"/><path d="M0 0h8c-2 24-4 46-8 80zM100 0h-8c2 24 4 46 8 80z" fill="#220510" opacity=".7"/>
      <path d="M44 0h12l30 100H14z" fill="url(#gRay)" opacity=".5"/>
      <path d="M0 92h100v16H0z" fill="#6a2a1a"/><path d="M0 92h100" stroke="#e8b46a" stroke-width="1.200"/>
      ${S4(30, 22, 3, 'fY')}${S4(72, 30, 2.600, 'fY')}${S4(60, 14, 2, 'fW')}${S4(22, 50, 2, 'fW')}${S4(80, 56, 2.200, 'fW')}`,
    hero: `<ellipse cx="50" cy="94" rx="38" ry="4" fill="#2a0510" opacity=".4"/>
      <g transform="rotate(-14 34 52)"><rect class="fW" x="14" y="22" width="40" height="56" rx="5"/><rect x="14" y="22" width="40" height="56" rx="5" fill="none" stroke="#c9d6e4" stroke-width="1"/>
      <path class="ink" d="M34 34c-8 6-12 12-8 16 2 2 5 1 7-1-1 4-2 6-4 8h10c-2-2-3-4-4-8 2 2 5 3 7 1 4-4 0-10-8-16z" transform="translate(0 2)"/><path class="ink" d="M20 28l2 5-2 1-2-1zM48 72l2 5-2 1-2-1z" opacity=".7"/></g>
      <g transform="rotate(10 66 54)"><path class="fY" d="M44 22c4-4 12-6 22-6s18 2 22 6c2 14 0 26-6 36-4 6-10 10-16 12-6-2-12-6-16-12-6-10-8-22-6-36z"/><path class="sh" d="M66 16c10 0 18 2 22 6 2 14 0 26-6 36-4 6-10 10-16 12 8-16 8-38 0-54z" opacity=".4"/>
      <path class="ink" d="M52 38q5-4 10 0 0 5-5 6-5-1-5-6zM70 38q5-4 10 0 0 5-5 6-5-1-5-6z"/><path d="M52 52c4 10 20 10 24 0" stroke="#3a2a33" stroke-width="2.200" fill="none" stroke-linecap="round"/><circle class="fK" cx="50" cy="48" r="3.400" opacity=".6"/><circle class="fK" cx="82" cy="48" r="3.400" opacity=".6"/><ellipse class="hl" cx="56" cy="26" rx="6" ry="2.200" transform="rotate(-20 56 26)"/></g>
      <g transform="rotate(-8 42 70)"><path class="fP" d="M24 52c4-4 12-6 22-6s18 2 22 6c2 14 0 26-6 36-4 6-10 10-16 12-6-2-12-6-16-12-6-10-8-22-6-36z" transform="translate(-4 -2) scale(.92)"/>
      <path class="ink" d="M26 70q5 3 10 0 0-5-5-6-5 1-5 6zM46 70q5 3 10 0 0-5-5-6-5 1-5 6z" transform="translate(-2 -4)"/><path d="M28 86c4-8 18-8 24 0" stroke="#3a2a33" stroke-width="2.200" fill="none" stroke-linecap="round" transform="translate(-2 -4)"/></g>
      <path class="fK" d="M44 18c-6 4-8 10-6 16M70 14c6 4 8 10 6 16" stroke="#ff9ad0" stroke-width="2.600" fill="none" stroke-linecap="round"/>
      ${S4(10, 30, 4, 'fY')}${S4(90, 28, 4.600, 'fY')}${S4(94, 62, 3, 'fW')}${S4(8, 66, 3, 'fW')}<circle class="hl" cx="84" cy="10" r="1.200"/><circle class="hl" cx="14" cy="12" r="1.200"/>`
  },

  // ---------------------------------------------------------------- The Dreaming Tree
  'world-tree': {
    scene: `<rect width="100" height="108" fill="url(#gSN)"/>${MOON(78, 24, 10)}${STARS([[12, 14, 2.4], [32, 8, 1.2], [56, 16, 2], [90, 46, 1.2], [8, 40, 1.2], [44, 30, 1.2], [68, 44, 1.2]])}
      <path d="M0 80c14-12 26-8 40-14 14 6 26 4 40-6 10 4 16 8 20 10v38H0z" fill="#2a3a7a" opacity=".85"/><path d="M0 92c20-8 38-4 54-10 16 6 30 4 46 8v18H0z" fill="#1c2a5a"/>
      <circle cx="16" cy="70" r="1.600" fill="#fff6b0"/><circle cx="84" cy="66" r="1.600" fill="#fff6b0"/><circle cx="26" cy="84" r="1.400" fill="#fff6b0"/><circle cx="74" cy="82" r="1.400" fill="#fff6b0"/><circle cx="50" cy="96" r="1.400" fill="#fff6b0"/>
      ${GL(16, 70, 6)}${GL(84, 66, 6)}${GL(26, 84, 5)}${GL(74, 82, 5)}`,
    hero: `<ellipse cx="50" cy="94" rx="40" ry="4" fill="#0a1030" opacity=".4"/>
      <path class="fN" d="M42 40c2 20 0 34-8 50h32c-8-16-10-30-8-50z"/><path class="sh" d="M54 40c2 20 0 34 6 50h6c-8-16-10-30-8-50z" opacity=".5"/>
      <path class="fN" d="M34 90c-8 2-18 2-26 6M66 90c8 2 18 2 26 6M40 92c-4 4-8 6-16 8M60 92c4 4 8 6 16 8" stroke="#6a4125" stroke-width="3.400" fill="none" stroke-linecap="round"/>
      <path d="M44 62q3 2 6 0M54 62q3 2 6 0" stroke="#3a2a33" stroke-width="1.400" fill="none" stroke-linecap="round"/><path d="M48 70q3 2 6 0" stroke="#3a2a33" stroke-width="1.100" fill="none" stroke-linecap="round"/>
      <path d="M42 40C32 30 24 24 16 24M58 40c10-10 18-16 26-16M50 40V20" stroke="#6a4125" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle class="fG" cx="22" cy="34" r="16"/><circle class="fG" cx="40" cy="22" r="18"/><circle class="fG" cx="60" cy="20" r="18"/><circle class="fG" cx="78" cy="32" r="16"/><circle class="fG" cx="50" cy="38" r="18"/><circle class="fT" cx="30" cy="46" r="10"/><circle class="fT" cx="70" cy="46" r="10"/>
      <path class="sh" d="M10 44c10 10 70 10 80 0 0 10-14 16-30 16H40C24 60 10 54 10 44z" opacity=".5"/>
      <ellipse class="hl" cx="36" cy="14" rx="9" ry="3" transform="rotate(-18 36 14)"/><ellipse class="hl" cx="68" cy="14" rx="7" ry="2.600" transform="rotate(-12 68 14)"/>
      ${S4(30, 30, 4, 'fW')}${S4(52, 20, 3, 'fY')}${S4(72, 34, 4, 'fW')}${S4(44, 40, 3, 'fW')}${S4(62, 44, 2.600, 'fK')}${S4(22, 42, 2.600, 'fY')}
      <path d="M30 44v10M46 48v8M66 46v12M80 40v10" stroke="#e8d8a0" stroke-width=".8"/>
      ${GL(30, 56, 8)}${GL(46, 58, 8)}${GL(66, 60, 8)}${GL(80, 52, 7)}<circle class="fY" cx="30" cy="56" r="3.200"/><circle class="fY" cx="46" cy="58" r="3.200"/><circle class="fA" cx="66" cy="60" r="3.400"/><circle class="fY" cx="80" cy="52" r="3"/>
      <circle class="hl" cx="29" cy="55" r=".9"/><circle class="hl" cx="45" cy="57" r=".9"/><circle class="hl" cx="65" cy="59" r=".9"/>
      <path class="fG" d="M12 94l3-10 4 10zM84 94l3-10 4 10z"/>`
  },

  // ---------------------------------------------------------------- Lullaby Kraken
  kraken: {
    scene: `<rect width="100" height="108" fill="url(#gSDeep)"/>${RAYS(.3)}
      ${MOON(80, 14, 7)}<path d="M64 0h24L96 100H56z" fill="#fff6d6" opacity=".08"/>
      ${NOTE(14, 44, 1.200, '#d8c8ff')}${NOTE(84, 62, 1, '#d8c8ff')}${NOTE(26, 74, .9, '#b8a4f0')}
      ${BU(10, 64, 2.600)}${BU(90, 38, 2)}${BU(20, 24, 1.600)}${BU(76, 80, 1.600)}${SEAFLOOR}`,
    hero: `<ellipse cx="50" cy="94" rx="38" ry="4" fill="#031a30" opacity=".4"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M38 62C24 66 12 62 10 50c-2-8 8-10 8-4" stroke="#7a4fd0" stroke-width="6"/><path d="M42 66C30 74 20 86 28 92c6 2 10-4 6-8" stroke="#7a4fd0" stroke-width="6"/>
      <path d="M50 68C46 80 50 90 58 92c6-2 4-10-2-8" stroke="#7a4fd0" stroke-width="6"/><path d="M58 66C70 74 80 86 72 92c-6 2-10-4-6-8" stroke="#7a4fd0" stroke-width="6"/>
      <path d="M62 62C76 66 88 62 90 50c2-8-8-10-8-4" stroke="#7a4fd0" stroke-width="6"/>
      <path d="M38 62C24 66 12 62 10 50M42 66C30 74 20 86 28 92M62 62C76 66 88 62 90 50M58 66C70 74 80 86 72 92" stroke="#d8baff" stroke-width="1.600" opacity=".7"/></g>
      <circle class="fW" cx="14" cy="60" r="1.100"/><circle class="fW" cx="22" cy="66" r="1.100"/><circle class="fW" cx="78" cy="66" r="1.100"/><circle class="fW" cx="86" cy="60" r="1.100"/><circle class="fW" cx="30" cy="84" r="1.100"/><circle class="fW" cx="70" cy="84" r="1.100"/>
      <path class="fK" d="M34 34L16 44l16 6zM66 34l18 10-16 6z"/><path class="sh" d="M66 34l18 10-16 6z" opacity=".4"/>
      <path class="fP" d="M50 4C66 16 72 34 64 54c-2 6-8 10-14 10s-12-4-14-10C28 34 34 16 50 4z"/><path class="sh" d="M50 4c16 12 22 30 14 50-2 6-8 10-14 10 8-20 8-40 0-60z" opacity=".5"/>
      <ellipse class="hl" cx="42" cy="22" rx="3.600" ry="9" transform="rotate(18 42 22)"/>
      <circle class="fK" cx="40" cy="54" r="3.200" opacity=".7"/><circle class="fK" cx="60" cy="54" r="3.200" opacity=".7"/>
      <path d="M38 50q4 3 8 0M54 50q4 3 8 0" stroke="#2a1a5a" stroke-width="1.700" fill="none"/>
      ${NOTE(20, 30, 1.300, '#fff')}${NOTE(80, 26, 1.100, '#fff')}${NOTE(86, 44, .9, '#fff')}${S4(12, 14, 3, 'fY')}${S4(90, 78, 3, 'fW')}
      ${BU(10, 78, 2.400)}${BU(92, 62, 2)}${BU(18, 18, 1.600)}`
  },

  // ---------------------------------------------------------------- Regent of Sleep (foe)
  'night-regent': {
    scene: `<rect width="100" height="108" fill="url(#gSVoid)"/>${MOON(26, 30, 15)}${STARS([[60, 10, 2.4], [84, 20, 2], [92, 50, 1.2], [8, 60, 1.2], [46, 16, 1.2], [70, 44, 1.2], [14, 8, 1.2]])}
      <ellipse cx="20" cy="82" rx="32" ry="10" fill="#6a5ab0" opacity=".5"/><ellipse cx="82" cy="88" rx="30" ry="9" fill="#8a7ac8" opacity=".5"/><ellipse cx="50" cy="100" rx="56" ry="12" fill="#9a8ad0" opacity=".6"/>`,
    hero: `<ellipse cx="50" cy="94" rx="30" ry="3.600" fill="#05061a" opacity=".4"/>
      <path class="fN" d="M34 54C20 44 6 52 2 74c10-6 18-6 28-2z"/><path class="fN" d="M66 54c14-10 28-2 32 20-10-6-18-6-28-2z"/>
      <path d="M26 56c-8 2-14 8-18 16M30 62c-6 4-10 10-12 16M74 56c8 2 14 8 18 16M70 62c6 4 10 10 12 16" stroke="#e8c27a" stroke-width="1.300" fill="none" stroke-linecap="round" opacity=".8"/>
      <path class="fU" d="M34 44c0-14 32-14 32 0v34c0 12-32 12-32 0z"/><path class="fC" d="M40 58c0 12 4 20 10 22 6-2 10-10 10-22-6 4-14 4-20 0z"/>
      <path d="M42 62c4 4 12 4 16 0M42 68c4 4 12 4 16 0M44 74c4 3 8 3 12 0" stroke="#d0b088" stroke-width=".9" fill="none"/>
      <path class="sh" d="M50 32c14 0 16 14 16 20v26c0 8-10 12-16 12 6-14 6-40 0-58z" opacity=".4"/>
      <path class="fN" d="M34 34l-4-14 12 8zM66 34l4-14-12 8z"/>
      <circle class="fC" cx="40" cy="44" r="10"/><circle class="fC" cx="60" cy="44" r="10"/><path class="fU" d="M36 40c4-8 24-8 28 0-4 0-8-2-14-2s-10 2-14 2z" opacity=".4"/>
      <path d="M35 44q5 4 10 0M55 44q5 4 10 0" stroke="#3a2a33" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="fA" d="M46 50l4 7 4-7z"/>
      <path class="fA" d="M32 28l4-12 8 8 6-14 6 14 8-8 4 12z"/><rect class="fA" x="32" y="26" width="36" height="5" rx="1.600"/><circle class="fR" cx="42" cy="28.500" r="1.800"/><circle class="fB" cx="50" cy="28.500" r="1.800"/><circle class="fR" cx="58" cy="28.500" r="1.800"/>
      <path class="fN" d="M36 92l-4-10h12zM64 92l4-10H56z"/><path class="fA" d="M30 94h14M56 94h14" stroke="#e3a012" stroke-width="2.200" stroke-linecap="round"/>
      <text x="76" y="30" font-size="8" font-weight="700" fill="#e8d8ff" font-family="sans-serif">z</text><text x="84" y="20" font-size="6" font-weight="700" fill="#e8d8ff" font-family="sans-serif" opacity=".8">z</text>
      ${S4(12, 20, 3.400, 'fY')}${S4(90, 56, 3, 'fW')}${S4(8, 44, 2.600, 'fW')}`
  },

  // ---------------------------------------------------------------- Slow Leviathan (foe)
  'tide-leviathan': {
    scene: `<rect width="100" height="108" fill="url(#gSStormSea)"/>
      <ellipse cx="22" cy="14" rx="28" ry="9" fill="#5a7a9a" opacity=".7"/><ellipse cx="76" cy="10" rx="30" ry="10" fill="#4a6a8a" opacity=".7"/>
      ${MOON(80, 30, 8)}
      <path d="M0 56c10-5 20 5 30 0s20-5 30 0 28 4 40-2v54H0z" fill="#2f7a92" opacity=".75"/><path d="M0 72c12-6 24 6 36 0s24-6 36 0 20 4 28 0v36H0z" fill="#1f5a78"/>
      <path d="M0 88c14-6 28 6 42 0s30-6 58 0v20H0z" fill="#14405c"/>`,
    hero: `<ellipse cx="50" cy="94" rx="42" ry="4" fill="#031a30" opacity=".35"/>
      <path class="fT" d="M10 74C8 46 28 22 54 22c20 0 34 14 36 34 0 10-4 18-10 22z"/>
      <path class="fC" d="M20 76c2-10 10-18 22-22 14-4 28-2 40 6-4 8-10 14-18 16z" opacity=".95"/>
      <path d="M26 72c10-4 22-6 34-4M34 66c8-2 18-2 28 0M44 60c6-1 14 0 20 2" stroke="#cdb892" stroke-width=".9" fill="none" opacity=".7"/>
      <path class="sh" d="M54 22c20 0 34 14 36 34 0 10-4 18-10 22-2-30-12-50-26-56z" opacity=".5"/>
      <ellipse class="hl" cx="40" cy="32" rx="12" ry="3.600" transform="rotate(-18 40 32)"/>
      <path d="M26 52q5 4 10 0" stroke="#0a2f46" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 66c6 4 14 5 22 3" stroke="#0a2f46" stroke-width="1.400" fill="none"/>
      <circle class="fC" cx="62" cy="34" r="2.600"/><circle class="fC" cx="70" cy="40" r="2"/><circle class="fC" cx="56" cy="44" r="1.800"/><circle class="fC" cx="76" cy="50" r="2.200"/><circle class="fC" cx="66" cy="52" r="1.600"/>
      <path d="M52 22c-4-8-2-14 4-16M60 20c0-8 4-12 10-12" stroke="#bfefff" stroke-width="2.200" fill="none" stroke-linecap="round" opacity=".85"/>
      <path class="fW" d="M0 80c8-6 16 4 24-2 8-6 16 4 24-2s16 4 24-2 16 4 28-2v20H0z"/><path class="fB" d="M0 90c10-6 20 4 30-2s20 4 30-2 20 4 40-2v8H0z" opacity=".85"/>
      <path class="fW" d="M6 84c4-4 8-2 10 2M34 82c4-4 8-2 10 2M66 84c4-4 8-2 10 2" opacity=".9"/>
      ${BU(88, 70, 2.600)}${BU(12, 64, 2)}${S4(92, 22, 3, 'fW')}${S4(8, 26, 2.600, 'fY')}`
  }
});
window.FA_ORDER2 = ['aurora-stag', 'deep-current', 'mountain-heart', 'sky-whale', 'moon-dragon', 'thundering-ram', 'void-koi', 'sunken-leviathan', 'bramble-king', 'starfall', 'deep-wyrm', 'rooks-ace', 'world-tree', 'kraken', 'night-regent', 'tide-leviathan'];
