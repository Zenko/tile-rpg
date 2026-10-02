/* ============================================================
   TAROT (build 108)
   The game's cards already read like a tarot deck: four families are the four suits (Grove = Wands, Stone = Pentacles,
   Tide = Cups, Wind = Swords), and twenty-two of its mythic and super cards stand in for the Major Arcana. Nothing new is
   printed: an Arcana IS the card, so owning the card collects it.

     Daily reading - once a day, three Arcana are drawn (Past, Present, Future), each upright or reversed. Turning all three
                     over gives the day a fortune: the Present card's perk, at half strength when it is reversed.
     The Arcana    - the collection. Owned cards are readable; ones that have shown up in a reading are readable but locked;
                     the rest are "???". Up to three owned Arcana can be attuned for a small permanent perk.

   Perks use the kinds the game already reads through cardBonus() (js/afterdark-companion-cards.js), added by tarotBonus()
   inside skillBonus() (js/skills-gear.js), so no new hooks. Attuned perks are deliberately gentler than the day's fortune:
   a percentage is halved, a Pebble perk stays, and Spirit or card draw turns into +3% XP so the battle start is not stacked.
   Everything lives in the calm corner (js/calm.js) and is saved in state.progress.tarot.
   ============================================================ */
const ARCANA = [
  { n: '0',     name: 'The Fool',           card: 'winter-hare',       kind: 'startDraw',      val: 1,    up: 'New beginnings, a light step.',          rev: 'Rushing in without looking.' },
  { n: 'I',     name: 'The Magician',       card: 'starfall-unicorn',  kind: 'xp',             val: .05,  up: 'Everything you need is already here.',   rev: 'Tricks and scattered effort.' },
  { n: 'II',    name: 'The High Priestess', card: 'celestial-owl',     kind: 'finds',          val: .10,  up: 'Quiet knowing. Listen first.',           rev: 'Ignoring your own instinct.' },
  { n: 'III',   name: 'The Empress',        card: 'garden-titan',      kind: 'crops',          val: .08,  up: 'Abundance and care.',                    rev: 'Smothering, overgrowth.' },
  { n: 'IV',    name: 'The Emperor',        card: 'mountain-heart',    kind: 'startSpirit',    val: 1,    up: 'Order, structure, a firm hand.',         rev: 'Rigid and stubborn.' },
  { n: 'V',     name: 'The Hierophant',     card: 'ancient-oak',       kind: 'xp',             val: .05,  up: 'Tradition and shared wisdom.',           rev: 'Breaking with convention.' },
  { n: 'VI',    name: 'The Lovers',         card: 'river-otter',       kind: 'miniPebbles',    val: 1,    up: 'Partnership, a meaningful choice.',      rev: 'A bond out of balance.' },
  { n: 'VII',   name: 'The Chariot',        card: 'thundering-ram',    kind: 'winPebbles',     val: 1,    up: 'Will and momentum.',                     rev: 'Losing control of the reins.' },
  { n: 'VIII',  name: 'Strength',           card: 'lion-dancer',       kind: 'startSpirit',    val: 1,    up: 'Gentle courage.',                        rev: 'Doubt, a quiet voice.' },
  { n: 'IX',    name: 'The Hermit',         card: 'lantern',           kind: 'chest',          val: .10,  up: 'A lamp held up in the dark.',            rev: 'Isolation, hiding away.' },
  { n: 'X',     name: 'Wheel of Fortune',   card: 'wandering-comet',   kind: 'winPebbles',     val: 1,    up: 'Cycles turn. Luck arrives.',             rev: 'Bad timing, a stuck wheel.' },
  { n: 'XI',    name: 'Justice',            card: 'echoing-bell',      kind: 'winPebbles',     val: 1,    up: 'Fairness. A clear ring of truth.',       rev: 'A one-sided story.' },
  { n: 'XII',   name: 'The Hanged Man',     card: 'mist-wraith',       kind: 'bake',           val: .10,  up: 'A pause, a new angle.',                  rev: 'Stalling.' },
  { n: 'XIII',  name: 'Death',              card: 'eclipse-panther',   kind: 'finds',          val: .10,  up: 'An ending that clears the way.',         rev: 'Clinging to what is done.' },
  { n: 'XIV',   name: 'Temperance',         card: 'deep-current',      kind: 'crops',          val: .08,  up: 'Balance and blending.',                  rev: 'Excess, imbalance.' },
  { n: 'XV',    name: 'The Devil',          card: 'kraken',            kind: 'harvestPebbles', val: 1,    up: 'Temptation and chains you chose.',       rev: 'Slipping free.' },
  { n: 'XVI',   name: 'The Tower',          card: 'thunder-roc',       kind: 'chest',          val: .10,  up: 'Sudden change. Clear skies after.',      rev: 'A collapse you avoid.' },
  { n: 'XVII',  name: 'The Star',           card: 'starlight',         kind: 'startSpirit',    val: 1,    up: 'Hope, quiet healing.',                   rev: 'Lost faith, then renewal.' },
  { n: 'XVIII', name: 'The Moon',           card: 'moon-dragon',       kind: 'finds',          val: .12,  up: 'Dreams and illusions.',                  rev: 'Confusion clears.' },
  { n: 'XIX',   name: 'The Sun',            card: 'phoenix-ember',     kind: 'xp',             val: .06,  up: 'Joy, plain and warm.',                   rev: 'Joy delayed, not gone.' },
  { n: 'XX',    name: 'Judgement',          card: 'silver-phoenix',    kind: 'xp',             val: .05,  up: 'A calling. Rising again.',               rev: 'Self-doubt.' },
  { n: 'XXI',   name: 'The World',          card: 'world-tree',        kind: 'harvestPebbles', val: 1,    up: 'Completion, a full circle.',             rev: 'Nearly there.' },
];
const TAROT_FAM = { grove: '🌿', stone: '🪨', tide: '🌊', wind: '🪶' };
const TAROT_POS = ['Past', 'Present', 'Future'];
const TAROT_ATTUNE_MAX = 3, TAROT_REVERSED_CHANCE = 0.3;

function tarotState() {
  const p = state.progress; if (!p.tarot || typeof p.tarot !== 'object') p.tarot = {};
  const t = p.tarot;
  if (t.day !== todayKey()) { t.day = todayKey(); t.cards = null; t.flipped = [false, false, false]; t.fortune = null; }   // a new day, a new reading
  if (!t.seen) t.seen = {}; if (!Array.isArray(t.attuned)) t.attuned = [];
  return t;
}
const arcanaCardDef = a => cardDef(a.card);
const arcanaOwned = i => baseOwnedSet().has(ARCANA[i].card);
const arcanaFamily = a => CARD_FAMILY[a.card] || 'stone';
// Perk wording for one kind and value.
function tarotPerkText(kind, val) {
  const pct = Math.round(val * 100);
  return ({ startSpirit: `+${val} Spirit at the start of matches`, startDraw: `Draw ${val} extra card at the start of matches`, xp: `+${pct}% XP`, crops: `Crops grow ${pct}% faster`, finds: `Hidden finds +${pct}%`, chest: `Hidden chests +${pct}%`,
    harvestPebbles: `+${val} Pebble per harvest`, winPebbles: `+${val} Pebble for every match won`, miniPebbles: `+${val} Pebble per mini-game medal`, bake: `Bread bakes ${pct}% faster` })[kind] || '';
}
const TAROT_FRACTION = { startSpirit: 0, startDraw: 0 };
// The perk an Arcana gives while attuned (gentler than the day's fortune).
function tarotAttunedPerk(a) {
  if (a.kind in TAROT_FRACTION) return { kind: 'xp', val: 0.03 };
  return Number.isInteger(a.val) ? { kind: a.kind, val: a.val } : { kind: a.kind, val: +(a.val / 2).toFixed(3) };
}
const tarotReversedVal = a => (Number.isInteger(a.val) ? a.val : +(a.val / 2).toFixed(3));

// Everything above, summed by kind. Called by skillBonus().
function tarotBonus(kind) {
  const t = state.progress.tarot; if (!t) return 0;
  let v = 0;
  if (t.day === todayKey() && t.fortune) { const a = ARCANA[t.fortune.i]; if (a && a.kind === kind) v += t.fortune.rev ? tarotReversedVal(a) : a.val; }
  (t.attuned || []).forEach(i => { const a = ARCANA[i]; if (a && arcanaOwned(i)) { const p = tarotAttunedPerk(a); if (p.kind === kind) v += p.val; } });
  return v;
}
const tarotCanDraw = () => !tarotState().cards;

function tarotDraw() {
  const t = tarotState(); if (t.cards) return false;
  const pool = ARCANA.map((a, i) => ({ i, w: arcanaOwned(i) ? 3 : 1 })), picks = [];
  while (picks.length < 3) {
    const total = pool.reduce((n, x) => n + x.w, 0); let r = Math.random() * total, k = 0;
    for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r < 0) break; }
    picks.push({ i: pool[k].i, rev: Math.random() < TAROT_REVERSED_CHANCE }); pool.splice(k, 1);
  }
  t.cards = picks; t.flipped = [false, false, false]; t.fortune = null; saveState(); return true;
}
function tarotFlip(k) {
  const t = tarotState(); if (!t.cards || t.flipped[k]) return false;
  t.flipped[k] = true; t.seen[t.cards[k].i] = true; sfx('flip'); buzz(HAP.tap);
  if (t.flipped.every(Boolean)) { const mid = t.cards[1]; t.fortune = { i: mid.i, rev: mid.rev }; sfx('found'); }
  saveState(); return true;
}
function tarotAttune(i) {
  const t = tarotState(), at = t.attuned.indexOf(i);
  if (at >= 0) { t.attuned.splice(at, 1); saveState(); return 'off'; }
  if (!arcanaOwned(i) || t.attuned.length >= TAROT_ATTUNE_MAX) return false;
  t.attuned.push(i); saveState(); return 'on';
}

/* ---------- the screen (an activity of the calm corner) ---------- */
function tarotFaceHtml(i, rev, tag) {
  const a = ARCANA[i], d = arcanaCardDef(a), fam = arcanaFamily(a);
  return `<div class="tr-face"><span class="tr-num">${a.n}</span><span class="tr-ico"><span class="${rev ? 'rev' : ''}">${d.icon}</span></span><b>${a.name}</b><small>${TAROT_FAM[fam]} ${d.name}</small>${tag ? `<span class="tr-tag">${tag}</span>` : ''}</div>`;
}
let tarotView = 'reading';
function calmTarot(body) {
  body.innerHTML = `<div class="seg" id="trSeg" role="tablist"><button class="seg-btn${tarotView === 'reading' ? ' active' : ''}" data-tv="reading" role="tab">Reading</button><button class="seg-btn${tarotView === 'arcana' ? ' active' : ''}" data-tv="arcana" role="tab">The Arcana</button></div><div id="trBody" class="tr-body"></div>`;
  onAll(body, '#trSeg [data-tv]', b => { tarotView = b.dataset.tv; sfx('nav'); tarotDrawBody(); });
  tarotDrawBody();
}
function tarotDrawBody() {
  const box = document.getElementById('trBody'); if (!box) return;
  document.querySelectorAll('#trSeg [data-tv]').forEach(b => b.classList.toggle('active', b.dataset.tv === tarotView));
  if (tarotView === 'arcana') tarotDrawArcana(box); else tarotDrawReading(box);
}
function tarotDrawReading(box) {
  const t = tarotState(), cards = t.cards;
  const slots = TAROT_POS.map((pos, k) => {
    const c = cards && cards[k], up = c && t.flipped[k];
    return `<div><div class="tr-slot">${pos}</div><button type="button" class="tr-card${up ? ' up' : ''}${c ? '' : ' empty'}" data-flip="${k}" ${c ? '' : 'disabled'} aria-label="${pos} card, ${up ? ARCANA[c.i].name + (c.rev ? ', reversed' : '') : c ? 'face down, tap to turn over' : 'not drawn yet'}"><div class="tr-in"><div class="tr-back">✦</div>${c ? tarotFaceHtml(c.i, c.rev, c.rev ? 'REVERSED' : '') : '<div class="tr-face empty"><span class="tr-ico">?</span></div>'}</div></button></div>`;
  }).join('');
  let line = 'One reading a day. Shuffle when you are ready.', fortune = '';
  if (cards) {
    const lastFlipped = t.flipped.lastIndexOf(true);
    line = lastFlipped < 0 ? 'Tap a card to turn it over.' : `${TAROT_POS[lastFlipped]}: ${ARCANA[cards[lastFlipped].i].name}. ${cards[lastFlipped].rev ? ARCANA[cards[lastFlipped].i].rev : ARCANA[cards[lastFlipped].i].up}`;
    if (t.fortune) { const a = ARCANA[t.fortune.i], val = t.fortune.rev ? tarotReversedVal(a) : a.val, same = cards.every(c => arcanaFamily(ARCANA[c.i]) === arcanaFamily(a));
      fortune = `<div class="tr-fortune"><b>Today's fortune</b><span>${t.fortune.rev ? '⚖️ ' : '✨ '}${tarotPerkText(a.kind, val)}${t.fortune.rev && !Number.isInteger(a.val) ? ' (reversed: a quieter day)' : ''}</span>${same ? '<span>Harmony: all one family</span>' : ''}</div>`; }
    else fortune = `<div class="tr-fortune dim">Turn all three cards over to read the day's fortune.</div>`;
    const unowned = cards.filter((c, k) => t.flipped[k] && !arcanaOwned(c.i)).map(c => arcanaCardDef(ARCANA[c.i]).name);
    if (unowned.length) line += ` You do not own ${unowned.join(' or ')} yet.`;
  }
  box.innerHTML = `<div class="calm-stage tr-stage"><div class="tr-spread">${slots}</div></div><div class="calm-say sm" id="trSay">${line}</div>${fortune}<div class="calm-actions"><button type="button" class="calm-btn pri wide" id="trDraw" ${tarotCanDraw() ? '' : 'disabled'}>${tarotCanDraw() ? '🔮 Shuffle and draw' : 'Come back tomorrow'}</button></div>`;
  onAll(box, '[data-flip]', b => { if (tarotFlip(+b.dataset.flip)) tarotDrawReading(box); });
  const dr = document.getElementById('trDraw'); dr.addEventListener('click', () => { if (tarotDraw()) { sfx('claim'); tarotDrawReading(box); } });
}
let tarotSel = 0;
function tarotDrawArcana(box) {
  const t = tarotState(), have = ARCANA.filter((_, i) => arcanaOwned(i)).length;
  const tile = (a, i) => { const own = arcanaOwned(i), seen = !!t.seen[i], at = t.attuned.includes(i), d = arcanaCardDef(a);
    return `<button type="button" class="tr-tile${own ? '' : seen ? ' seen' : ' lock'}${at ? ' att' : ''}${tarotSel === i ? ' sel' : ''}" data-ar="${i}" aria-label="${own || seen ? a.name : 'Unknown Arcana'}${at ? ', attuned' : ''}"><span>${own || seen ? d.icon : '?'}</span><small>${a.n}</small></button>`; };
  const a = ARCANA[tarotSel], own = arcanaOwned(tarotSel), seen = !!t.seen[tarotSel], d = arcanaCardDef(a), at = t.attuned.includes(tarotSel), n = t.attuned.length;
  const detail = own || seen
    ? `<b>${a.n} · ${a.name}</b><span class="tr-card-line">${TAROT_FAM[arcanaFamily(a)]} ${d.icon} ${d.name} · ${RARITY_LABEL[d.rarity]}</span><span>${a.up} <i>Reversed: ${a.rev.charAt(0).toLowerCase() + a.rev.slice(1)}</i></span>
       <span class="tr-perk">Fortune: ${tarotPerkText(a.kind, a.val)}</span><span class="tr-perk">Attuned: ${tarotPerkText(tarotAttunedPerk(a).kind, tarotAttunedPerk(a).val)}</span>${own ? '' : `<span class="tr-hint">Not yours yet: find ${d.name} to collect it.</span>`}`
    : `<b>${a.n} · ???</b><span>This Arcana has not turned up in a reading yet.</span>`;
  box.innerHTML = `<div class="tr-count">${have} of ${ARCANA.length} collected · ${n}/${TAROT_ATTUNE_MAX} attuned</div><div class="tr-grid">${ARCANA.map(tile).join('')}</div><div class="tr-detail">${detail}</div>
    <div class="calm-actions"><button type="button" class="calm-btn pri wide" id="trAtt" ${own && (at || n < TAROT_ATTUNE_MAX) ? '' : 'disabled'}>${!own ? 'Collect it to attune' : at ? 'Remove attunement' : n >= TAROT_ATTUNE_MAX ? 'Three are attuned already' : '✦ Attune'}</button></div>`;
  onAll(box, '[data-ar]', b => { tarotSel = +b.dataset.ar; sfx('tap'); tarotDrawArcana(box); });
  document.getElementById('trAtt').addEventListener('click', () => { const r = tarotAttune(tarotSel); if (r) { sfx(r === 'on' ? 'claim' : 'soft'); tarotDrawArcana(box); } });
}
