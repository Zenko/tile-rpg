// Sprite sheet: every game icon as an inline SVG <symbol>, referenced elsewhere via <use href="#id">.
// Kept as same-document markup (written in place via document.write from this script tag) rather than a
// separate .svg file, because Chromium does not support <use> referencing symbols in an external SVG document -
// only same-document fragment references (#id) work reliably. This is still its own file, so replacing the art
// later means editing just this one: swap the symbol contents, keep the ids the same, and nothing else changes.
document.write(`<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs><symbol id="s-oak" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="19" ry="5" style="fill:var(--tshadow);"/>
  <rect x="28" y="38" width="9" height="20" rx="3.5" style="fill:var(--trunk);"/>
  <circle cx="19" cy="35" r="13" style="fill:var(--leaf1);"/><circle cx="45" cy="35" r="13" style="fill:var(--leaf1);"/>
  <circle cx="32" cy="24" r="17" style="fill:var(--leaf2);"/>
  <circle cx="25" cy="19" r="6.5" style="fill:var(--leaf3);"/><circle cx="41" cy="31" r="4.5" style="fill:var(--leaf3);opacity:.55"/></symbol><symbol id="s-oak2" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="19" ry="5" style="fill:var(--tshadow);"/>
  <rect x="28" y="40" width="8" height="18" rx="3.5" style="fill:var(--trunk);"/>
  <circle cx="22" cy="34" r="14" style="fill:var(--leaf2);"/><circle cx="42" cy="32" r="15" style="fill:var(--leaf1);"/>
  <circle cx="30" cy="22" r="15" style="fill:var(--leaf2);"/>
  <circle cx="36" cy="17" r="6" style="fill:var(--leaf3);"/><circle cx="19" cy="38" r="4" style="fill:var(--leaf3);opacity:.5"/></symbol><symbol id="s-pine" viewBox="0 0 64 64">
  <ellipse cx="32" cy="59" rx="16" ry="4.5" style="fill:var(--tshadow);"/>
  <rect x="29" y="50" width="7" height="10" rx="2" style="fill:var(--trunk);"/>
  <polygon points="32,3 47,25 17,25" style="fill:var(--pine2);"/>
  <polygon points="32,13 51,39 13,39" style="fill:var(--pine1);"/>
  <polygon points="32,25 55,54 9,54" style="fill:var(--pine2);"/>
  <polygon points="32,25 32,54 9,54" style="fill:var(--pine1);opacity:.35"/></symbol><symbol id="s-hedge" viewBox="0 0 64 64">
  <ellipse cx="32" cy="55" rx="27" ry="5" style="fill:var(--tshadow);"/>
  <rect x="6" y="24" width="52" height="30" rx="14" style="fill:var(--leaf1);"/>
  <circle cx="18" cy="30" r="10" style="fill:var(--leaf2);"/><circle cx="34" cy="27" r="11" style="fill:var(--leaf2);"/><circle cx="48" cy="31" r="9" style="fill:var(--leaf2);"/>
  <circle cx="22" cy="27" r="3.5" style="fill:var(--leaf3);"/><circle cx="40" cy="25" r="3" style="fill:var(--leaf3);"/>
  <circle cx="30" cy="36" r="2" style="fill:var(--flower1);"/><circle cx="46" cy="38" r="2" style="fill:var(--flower2);"/><circle cx="14" cy="40" r="2" style="fill:var(--flower3);"/></symbol><symbol id="s-rock" viewBox="0 0 64 64">
  <ellipse cx="32" cy="55" rx="24" ry="5" style="fill:var(--tshadow);"/>
  <path d="M10 52 Q7 34 22 27 Q35 21 46 30 Q58 39 54 52 Z" style="fill:var(--stone);"/>
  <path d="M22 27 Q35 21 46 30 Q38 32 30 36 Q24 32 22 27Z" style="fill:var(--stone3);"/>
  <path d="M40 54 Q42 46 50 46 Q58 48 57 54 Z" style="fill:var(--stone2);"/></symbol><symbol id="s-flowers" viewBox="0 0 64 64">
  <g style="fill:var(--leaf2);"><ellipse cx="18" cy="44" rx="6" ry="2.4"/><ellipse cx="42" cy="50" rx="6" ry="2.4"/><ellipse cx="30" cy="30" rx="6" ry="2.4"/></g>
  <circle cx="16" cy="40" r="5" style="fill:var(--flower1);"/><circle cx="16" cy="40" r="1.8" style="fill:var(--flower2);"/>
  <circle cx="40" cy="46" r="5" style="fill:var(--flower2);"/><circle cx="40" cy="46" r="1.8" style="fill:var(--flower1);"/>
  <circle cx="30" cy="26" r="4.5" style="fill:var(--flower3);"/><circle cx="30" cy="26" r="1.6" style="fill:var(--flower2);"/>
  <circle cx="50" cy="30" r="3.5" style="fill:var(--flower1);"/><circle cx="10" cy="26" r="3.2" style="fill:var(--flower3);"/></symbol><symbol id="s-tuft" viewBox="0 0 64 64">
  <path d="M16 44 q2 -10 5 0 M22 44 q3 -13 6 0 M28 44 q2 -8 4 0" style="fill:none;stroke:var(--tuft);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;"/>
  <path d="M44 24 q2 -8 4 0 M49 24 q3 -10 5 0" style="fill:none;stroke:var(--tuft);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"/></symbol><symbol id="s-pebbles" viewBox="0 0 64 64">
  <ellipse cx="18" cy="20" rx="3.4" ry="2.4" style="fill:var(--path-dot);"/><ellipse cx="44" cy="30" rx="2.6" ry="1.9" style="fill:var(--path-dot);"/>
  <ellipse cx="26" cy="48" rx="3" ry="2.1" style="fill:var(--path-dot);"/><ellipse cx="50" cy="52" rx="2.2" ry="1.6" style="fill:var(--path-dot);"/></symbol><symbol id="s-ripple" viewBox="0 0 64 64">
  <path d="M10 22 q6 -5 12 0 t12 0" style="fill:none;stroke:var(--water2);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;"/><path d="M28 46 q6 -5 12 0 t12 0" style="fill:none;stroke:var(--water2);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;"/></symbol><symbol id="s-bridge" viewBox="0 0 64 64">
  <rect x="9" y="-2" width="46" height="68" style="fill:var(--plank);"/>
  <g style="stroke:var(--plank2);stroke-width:2"><path d="M9 8H55M9 18H55M9 28H55M9 38H55M9 48H55M9 58H55"/></g>
  <rect x="5" y="-2" width="6" height="68" rx="2" style="fill:var(--trunk);"/><rect x="53" y="-2" width="6" height="68" rx="2" style="fill:var(--trunk);"/></symbol><symbol id="s-bridge-l" viewBox="0 0 64 64">
  <rect x="9" y="-2" width="56" height="68" style="fill:var(--plank);"/>
  <g style="stroke:var(--plank2);stroke-width:2"><path d="M9 8H64M9 18H64M9 28H64M9 38H64M9 48H64M9 58H64"/></g>
  <rect x="5" y="-2" width="6" height="68" rx="2" style="fill:var(--trunk);"/></symbol><symbol id="s-bridge-r" viewBox="0 0 64 64">
  <rect x="-1" y="-2" width="56" height="68" style="fill:var(--plank);"/>
  <g style="stroke:var(--plank2);stroke-width:2"><path d="M0 8H55M0 18H55M0 28H55M0 38H55M0 48H55M0 58H55"/></g>
  <rect x="53" y="-2" width="6" height="68" rx="2" style="fill:var(--trunk);"/></symbol><symbol id="s-cobble" viewBox="0 0 64 64">
  <g style="fill:var(--path-edge);opacity:.5"><rect x="4" y="5" width="26" height="24" rx="8"/><rect x="34" y="5" width="26" height="24" rx="8"/><rect x="4" y="35" width="26" height="24" rx="8"/><rect x="34" y="35" width="26" height="24" rx="8"/></g></symbol><symbol id="p-fountain" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="27" ry="5" style="fill:var(--tshadow);"/>
  <ellipse cx="32" cy="46" rx="27" ry="13" style="fill:var(--stone2);"/><ellipse cx="32" cy="43" rx="27" ry="12" style="fill:var(--stone);"/>
  <ellipse cx="32" cy="42" rx="21" ry="8.5" style="fill:var(--water);"/><ellipse cx="32" cy="41" rx="15" ry="5" style="fill:var(--water2);opacity:.6"/>
  <rect x="29" y="20" width="6" height="22" rx="2" style="fill:var(--stone);"/><ellipse cx="32" cy="20" rx="11" ry="3.6" style="fill:var(--stone3);"/>
  <path d="M32 18 q-9 -9 -13 4 M32 18 q9 -9 13 4 M32 18 v-9" style="fill:none;stroke:var(--water2);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;"/><circle cx="32" cy="8" r="2.2" style="fill:var(--water2);"/></symbol><symbol id="p-well" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="22" ry="4.5" style="fill:var(--tshadow);"/>
  <rect x="13" y="32" width="38" height="24" rx="7" style="fill:var(--stone);"/><ellipse cx="32" cy="33" rx="19" ry="6.5" style="fill:var(--stone3);"/><ellipse cx="32" cy="33" rx="14" ry="4.2" style="fill:var(--well-in);"/>
  <rect x="15" y="12" width="5" height="26" rx="2" style="fill:var(--trunk);"/><rect x="44" y="12" width="5" height="26" rx="2" style="fill:var(--trunk);"/>
  <polygon points="9,15 32,2 55,15" style="fill:var(--roof);"/><polygon points="9,15 55,15 51,19 13,19" style="fill:var(--roof2);"/>
  <path d="M32 16 V30" style="stroke:var(--trunk);stroke-width:1.8"/><rect x="29" y="29" width="6" height="5" rx="1.5" style="fill:var(--plank2);"/></symbol><symbol id="p-bench" viewBox="0 0 64 64">
  <ellipse cx="32" cy="56" rx="24" ry="4" style="fill:var(--tshadow);"/>
  <rect x="10" y="26" width="44" height="7" rx="3" style="fill:var(--plank);"/><rect x="9" y="35" width="46" height="8" rx="3" style="fill:var(--plank2);"/>
  <rect x="14" y="43" width="5" height="11" rx="1.5" style="fill:var(--trunk);"/><rect x="45" y="43" width="5" height="11" rx="1.5" style="fill:var(--trunk);"/></symbol><symbol id="p-lamp" viewBox="0 0 64 64">
  <ellipse cx="32" cy="59" rx="10" ry="3.5" style="fill:var(--tshadow);"/>
  <circle cx="32" cy="17" r="17" style="fill:var(--lamp);opacity:.22"/>
  <rect x="30" y="22" width="4" height="36" rx="1.5" style="fill:var(--stone2);"/><rect x="26" y="52" width="12" height="6" rx="2" style="fill:var(--stone2);"/>
  <rect x="24" y="8" width="16" height="15" rx="4" style="fill:var(--lamp);"/><polygon points="22,9 32,1 42,9" style="fill:var(--stone2);"/></symbol><symbol id="p-sign" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="12" ry="3.5" style="fill:var(--tshadow);"/>
  <rect x="30" y="26" width="5" height="32" rx="1.5" style="fill:var(--trunk);"/>
  <rect x="10" y="10" width="44" height="22" rx="5" style="fill:var(--plank);"/><rect x="10" y="10" width="44" height="22" rx="5" style="fill:none;stroke:var(--plank2);stroke-width:2"/>
  <rect x="17" y="17" width="30" height="3" rx="1.5" style="fill:var(--plank2);"/><rect x="21" y="23" width="22" height="3" rx="1.5" style="fill:var(--plank2);"/></symbol><symbol id="g-grave" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="20" ry="5" style="fill:var(--tshadow);"/>
  <ellipse cx="32" cy="52" rx="19" ry="7" style="fill:var(--stone2);"/><ellipse cx="32" cy="50" rx="16" ry="5.5" style="fill:var(--leaf1);"/>
  <path d="M21 50 V25 a11 11 0 0 1 22 0 V50 Z" style="fill:var(--stone);"/>
  <path d="M21 50 V25 a11 11 0 0 1 11 -11 V50 Z" style="fill:var(--stone2);opacity:.35"/>
  <rect x="30" y="20" width="4" height="15" rx="1.5" style="fill:var(--stone2);"/><rect x="25.5" y="25" width="13" height="4" rx="1.5" style="fill:var(--stone2);"/>
  <circle cx="16" cy="53" r="2.4" style="fill:var(--flower1);"/><circle cx="49" cy="54" r="2.4" style="fill:var(--flower2);"/><circle cx="12" cy="56" r="1.8" style="fill:var(--flower3);"/></symbol><symbol id="g-grave-boss" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="23" ry="5.5" style="fill:var(--tshadow);"/>
  <ellipse cx="32" cy="52" rx="22" ry="7.5" style="fill:var(--stone2);"/><ellipse cx="32" cy="50" rx="19" ry="6" style="fill:var(--leaf1);"/>
  <path d="M19 50 V22 a13 13 0 0 1 26 0 V50 Z" style="fill:var(--stone);"/>
  <path d="M19 50 V22 a13 13 0 0 1 13 -13 V50 Z" style="fill:var(--stone2);opacity:.35"/>
  <polygon points="24,25 27,17 32,22 37,17 40,25" style="fill:var(--lamp);"/><rect x="24" y="25" width="16" height="3.5" rx="1.5" style="fill:var(--lamp);"/>
  <rect x="30" y="31" width="4" height="13" rx="1.5" style="fill:var(--stone2);"/><rect x="26" y="35" width="12" height="3.5" rx="1.5" style="fill:var(--stone2);"/>
  <circle cx="13" cy="53" r="2.6" style="fill:var(--flower1);"/><circle cx="51" cy="54" r="2.6" style="fill:var(--flower2);"/><circle cx="9" cy="57" r="2" style="fill:var(--flower3);"/><circle cx="55" cy="57" r="2" style="fill:var(--flower1);"/></symbol><symbol id="b-cottage" viewBox="0 0 128 128">
  <ellipse cx="64" cy="122" rx="54" ry="6" style="fill:var(--tshadow);"/>
  <rect x="16" y="52" width="96" height="68" rx="4" style="fill:var(--wall);"/><rect x="16" y="108" width="96" height="12" rx="3" style="fill:var(--wall2);"/>
  <rect x="86" y="14" width="13" height="30" rx="2" style="fill:var(--stone2);"/><rect x="83" y="11" width="19" height="6" rx="2" style="fill:var(--stone);"/>
  <polygon points="6,60 64,8 122,60" style="fill:var(--roof);"/><polygon points="6,60 122,60 114,48 14,48" style="fill:var(--roof2);"/>
  <rect x="21" y="78" width="22" height="42" rx="11" style="fill:var(--door);"/><circle cx="37" cy="100" r="2" style="fill:var(--lamp);"/>
  <rect x="72" y="72" width="28" height="24" rx="4" style="fill:var(--window);"/><path d="M86 72V96M72 84H100" style="stroke:var(--wall2);stroke-width:2.6"/>
  <rect x="69" y="97" width="34" height="7" rx="2" style="fill:var(--trunk);"/>
  <circle cx="76" cy="96" r="3.2" style="fill:var(--flower1);"/><circle cx="86" cy="95" r="3.2" style="fill:var(--flower2);"/><circle cx="96" cy="96" r="3.2" style="fill:var(--flower1);"/></symbol><symbol id="b-nook" viewBox="0 0 128 128">
  <ellipse cx="64" cy="122" rx="54" ry="6" style="fill:var(--tshadow);"/>
  <rect x="14" y="50" width="100" height="70" rx="4" style="fill:var(--wall);"/><rect x="14" y="108" width="100" height="12" rx="3" style="fill:var(--wall2);"/>
  <polygon points="4,58 64,6 124,58" style="fill:var(--roof);"/><polygon points="4,58 124,58 116,46 12,46" style="fill:var(--roof2);"/>
  <circle cx="64" cy="34" r="10" style="fill:var(--window);"/><circle cx="64" cy="34" r="10" style="fill:none;stroke:var(--wall);stroke-width:3"/>
  <rect x="85" y="78" width="22" height="42" rx="11" style="fill:var(--door);"/><circle cx="91" cy="100" r="2" style="fill:var(--lamp);"/>
  <rect x="22" y="72" width="22" height="26" rx="11" style="fill:var(--window);"/><path d="M33 72V98" style="stroke:var(--wall2);stroke-width:2.4"/>
  <rect x="50" y="76" width="26" height="20" rx="3" style="fill:var(--window);"/><path d="M63 76V96" style="stroke:var(--wall2);stroke-width:2.4"/>
  <rect x="94" y="62" width="24" height="10" rx="2" style="fill:var(--plank);"/><rect x="98" y="66" width="16" height="2" style="fill:var(--plank2);"/>
  <rect x="20" y="102" width="8" height="10" rx="1" style="fill:var(--flower1);"/><rect x="30" y="100" width="6" height="12" rx="1" style="fill:var(--leaf1);"/><rect x="38" y="103" width="7" height="9" rx="1" style="fill:var(--roof);"/></symbol><symbol id="b-bakery" viewBox="0 0 192 128">
  <ellipse cx="96" cy="122" rx="86" ry="6" style="fill:var(--tshadow);"/>
  <rect x="14" y="56" width="164" height="64" rx="4" style="fill:var(--wall);"/><rect x="14" y="108" width="164" height="12" rx="3" style="fill:var(--wall2);"/>
  <rect x="140" y="12" width="14" height="34" rx="2" style="fill:var(--stone2);"/><rect x="137" y="9" width="20" height="6" rx="2" style="fill:var(--stone);"/>
  <polygon points="6,62 96,14 186,62" style="fill:var(--roof);"/><polygon points="6,62 186,62 176,50 16,50" style="fill:var(--roof2);"/>
  <g><rect x="16" y="66" width="160" height="16" style="fill:var(--wall);"/>
   <g style="fill:var(--roof);"><rect x="16" y="66" width="20" height="16"/><rect x="56" y="66" width="20" height="16"/><rect x="96" y="66" width="20" height="16"/><rect x="136" y="66" width="20" height="16"/></g>
   <path d="M16 82 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0" style="fill:var(--roof);opacity:.9"/></g>
  <rect x="85" y="80" width="22" height="40" rx="11" style="fill:var(--door);"/><circle cx="101" cy="101" r="2" style="fill:var(--lamp);"/>
  <rect x="24" y="88" width="50" height="22" rx="4" style="fill:var(--window);"/><rect x="120" y="88" width="50" height="22" rx="4" style="fill:var(--window);"/>
  <ellipse cx="42" cy="104" rx="9" ry="4.5" style="fill:var(--bread);"/><ellipse cx="58" cy="104" rx="8" ry="4" style="fill:var(--bread);"/><ellipse cx="140" cy="104" rx="9" ry="4.5" style="fill:var(--bread);"/><ellipse cx="156" cy="104" rx="8" ry="4" style="fill:var(--bread);"/></symbol><symbol id="b-cellar" viewBox="0 0 128 128">
  <ellipse cx="64" cy="122" rx="56" ry="6" style="fill:var(--tshadow);"/>
  <path d="M6 120 Q4 62 38 36 Q64 14 90 36 Q124 62 122 120 Z" style="fill:var(--stone);"/>
  <path d="M6 120 Q4 62 38 36 Q64 14 90 36 Q124 62 122 120 Q108 92 96 84 Q64 66 32 84 Q18 92 6 120Z" style="fill:var(--stone2);opacity:.35"/>
  <path d="M20 58 Q64 4 108 58 Q64 40 20 58Z" style="fill:var(--leaf2);"/><path d="M34 44 Q64 16 94 44 Q64 34 34 44Z" style="fill:var(--leaf3);opacity:.7"/>
  <path d="M40 120 V84 Q40 60 64 60 Q88 60 88 84 V120 Z" style="fill:var(--stone3);"/>
  <path d="M46 120 V86 Q46 66 64 66 Q82 66 82 86 V120 Z" style="fill:var(--cellar-in);"/>
  <rect x="26" y="70" width="4" height="22" rx="1.5" style="fill:var(--trunk);"/><circle cx="28" cy="96" r="7" style="fill:var(--lamp);opacity:.3"/><rect x="24" y="90" width="8" height="10" rx="2.5" style="fill:var(--lamp);"/>
  <circle cx="20" cy="98" r="5" style="fill:var(--leaf1);"/><circle cx="106" cy="100" r="6" style="fill:var(--leaf1);"/><circle cx="102" cy="96" r="2.4" style="fill:var(--flower1);"/></symbol>
/* ---- your cottage as a room (js/home-room.js): furniture and floor grain, drawn like the props above. Colours come from the .hr-room tokens in css/latest.css. ---- */
<symbol id="r-plank-a" viewBox="0 0 64 64"><g style="fill:none;stroke:#000;stroke-width:1.5;opacity:.16"><path d="M0 21H64M0 42H64"/></g><ellipse cx="14" cy="10" rx="3" ry="1.6" style="fill:#000;opacity:.12"/><ellipse cx="46" cy="52" rx="2.6" ry="1.4" style="fill:#000;opacity:.12"/></symbol>
<symbol id="r-plank-b" viewBox="0 0 64 64"><g style="fill:none;stroke:#000;stroke-width:1.5;opacity:.16"><path d="M0 21H64M0 42H64"/></g><ellipse cx="48" cy="30" rx="3" ry="1.6" style="fill:#000;opacity:.12"/><ellipse cx="18" cy="54" rx="2.6" ry="1.4" style="fill:#000;opacity:.12"/></symbol>
<symbol id="r-window" viewBox="0 0 64 96">
  <rect x="12" y="20" width="40" height="52" rx="4" style="fill:var(--plank2);"/><rect x="16" y="24" width="32" height="44" rx="2" style="fill:var(--sky);"/>
  <path d="M32 24V68M16 46H48" style="stroke:var(--plank2);stroke-width:3"/><circle cx="24" cy="34" r="3.2" style="fill:#fff;opacity:.55"/>
  <rect x="7" y="18" width="12" height="32" rx="5" style="fill:var(--roof);"/><rect x="45" y="18" width="12" height="32" rx="5" style="fill:var(--roof);"/>
  <rect x="9" y="72" width="46" height="6" rx="2.5" style="fill:var(--plank);"/></symbol>
<symbol id="r-sconce" viewBox="0 0 64 96">
  <circle cx="32" cy="46" r="20" style="fill:var(--lamp);opacity:.22"/>
  <rect x="26" y="52" width="12" height="4" rx="2" style="fill:var(--stone2);"/><rect x="22" y="56" width="20" height="5" rx="2" style="fill:var(--stone2);"/>
  <rect x="26" y="36" width="12" height="16" rx="4" style="fill:var(--lamp);"/><polygon points="24,37 32,29 40,37" style="fill:var(--stone2);"/></symbol>
<symbol id="r-clock" viewBox="0 0 64 96">
  <circle cx="32" cy="52" r="15" style="fill:var(--wall);"/><circle cx="32" cy="52" r="15" style="fill:none;stroke:var(--plank2);stroke-width:3.4"/>
  <path d="M32 52V43M32 52L38 56" style="fill:none;stroke:var(--trunk);stroke-width:2.2;stroke-linecap:round"/><circle cx="32" cy="52" r="1.8" style="fill:var(--trunk);"/></symbol>
<symbol id="r-shelf" viewBox="0 0 64 96">
  <ellipse cx="32" cy="90" rx="25" ry="4" style="fill:var(--tshadow);"/>
  <rect x="9" y="18" width="46" height="72" rx="4" style="fill:var(--plank);"/><rect x="13" y="22" width="38" height="64" rx="2" style="fill:var(--door);"/>
  <rect x="13" y="43" width="38" height="4" style="fill:var(--plank);"/><rect x="13" y="65" width="38" height="4" style="fill:var(--plank);"/>
  <g><rect x="15" y="28" width="5" height="15" rx="1" style="fill:var(--flower1);"/><rect x="21" y="30" width="5" height="13" rx="1" style="fill:var(--water2);"/><rect x="27" y="27" width="6" height="16" rx="1" style="fill:var(--flower2);"/><rect x="34" y="31" width="5" height="12" rx="1" style="fill:var(--leaf3);"/><rect x="40" y="28" width="6" height="15" rx="1" style="fill:var(--roof);"/></g>
  <circle cx="22" cy="58" r="6" style="fill:var(--wall);"/><rect x="31" y="50" width="9" height="15" rx="1.5" style="fill:var(--leaf2);"/><rect x="41" y="55" width="6" height="10" rx="1.5" style="fill:var(--flower3);"/>
  <g><rect x="15" y="74" width="9" height="12" rx="1" style="fill:var(--water2);"/><rect x="25" y="72" width="6" height="14" rx="1" style="fill:var(--flower1);"/><rect x="32" y="75" width="7" height="11" rx="1" style="fill:var(--flower2);"/><rect x="40" y="73" width="6" height="13" rx="1" style="fill:var(--leaf3);"/></g></symbol>
<symbol id="r-frames" viewBox="0 0 64 96">
  <path d="M24 28V34M43 40V46" style="stroke:var(--trunk);stroke-width:1.6;fill:none"/>
  <rect x="12" y="34" width="22" height="30" rx="3" style="fill:var(--lamp);"/><rect x="15" y="37" width="16" height="24" rx="1.5" style="fill:var(--flower1);"/><circle cx="23" cy="47" r="4.4" style="fill:#fff;opacity:.75"/><rect x="18" y="54" width="10" height="3" rx="1.5" style="fill:#fff;opacity:.55"/>
  <rect x="35" y="46" width="19" height="26" rx="3" style="fill:var(--lamp);"/><rect x="38" y="49" width="13" height="20" rx="1.5" style="fill:var(--water2);"/><circle cx="44.5" cy="57" r="3.6" style="fill:#fff;opacity:.75"/></symbol>
<symbol id="r-trophy" viewBox="0 0 64 96">
  <ellipse cx="32" cy="90" rx="25" ry="4" style="fill:var(--tshadow);"/>
  <rect x="10" y="18" width="44" height="72" rx="4" style="fill:var(--plank);"/><rect x="14" y="22" width="36" height="64" rx="2" style="fill:var(--door);"/>
  <rect x="14" y="22" width="36" height="64" rx="2" style="fill:#bfe0e6;opacity:.22"/>
  <rect x="14" y="43" width="36" height="3.5" style="fill:var(--plank);"/><rect x="14" y="65" width="36" height="3.5" style="fill:var(--plank);"/>
  <path d="M24 29H40L38 37H26Z" style="fill:var(--lamp);"/><rect x="30.5" y="37" width="3" height="4" style="fill:var(--lamp);"/><rect x="26" y="40" width="12" height="3" rx="1" style="fill:var(--lamp);"/>
  <circle cx="24" cy="57" r="5" style="fill:var(--lamp);"/><rect x="22" y="60" width="4" height="5" style="fill:var(--roof);"/><circle cx="39" cy="57" r="5" style="fill:var(--wall);"/>
  <path d="M18 72H29L28 80H19Z M35 74H46L45 82H36Z" style="fill:var(--lamp);"/><rect x="16" y="24" width="4" height="58" rx="2" style="fill:#fff;opacity:.12"/></symbol>
<symbol id="r-armchair" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="24" ry="4" style="fill:var(--tshadow);"/>
  <rect x="12" y="18" width="40" height="34" rx="11" style="fill:var(--roof2);"/>
  <rect x="7" y="32" width="12" height="23" rx="6" style="fill:var(--roof);"/><rect x="45" y="32" width="12" height="23" rx="6" style="fill:var(--roof);"/>
  <rect x="16" y="36" width="32" height="17" rx="7" style="fill:var(--roof);"/><rect x="19" y="22" width="26" height="16" rx="7" style="fill:var(--roof);"/>
  <rect x="21" y="39" width="22" height="9" rx="4.5" style="fill:var(--bread);"/>
  <rect x="13" y="54" width="5" height="5" rx="1.5" style="fill:var(--trunk);"/><rect x="46" y="54" width="5" height="5" rx="1.5" style="fill:var(--trunk);"/></symbol>
<symbol id="r-altar" viewBox="0 0 64 64">
  <circle cx="32" cy="14" r="20" style="fill:var(--lamp);opacity:.22"/>
  <ellipse cx="32" cy="58" rx="22" ry="4" style="fill:var(--tshadow);"/>
  <rect x="14" y="30" width="36" height="27" rx="5" style="fill:var(--stone);"/><rect x="10" y="26" width="44" height="10" rx="4" style="fill:var(--cloth);"/>
  <rect x="29" y="12" width="6" height="15" rx="2" style="fill:var(--flower3);"/><ellipse cx="32" cy="8" rx="3.2" ry="5.5" style="fill:var(--lamp);"/>
  <circle cx="19" cy="24" r="3.2" style="fill:var(--flower1);"/><ellipse cx="45" cy="25" rx="3.6" ry="2.6" style="fill:var(--stone3);"/></symbol>
<symbol id="r-sand" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="26" ry="4" style="fill:var(--tshadow);"/>
  <rect x="7" y="28" width="50" height="27" rx="7" style="fill:var(--plank2);"/><rect x="11" y="32" width="42" height="19" rx="4.5" style="fill:var(--wall);"/>
  <path d="M19 42q13-9 26 0M17 47q15-12 30 0" style="fill:none;stroke:var(--wall2);stroke-width:1.8;stroke-linecap:round"/>
  <ellipse cx="32" cy="41" rx="5.4" ry="3.6" style="fill:var(--stone);"/><ellipse cx="21" cy="37" rx="3" ry="2" style="fill:var(--stone3);"/></symbol>
<symbol id="r-bonsai" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="19" ry="4" style="fill:var(--tshadow);"/>
  <rect x="21" y="40" width="22" height="16" rx="4" style="fill:var(--roof);"/><rect x="19" y="37" width="26" height="6" rx="2.5" style="fill:var(--roof2);"/>
  <path d="M32 39q-7-10 1-20" style="fill:none;stroke:var(--trunk);stroke-width:3.6;stroke-linecap:round"/>
  <circle cx="33" cy="19" r="11" style="fill:var(--leaf1);"/><circle cx="22" cy="28" r="7.5" style="fill:var(--leaf2);"/><circle cx="44" cy="28" r="7.5" style="fill:var(--leaf2);"/><circle cx="30" cy="12" r="6.5" style="fill:var(--leaf3);"/></symbol>
<symbol id="r-basket" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="22" ry="4" style="fill:var(--tshadow);"/>
  <rect x="13" y="29" width="38" height="26" rx="9" style="fill:var(--plank);"/><rect x="13" y="29" width="38" height="8" rx="4" style="fill:var(--bread);"/>
  <path d="M22 38V54M32 38V54M42 38V54" style="stroke:var(--plank2);stroke-width:1.6;opacity:.6"/>
  <circle cx="24" cy="27" r="6.5" style="fill:var(--flower1);"/><rect x="33" y="17" width="12" height="12" rx="2.4" style="fill:var(--water2);"/></symbol>
<symbol id="r-mail" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="24" ry="4" style="fill:var(--tshadow);"/>
  <rect x="11" y="29" width="42" height="9" rx="3.5" style="fill:var(--plank);"/><rect x="14" y="36" width="36" height="20" rx="4" style="fill:var(--plank2);"/>
  <g transform="rotate(-9 26 24)"><rect x="17" y="17" width="17" height="12" rx="2" style="fill:var(--wall);"/><circle cx="25.5" cy="23" r="2.2" style="fill:var(--flower1);"/></g>
  <g transform="rotate(8 41 22)"><rect x="32" y="15" width="18" height="12" rx="2" style="fill:var(--flower3);"/><path d="M33 17l8 5 8-5" style="fill:none;stroke:var(--wall2);stroke-width:1.4"/></g></symbol>
<symbol id="r-door" viewBox="0 0 64 64"><rect x="8" y="4" width="48" height="60" rx="16" style="fill:var(--door);"/><rect x="13" y="9" width="38" height="55" rx="12" style="fill:var(--day);"/><path d="M13 44q19-9 38 0V64H13Z" style="fill:var(--leaf3);opacity:.55"/><rect x="13" y="9" width="10" height="55" rx="5" style="fill:#fff;opacity:.25"/></symbol>
<symbol id="r-mat" viewBox="0 0 64 64"><rect x="10" y="22" width="44" height="26" rx="7" style="fill:var(--roof2);"/><rect x="14" y="26" width="36" height="18" rx="5" style="fill:var(--roof);"/><path d="M20 32H44M20 38H44" style="stroke:var(--bread);stroke-width:2;stroke-linecap:round;opacity:.8"/></symbol>
<symbol id="r-toys" viewBox="0 0 64 64">
  <ellipse cx="18" cy="48" rx="8" ry="2.4" style="fill:var(--tshadow);"/><ellipse cx="44" cy="52" rx="8" ry="2.4" style="fill:var(--tshadow);"/>
  <g transform="rotate(-14 17 41)"><rect x="12" y="36" width="10" height="10" rx="2" style="fill:var(--flower1);"/></g><circle cx="44" cy="46" r="5.4" style="fill:var(--water2);"/>
  <g transform="rotate(12 36 30)"><rect x="31" y="25" width="10" height="10" rx="2" style="fill:var(--flower2);"/></g></symbol><symbol id="r-lamp" viewBox="0 0 64 96">
  <ellipse cx="32" cy="90" rx="15" ry="4" style="fill:var(--tshadow);"/>
  <circle cx="32" cy="34" r="27" style="fill:var(--lamp);opacity:.2"/>
  <rect x="30" y="40" width="4" height="48" rx="2" style="fill:var(--stone2);"/><rect x="22" y="84" width="20" height="6" rx="3" style="fill:var(--stone2);"/>
  <path d="M19 42L26 18H38L45 42Z" style="fill:var(--lamp);"/><path d="M19 42L26 18H29L24 42Z" style="fill:#fff;opacity:.28"/><rect x="25" y="13" width="14" height="6" rx="2.5" style="fill:var(--stone2);"/></symbol>
<symbol id="r-plant" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="17" ry="4" style="fill:var(--tshadow);"/>
  <ellipse cx="21" cy="31" rx="6" ry="14" transform="rotate(-30 21 31)" style="fill:var(--leaf2);"/><ellipse cx="43" cy="31" rx="6" ry="14" transform="rotate(30 43 31)" style="fill:var(--leaf2);"/>
  <ellipse cx="32" cy="25" rx="7" ry="16" style="fill:var(--leaf1);"/><ellipse cx="27" cy="30" rx="4" ry="10" transform="rotate(-14 27 30)" style="fill:var(--leaf3);"/><ellipse cx="38" cy="30" rx="4" ry="10" transform="rotate(14 38 30)" style="fill:var(--leaf3);"/>
  <rect x="21" y="40" width="22" height="17" rx="5" style="fill:var(--roof);"/><rect x="19" y="38" width="26" height="6" rx="2.5" style="fill:var(--roof2);"/></symbol>
<symbol id="r-table" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="20" ry="4" style="fill:var(--tshadow);"/>
  <rect x="13" y="34" width="38" height="8" rx="4" style="fill:var(--plank);"/><rect x="18" y="41" width="5" height="16" rx="2" style="fill:var(--plank2);"/><rect x="41" y="41" width="5" height="16" rx="2" style="fill:var(--plank2);"/>
  <rect x="28" y="19" width="9" height="15" rx="4" style="fill:var(--water2);"/><circle cx="29" cy="15" r="4" style="fill:var(--flower1);"/><circle cx="36" cy="14" r="4" style="fill:var(--flower2);"/><circle cx="32.5" cy="10" r="3.6" style="fill:var(--flower3);"/></symbol>
<symbol id="r-stool" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="15" ry="3.6" style="fill:var(--tshadow);"/>
  <rect x="21" y="40" width="4" height="17" rx="1.8" style="fill:var(--plank2);"/><rect x="39" y="40" width="4" height="17" rx="1.8" style="fill:var(--plank2);"/>
  <rect x="17" y="32" width="30" height="11" rx="5.5" style="fill:var(--bread);"/><rect x="19" y="33" width="26" height="3.6" rx="1.8" style="fill:#fff;opacity:.22"/></symbol>
<symbol id="r-cot" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="26" ry="4" style="fill:var(--tshadow);"/>
  <rect x="7" y="30" width="50" height="25" rx="6" style="fill:var(--plank2);"/><rect x="10" y="25" width="44" height="22" rx="7" style="fill:var(--wall);"/>
  <rect x="25" y="25" width="29" height="22" rx="7" style="fill:var(--water2);"/><path d="M25 33H54" style="stroke:#fff;stroke-width:2;opacity:.3"/>
  <rect x="11" y="27" width="14" height="11" rx="5.5" style="fill:var(--flower3);"/><rect x="6" y="22" width="5" height="34" rx="2" style="fill:var(--plank);"/></symbol>
<symbol id="r-painting" viewBox="0 0 64 96">
  <path d="M32 24V32" style="stroke:var(--trunk);stroke-width:1.6;fill:none"/>
  <rect x="9" y="32" width="46" height="36" rx="3" style="fill:var(--plank);"/><rect x="13" y="36" width="38" height="28" rx="1.5" style="fill:var(--sky);"/>
  <path d="M13 64V52Q24 44 33 52Q42 46 51 54V64Z" style="fill:var(--leaf2);"/><circle cx="42" cy="44" r="4.6" style="fill:var(--lamp);"/></symbol>
<symbol id="r-cat" viewBox="0 0 64 64">
  <ellipse cx="32" cy="57" rx="23" ry="4" style="fill:var(--tshadow);"/>
  <ellipse cx="32" cy="50" rx="23" ry="8" style="fill:var(--roof);"/><ellipse cx="32" cy="48" rx="19" ry="6" style="fill:var(--roof2);"/>
  <ellipse cx="34" cy="41" rx="16" ry="10" style="fill:var(--bread);"/><circle cx="21" cy="38" r="8.5" style="fill:var(--bread);"/>
  <polygon points="14,33 16,23 22,31" style="fill:var(--bread);"/><polygon points="22,31 27,24 29,34" style="fill:var(--bread);"/>
  <path d="M17 38q2 2 4 0M23 38q2 2 4 0" style="fill:none;stroke:var(--trunk);stroke-width:1.4;stroke-linecap:round"/><path d="M47 44q8-2 7-10" style="fill:none;stroke:var(--bread);stroke-width:4;stroke-linecap:round"/></symbol>
<symbol id="r-chest" viewBox="0 0 64 64">
  <ellipse cx="32" cy="58" rx="23" ry="4" style="fill:var(--tshadow);"/>
  <rect x="9" y="30" width="46" height="26" rx="4" style="fill:var(--plank2);"/><path d="M9 32V28Q9 17 32 17Q55 17 55 28V32Z" style="fill:var(--plank);"/>
  <rect x="9" y="30" width="46" height="4" style="fill:var(--stone2);"/><rect x="15" y="17" width="4" height="39" style="fill:var(--stone2);opacity:.8"/><rect x="45" y="17" width="4" height="39" style="fill:var(--stone2);opacity:.8"/>
  <rect x="28" y="30" width="8" height="10" rx="2.5" style="fill:var(--lamp);"/></symbol>
<symbol id="r-wardrobe" viewBox="0 0 64 96">
  <ellipse cx="32" cy="91" rx="24" ry="4" style="fill:var(--tshadow);"/>
  <rect x="11" y="14" width="42" height="76" rx="4" style="fill:var(--plank2);"/><rect x="8" y="10" width="48" height="8" rx="3" style="fill:var(--plank);"/>
  <rect x="15" y="21" width="16" height="64" rx="2" style="fill:var(--plank);"/><rect x="33" y="21" width="16" height="64" rx="2" style="fill:var(--plank);"/>
  <circle cx="28" cy="54" r="2" style="fill:var(--lamp);"/><circle cx="36" cy="54" r="2" style="fill:var(--lamp);"/><rect x="14" y="88" width="6" height="4" rx="1.5" style="fill:var(--trunk);"/><rect x="44" y="88" width="6" height="4" rx="1.5" style="fill:var(--trunk);"/></symbol>
<symbol id="r-fireplace" viewBox="0 0 64 96">
  <circle cx="32" cy="70" r="30" style="fill:var(--lamp);opacity:.2"/>
  <ellipse cx="32" cy="92" rx="27" ry="4" style="fill:var(--tshadow);"/>
  <rect x="7" y="34" width="50" height="58" rx="4" style="fill:var(--stone);"/><rect x="3" y="27" width="58" height="10" rx="3.5" style="fill:var(--stone3);"/>
  <path d="M17 92V64Q17 52 32 52Q47 52 47 64V92Z" style="fill:var(--cellar-in, #141218);"/>
  <path d="M24 90Q20 78 28 70Q28 78 33 74Q31 66 38 62Q42 74 41 90Z" style="fill:var(--roof);"/><path d="M28 90Q26 82 32 77Q34 83 37 90Z" style="fill:var(--lamp);"/>
  <rect x="21" y="88" width="22" height="4" rx="2" style="fill:var(--trunk);"/></symbol>
<symbol id="r-tree" viewBox="0 0 64 96">
  <ellipse cx="32" cy="91" rx="19" ry="4" style="fill:var(--tshadow);"/>
  <rect x="26" y="40" width="12" height="40" rx="4" style="fill:var(--trunk);"/>
  <circle cx="32" cy="30" r="22" style="fill:var(--leaf1);"/><circle cx="18" cy="44" r="12" style="fill:var(--leaf2);"/><circle cx="46" cy="44" r="12" style="fill:var(--leaf2);"/><circle cx="28" cy="20" r="10" style="fill:var(--leaf3);"/><circle cx="42" cy="32" r="6" style="fill:var(--leaf3);opacity:.8"/>
  <rect x="19" y="76" width="26" height="15" rx="5" style="fill:var(--roof);"/><rect x="17" y="73" width="30" height="6" rx="2.5" style="fill:var(--roof2);"/></symbol></defs></svg>`);
