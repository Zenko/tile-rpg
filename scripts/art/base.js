/* Shared pieces for the clean gradient art: gradient fills, class names and small drawing helpers.
   Every shape in a drawing takes its fill from a class: fR red, fO orange, fY yellow, fG green, fT teal, fB blue, fP purple, fK pink, fN brown, fC cream,
   fW white, fS slate, fD navy, fA gold, fU tan, fL lilac, fE charcoal, fM mint, fV maroon, fI ink, fH hair brown, fSk skin, fGr light grey, fPk blush.
   Plus: sh (soft shadow overlay), hl (white highlight), ink (flat dark detail). Drawings live on a 24 x 24 grid and are cropped to their own bounds
   when rendered, so they always fill the picture. See scripts/build-art.js. */
const DEFS = `<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8277"/><stop offset="1" stop-color="#d12e45"/></linearGradient>
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
<linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a8294"/><stop offset="1" stop-color="#2b2f3a"/></linearGradient>
<linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2f5d8"/><stop offset="1" stop-color="#4fc99a"/></linearGradient>
<linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d95a74"/><stop offset="1" stop-color="#7a1d3c"/></linearGradient>
<linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#454b6e"/><stop offset="1" stop-color="#181b2e"/></linearGradient>
<linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6a46"/><stop offset="1" stop-color="#4a2a18"/></linearGradient>
<linearGradient id="gSk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdcb8"/><stop offset="1" stop-color="#eeac7c"/></linearGradient>
<linearGradient id="gGr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f6"/><stop offset="1" stop-color="#aab4c4"/></linearGradient>
<linearGradient id="gPk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0e0"/><stop offset="1" stop-color="#f08ab0"/></linearGradient>`;
const CSS = `.fR{fill:url(#gR)}.fO{fill:url(#gO)}.fY{fill:url(#gY)}.fG{fill:url(#gG)}.fT{fill:url(#gT)}.fB{fill:url(#gB)}.fP{fill:url(#gP)}.fK{fill:url(#gK)}
.fN{fill:url(#gN)}.fC{fill:url(#gC)}.fW{fill:url(#gW)}.fS{fill:url(#gS)}.fD{fill:url(#gD)}.fA{fill:url(#gA)}.fU{fill:url(#gU)}.fL{fill:url(#gL)}
.sh{fill:rgba(40,20,70,.2)}.hl{fill:#fff;opacity:.72}.ink{fill:#3a2a33}
svg{display:block;overflow:visible}svg path,svg circle,svg ellipse{stroke-linecap:round;stroke-linejoin:round}
.fE{fill:url(#gE)}.fM{fill:url(#gM)}.fV{fill:url(#gV)}.fI{fill:url(#gI)}.fH{fill:url(#gH)}.fSk{fill:url(#gSk)}.fGr{fill:url(#gGr)}.fPk{fill:url(#gPk)}
`;
const star = (x, y, r, cls) => `<path class="${cls}" d="M${x} ${y - r}l${r * .28} ${r * .72} ${r * .72} ${r * .28}-${r * .72} ${r * .28}-${r * .28} ${r * .72}-${r * .28}-${r * .72}-${r * .72}-${r * .28} ${r * .72}-${r * .28}z"/>`;
const glow = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gGlow)"/>`;
const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .25}" fill="#fff" opacity=".85"/>`;
// a shiny highlight blob: x, y, rx, ry, rotation
const shine = (x, y, rx, ry, rot) => `<ellipse class="hl" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot || 0} ${x} ${y})"/>`;
module.exports = { DEFS, CSS, star, glow, bubble, shine };
