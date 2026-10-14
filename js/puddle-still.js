/* ============================================================
   TIME-STOP WORLDS (build 260): the puddle world kind 'still'
   You fall into a moment that has stopped. Rain hangs in the air, a few neighbours are caught mid-step (mid-sneeze, mid-wave),
   birds hang mid-flight, and the colour has drained out of everything except the glowing motes - the only things still alive.
   Time here only moves when you do: PW_STILL_STEPS steps (counted by the `step` hook, pwStep in js/puddle-worlds.js, from
   lifeStep) and then it starts again. Gather the motes before it does. When the last mote is taken or the last step is spent,
   time thaws (the rain falls, the folk and the colour come back) and the world lets you go, with Embers for every mote and a
   card that is better the more you gathered.

   - The world record carries steps / stepsLeft / got (saved, so a reload mid-world carries on); the district data carries
     motes [{ id, x, y, got }], folk [{ x, y, emoji, name, pose }], birds and drops (fractional tile positions).
   - The hanging rain and the birds are one persistent element in the actor layer (pwLayer), drawn once, never per redraw;
     the motes and the frozen folk are ordinary map entities (render hook). A veil just above the ground drains its colour.
   - The world's own timer (w.ms, long) still runs underneath, as for any world, in case she simply stands still.
   Look: the TIME-STOP block at the end of css/latest.css; colours are --still-* in css/theme.css.
   ============================================================ */
const PW_STILL_STEPS = 45, PW_STILL_MOTES = 10, PW_STILL_FOLK = 4, PW_STILL_DROPS = 70, PW_STILL_BIRDS = 3;
const PW_STILL_WORDS = ['Stillness', 'Pause', 'Held Breath', 'Stopped Hour', 'Frozen Minute'];
const PW_STILL_POSES = ['mid-step', 'mid-sneeze', 'mid-wave', 'halfway through a yawn', 'reaching for a hat the wind took', 'about to sit down', 'mid-laugh, mouth wide open'];

function pwStillOn(w) {
  if (!townView) return;
  townView.classList.add('pw-still');
  const data = state.districtData[PW_KEY], l = pwLayer(true); if (!l || !data) return;
  if (!l.querySelector('.pw-still-air')) {
    const m = getMap(PW_KEY), air = document.createElement('div'); air.className = 'pw-still-air'; air.setAttribute('aria-hidden', 'true');
    air.style.width = `calc(var(--t) * ${m.w})`; air.style.height = `calc(var(--t) * ${m.h})`;   // the actor layer itself is 0 x 0
    air.innerHTML = '<div class="pw-still-veil"></div>' +
      (data.drops || []).map(d => `<i class="sd" style="left:calc(var(--t) * ${d.x.toFixed(2)});top:calc(var(--t) * ${d.y.toFixed(2)});--l:${d.l.toFixed(2)}"></i>`).join('') +
      (data.birds || []).map(b => `<b class="sb" style="left:calc(var(--t) * ${b.x.toFixed(2)});top:calc(var(--t) * ${b.y.toFixed(2)})">🐦</b>`).join('');
    l.prepend(air);
  }
  pwStillWarn(w);
}
function pwStillOff() { if (townView) townView.classList.remove('pw-still', 'pw-thaw', 'pw-still-late'); }
// The last few steps: the hanging rain starts to tremble.
function pwStillWarn(w) { if (townView) townView.classList.toggle('pw-still-late', !!w && w.stepsLeft <= 10 && !w.thawing); }

// Time starts again: everything moves, then the world lets her go and pays for the motes.
function pwStillEnd(w, all) {
  if (w.thawing) return; w.thawing = true; saveState();
  cancelWalk(); pwStillWarn(w);
  if (townView) townView.classList.add('pw-thaw');
  const n = w.got, motes = (state.districtData[PW_KEY] && state.districtData[PW_KEY].motes || []).length;
  townLog.textContent = all ? 'You gather the last mote and the world breathes out. Time starts again.' : 'Your last step lands, and time starts again all at once.';
  sfx('warp'); buzz(HAP.soft);
  bumpStat('stillMotes', n); if (all) { bumpStat('puddleWins', 1); bumpStat('stillClears', 1); }
  setTimeout(() => {
    if (pwActive() !== w) return;
    pwLeave('done', false, () => {
      const peb = n * 2 + (all ? 8 : 0);
      if (peb) { addPebbles(peb, 'puddle-world'); toast(`✨ ${n} of ${motes} motes · +${peb} ${currencyName(peb)}`); }
      const rarity = all ? rollRewardRarity(false) : n >= 7 ? 'rare' : n >= 4 ? 'common' : null;
      if (rarity) pwGiveCard(pwCardId(all && rarity === 'common' ? 'rare' : rarity), all ? 'Every mote gathered' : 'Gathered from a stopped moment');
    });
  }, 1700);
}

PW_KINDS.still = {
  weight: 2,
  create(w, rnd, pick, last) {
    const biome = pick(pwBiomesFor(false).filter(b => b.id !== last.biome));
    w.shape = pick(Object.keys(PW_SHAPES)); w.biome = biome.id; w.name = biome.word + ' ' + pick(PW_STILL_WORDS);
    w.size = [15 + 2 * Math.floor(rnd() * 2), 15 + 2 * Math.floor(rnd() * 2)];   // 15 or 17 each way: small enough to cross in the steps you have
    w.ms = 8 * 60 * 1000; w.steps = w.stepsLeft = PW_STILL_STEPS; w.got = 0;
    w.intro = `Time has stopped here. It only moves when you do: ${PW_STILL_STEPS} steps before it starts again.`;
  },
  generate: pwGenerateExplore,
  build(w, data, m) {
    const taken = new Set([m.spawn.x + ',' + m.spawn.y]), spot = () => { const s = pickSpot(m, taken, data, null); taken.add(s.x + ',' + s.y); return s; };
    data.motes = Array.from({ length: PW_STILL_MOTES }, (_, i) => { const s = spot(); return { id: 'mote' + i, x: s.x, y: s.y, got: false }; });
    data.folk = pwFolk(PW_STILL_FOLK).map(f => { const s = spot(); return { x: s.x, y: s.y, emoji: f.emoji, name: f.name, pose: PW_STILL_POSES[Math.floor(Math.random() * PW_STILL_POSES.length)] }; });
    data.drops = Array.from({ length: PW_STILL_DROPS }, () => ({ x: Math.random() * m.w, y: Math.random() * m.h, l: 0.2 + Math.random() * 0.25 }));
    data.birds = Array.from({ length: PW_STILL_BIRDS }, () => ({ x: 1 + Math.random() * (m.w - 2), y: 1 + Math.random() * (m.h - 3) }));
    data.spirits = [];
  },
  enter(w) { pwStillOn(w); },
  boot(w) { pwStillOn(w); if (w.thawing) setTimeout(() => { if (pwActive() === w) pwLeave('done'); }, 1200); },
  leave(w) { pwStillOff(); },
  render(w, data, add) {
    (data.motes || []).forEach(mo => { if (!mo.got) add('pw-mote', mo.x, mo.y, '<span></span>'); });
    (data.folk || []).forEach(f => add('pw-frozen', f.x, f.y, `<span>${f.emoji}</span><b>${escapeHtml(f.name)}</b>`));
    pwStillOn(w);
  },
  tap(w, tx, ty) {
    const data = state.districtData[PW_KEY], f = data && (data.folk || []).find(o => o.x === tx && o.y === ty);
    if (!f) return false;
    lifeFx('npc-bubble', f.x, f.y, `<span>${escapeHtml(f.name)} is frozen ${f.pose}.</span>`, 1900); sfx('tap');
    return true;
  },
  step(w, x, y) {
    const data = state.districtData[PW_KEY]; if (!data || w.thawing) return;
    w.stepsLeft = Math.max(0, w.stepsLeft - 1);
    const mo = (data.motes || []).find(o => !o.got && o.x === x && o.y === y);
    if (mo) {
      mo.got = true; w.got++;
      const el = townWorld && townWorld.querySelector(`.ent.pw-mote[data-x="${x}"][data-y="${y}"]`); if (el) el.remove();
      lifeFx('pw-mote-pop', x, y, '<span>✨</span>', 700); sfx('found'); buzz(HAP.tap);
    }
    pwStillWarn(w); saveState();
    if (typeof refreshGoalChip === 'function') refreshGoalChip(true);
    if (w.got >= data.motes.length) pwStillEnd(w, true);
    else if (w.stepsLeft <= 0) pwStillEnd(w, false);
  },
  goal(w) {
    const data = state.districtData[PW_KEY], of = data && data.motes ? data.motes.length : PW_STILL_MOTES;
    return { icon: '⏸️', text: `${w.stepsLeft} step${w.stepsLeft === 1 ? '' : 's'} of stillness · ${w.got}/${of} motes`, hint: 'Time only moves when you walk. Gather the glowing motes before your steps run out and it starts again.' };
  }
};
