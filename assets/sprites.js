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
  <circle cx="20" cy="98" r="5" style="fill:var(--leaf1);"/><circle cx="106" cy="100" r="6" style="fill:var(--leaf1);"/><circle cx="102" cy="96" r="2.4" style="fill:var(--flower1);"/></symbol></defs></svg>`);
