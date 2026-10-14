/* ============================================================
   PORTAL CRAFTING (build 266): Workshop -> Portal
   Feed spare rare-or-better cards into the rift to charge it. A full charge (PORTAL_CRAFT.need) can be ignited at the forge
   (js/craft-forge.js): it may become a portal stone, more likely the more the rift is overcharged (up to PORTAL_CRAFT.cap)
   and the better the forge goes. A rift that fizzles keeps half its charge. The rift attunes to the family whose cards fed it
   most, and the stone's portal leads to that family's world (the same family worlds as js/portal.js).
   A stone sits in the Pantry (Character -> Pantry) and in the Workshop's Portal page until used: it opens a portal right
   beside you in town, which lets you through even during the puddle-world cooldown (pwCanStart(true)), since you made it.

   - Saved in state.progress.portalForge = { charge, fam: { grove: n, ... }, stones: [{ family, at }] }.
   - feedPortal(id), ignitePortal(grade, rng), usePortalStone(i) are the whole game; portalCraftSection() is the page.
   Look: the PORTAL CRAFTING block at the end of css/latest.css (family colours from .portal-fam in css/theme.css).
   tests/portal-craft.test.js.
   ============================================================ */
const PORTAL_CRAFT = {
  need: 12, cap: 18,                                      // a full charge, and how far it can be overcharged
  charge: { rare: 1, ultra: 3, super: 7, mythic: 15 },    // what one card adds (commons are too faint to charge it)
  baseChance: 0.5,                                        // at a full charge; rising to 1 at the cap
  grade: { flawless: 0.25, clean: 0.1, rough: 0, botched: -0.1 },   // the forge's say
  keepOnFizzle: 0.5, maxStones: 3
};

function portalForge() {
  const p = state.progress;
  if (!p.portalForge || typeof p.portalForge !== 'object') p.portalForge = {};
  const f = p.portalForge; f.charge = f.charge || 0; f.fam = f.fam || {}; f.stones = Array.isArray(f.stones) ? f.stones : [];
  return f;
}
const portalCardCharge = id => { const d = cardDef(id); return (d && !d.spell && PORTAL_CRAFT.charge[d.rarity]) || 0; };
function portalCardFamily(id) { return (typeof CARD_FAMILY !== 'undefined' && CARD_FAMILY[BattleEngine.baseIdOf(id)]) || null; }
// The family the rift leans to: the one whose cards gave it most charge (null before any family has fed it).
function portalAttunement() {
  const fam = portalForge().fam, keys = Object.keys(fam).filter(k => fam[k] > 0 && FAMILIES[k]);
  if (!keys.length) return null;
  const total = keys.reduce((n, k) => n + fam[k], 0), top = Math.max(...keys.map(k => fam[k]));
  return { family: keys.filter(k => fam[k] === top).sort()[0], share: top / total, tied: keys.filter(k => fam[k] === top).length > 1 };
}
function portalIgniteChance(grade) {
  const f = portalForge(); if (f.charge < PORTAL_CRAFT.need) return 0;
  const over = (Math.min(f.charge, PORTAL_CRAFT.cap) - PORTAL_CRAFT.need) / (PORTAL_CRAFT.cap - PORTAL_CRAFT.need);
  return Math.max(0.05, Math.min(1, PORTAL_CRAFT.baseChance + (1 - PORTAL_CRAFT.baseChance) * over + (PORTAL_CRAFT.grade[grade] || 0)));
}
function portalFeedBlock(id) {
  const f = portalForge();
  if (!portalCardCharge(id)) return 'Only rare cards or better can charge the rift';
  if (f.charge >= PORTAL_CRAFT.cap) return 'The rift is as charged as it can be: ignite it';
  if (tradableCount(id) < 1) return 'Cards in your deck are never used';
  if (!keepsFullDeck({ [id]: 1 }, [])) return 'Needs more spare cards, so your deck can stay at ' + DECK_SIZE;
  return '';
}

// One card into the rift.
function feedPortal(id) {
  if (portalFeedBlock(id)) return false;
  const f = portalForge(), add = portalCardCharge(id), fam = portalCardFamily(id);
  removeCopies(id, 1); repairDeckAfterCraft(null);
  f.charge = Math.min(PORTAL_CRAFT.cap, f.charge + add);
  if (fam) f.fam[fam] = (f.fam[fam] || 0) + add;
  bumpStat('portalFed', 1); saveState();
  return { charge: f.charge, added: add, family: fam };
}

// Ignite a full rift. grade: the forge's (FORGE_GRADES id). rng is injectable for tests.
function ignitePortal(grade, rng) {
  rng = rng || Math.random;
  const f = portalForge();
  if (f.charge < PORTAL_CRAFT.need || f.stones.length >= PORTAL_CRAFT.maxStones) return false;
  const chance = portalIgniteChance(grade), att = portalAttunement();
  if (rng() < chance) {
    const top = Math.max(0, ...Object.values(f.fam)), ties = Object.keys(f.fam).filter(k => top > 0 && f.fam[k] === top && FAMILIES[k]), all = Object.keys(FAMILIES);
    const family = att && !att.tied ? att.family : ties.length ? ties[Math.floor(rng() * ties.length)] : all[Math.floor(rng() * all.length)];   // a tie or no family: a coin between them
    f.stones.push({ family, at: Date.now() }); f.charge = 0; f.fam = {};
    bumpStat('portalsCrafted', 1); saveState(); updateHud(); checkAchievements();
    const fm = FAMILIES[family];
    logEvent('🌀', `You forged a ${fm.name} portal stone.`);
    toast(`🌀 The rift folds into a ${fm.icon} ${fm.name} portal stone! Open it from the Workshop or your Pantry when you are ready.`);
    sfx('portal'); buzz(HAP.big);
    return { ok: true, family, chance };
  }
  const keep = PORTAL_CRAFT.keepOnFizzle;
  f.charge = Math.floor(f.charge * keep); Object.keys(f.fam).forEach(k => { f.fam[k] = Math.floor(f.fam[k] * keep); });
  bumpStat('portalFizzles', 1); saveState(); updateHud(); checkAchievements();
  toast(`💨 The rift flares and fizzles. Half its charge is still there (${f.charge}/${PORTAL_CRAFT.need}).`);
  sfx('soft'); buzz(HAP.soft);
  return { ok: false, chance, charge: f.charge };
}

function portalStoneBlock() {
  if (typeof pwActive === 'function' && pwActive()) return 'Not from inside a world';
  if (portalState()) return 'A portal is already open somewhere';
  if (typeof pwCanStart !== 'function' || !pwCanStart(true)) return `Not just now (from level ${PW_MIN_LEVEL}, in town, not in Cozy mode)`;
  return '';
}
// Open the i-th stone: a portal right beside her, in her district.
function usePortalStone(i) {
  const f = portalForge(), st = f.stones[i]; if (!st) return false;
  const why = portalStoneBlock(); if (why) { toast('🌀 ' + why + '.'); sfx('tie'); return false; }
  if (!portalOpen(st.family, { crafted: true })) { toast('🌀 There is no room for a portal here. Try another spot.'); sfx('tie'); return false; }
  f.stones.splice(i, 1); bumpStat('portalStonesUsed', 1); saveState();
  return true;
}

/* ---------------- the Workshop page ---------------- */
function portalCraftSection() {
  const f = portalForge(), att = portalAttunement(), sec = document.createElement('div'); sec.className = 'cr-section pc-craft';
  const pct = n => Math.round(n * 100), full = f.charge >= PORTAL_CRAFT.need, capPct = 100;
  const att1 = att && FAMILIES[att.family];
  const fams = Object.keys(FAMILIES).map(k => { const v = f.fam[k] || 0, tot = Object.values(f.fam).reduce((a, b) => a + b, 0) || 1;
    return `<span class="pc-fam portal-fam${att && att.family === k ? ' on' : ''}" data-fam="${k}" title="${FAMILIES[k].name}">${FAMILIES[k].icon}<small>${v ? pct(v / tot) + '%' : '-'}</small></span>`; }).join('');
  const stones = f.stones.length ? f.stones.map((s, i) => `<div class="pc-stone portal-fam" data-fam="${s.family}"><span class="pc-orb" aria-hidden="true">${FAMILIES[s.family].icon}</span><div><b>${FAMILIES[s.family].name} portal stone</b><small>Opens a ${FAMILIES[s.family].name} portal beside you, any time</small></div><button class="btn" data-use-stone="${i}">🌀 Open</button></div>`).join('')
    : '<div class="cr-empty">No portal stones yet.</div>';
  const counts = ownedCardCounts();
  const feedable = Object.keys(counts).filter(id => portalCardCharge(id) && tradableCount(id) > 0)
    .sort((a, b) => portalCardCharge(a) - portalCardCharge(b) || (a < b ? -1 : 1));
  const room = PORTAL_CRAFT.maxStones - f.stones.length;
  sec.innerHTML = `<div class="cr-title">🌀 Craft a portal</div>
    <div class="cr-desc">Feed <b>rare cards or better</b> into the rift. A full charge can be ignited at the forge and may fold into a <b>portal stone</b> you open whenever you like. Overcharge it for a better chance; a fizzle keeps half the charge. The rift attunes to the family that fed it most.</div>
    <div class="pc-meter" role="meter" aria-valuemin="0" aria-valuemax="${PORTAL_CRAFT.cap}" aria-valuenow="${f.charge}" aria-label="Rift charge">
      <div class="pc-bar"><i class="pc-fill" style="width:${(Math.min(f.charge, PORTAL_CRAFT.cap) / PORTAL_CRAFT.cap * capPct).toFixed(1)}%"></i><i class="pc-mark" style="left:${(PORTAL_CRAFT.need / PORTAL_CRAFT.cap * 100).toFixed(1)}%"></i></div>
      <div class="pc-nums"><b>${f.charge}/${PORTAL_CRAFT.need}</b><span>${full ? (f.charge > PORTAL_CRAFT.need ? `overcharged +${f.charge - PORTAL_CRAFT.need}` : 'full') : `${PORTAL_CRAFT.need - f.charge} to go`} · overcharge to ${PORTAL_CRAFT.cap}</span></div>
    </div>
    <div class="pc-att"><span>Attuned to</span>${att1 ? `<b>${att1.icon} ${att1.name}</b>` : '<b>nothing yet</b>'}<span class="pc-fams">${fams}</span></div>
    <div class="pc-ignite"><button class="btn${full && room > 0 ? ' cr-ready' : ''}" id="pcIgnite" ${full && room > 0 ? '' : 'disabled'}>${room <= 0 ? `Holding ${PORTAL_CRAFT.maxStones} stones: open one first` : full ? `🔥 Ignite the rift · ${pct(portalIgniteChance('rough'))}% (a Flawless forge: ${pct(portalIgniteChance('flawless'))}%)` : 'Charge it to ignite'}</button></div>
    <div class="cr-title">Portal stones <small>${f.stones.length}/${PORTAL_CRAFT.maxStones}</small></div>
    <div class="pc-stones">${stones}</div>
    <div class="cr-title">Feed the rift</div>
    ${feedable.length ? `<div class="cr-grid pc-feed">${feedable.map(id => { const why = portalFeedBlock(id);
      return `<div class="cr-gridcard${why ? ' disabled' : ''}" ${why ? `title="${escapeHtml(why)}"` : `data-feed="${id}" role="button"`} aria-label="${escapeHtml(cardDef(id).name)}, adds ${portalCardCharge(id)} charge"><span class="cr-tile">${cardTileHtml(id, tradableCount(id) > 1 ? tradableCount(id) : 0)}</span><span class="pc-plus">+${portalCardCharge(id)}</span></div>`; }).join('')}</div>`
      : `<div class="cr-empty">No spare rare-or-better cards outside your deck. Each rare adds 1, ultra rare 3, super ultra rare 7 and mythic 15.</div>`}`;
  sec.querySelectorAll('[data-feed]').forEach(el => el.addEventListener('click', () => {
    const r = feedPortal(el.dataset.feed);
    if (!r) { sfx('tie'); return; }
    sfx(r.charge >= PORTAL_CRAFT.need ? 'found' : 'tap'); buzz(HAP.tap); renderCraft();
  }));
  const ig = sec.querySelector('#pcIgnite');
  if (ig) ig.addEventListener('click', () => {
    if (portalForge().charge < PORTAL_CRAFT.need) return;
    ensureAudio();
    forgeOpen({ kind: 'portal', rarity: 'rare', title: 'Ignite the rift',
      summary: g => `🌀 ${Math.round(portalIgniteChance('rough') * 100)}% → ${Math.round(portalIgniteChance(g) * 100)}% to fold into a stone` }, grade => { ignitePortal(grade); renderCraft(); });
  });
  sec.querySelectorAll('[data-use-stone]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.useStone;
    switchTab('town');
    setTimeout(() => { usePortalStone(i); }, 120);
  }));
  return sec;
}
