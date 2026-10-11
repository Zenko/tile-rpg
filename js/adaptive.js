/* ============================================================
   ADAPTIVE DIFFICULTY (build 221)
   A calm game should not feel hopeless after a bad run or trivial after a good one. This keeps the results of your last few matches against
   plain neighbours and district bosses (state.progress.form.recent: 1 = win, 0 = loss; yields and every special match do not count) and turns
   them into a small "tilt" from -2 (struggling) to +2 (cruising), used when the next opponent is set up:
     tilt -1  the opponent starts with 1 less Calm          tilt +1  1 more Calm
     tilt -2  2 less Calm AND one AI level easier           tilt +2  2 more Calm AND one AI level smarter (never for bosses)
   Three losses in a row is always at least -2. It needs 3 results before it does anything, never goes beyond one level step or 2 Calm, never
   makes an opponent a pushover (the floor is the 'gentle' AI and 12 Calm), and can be switched off (Settings -> Battles).
   When it is nudging, the versus screen says so in the opponent's own words ("feeling gentle today", "in a competitive mood"), so it never
   feels hidden. Tuned by the tilt table above and ADAPT; nothing else in the engine knows about it.
   ============================================================ */
const ADAPT = { window: 8, min: 3, target: 0.6, levels: ['gentle', 'normal', 'smart'], minSpirit: 12 };
function adaptForm() { const p = state.progress; if (!p.form || !Array.isArray(p.form.recent)) p.form = { recent: [] }; return p.form; }
function adaptOn() { return prefs.adaptive !== false; }
function adaptRecord(won) {
  const f = adaptForm(); f.recent.push(won ? 1 : 0);
  if (f.recent.length > ADAPT.window) f.recent.splice(0, f.recent.length - ADAPT.window);
  saveState();
}
function adaptTilt() {
  const r = adaptForm().recent;
  if (!adaptOn() || r.length < ADAPT.min) return 0;
  const rate = r.reduce((a, b) => a + b, 0) / r.length;
  let t = Math.max(-2, Math.min(2, Math.round((rate - ADAPT.target) * 6)));
  if (r.slice(-3).every(x => x === 0)) t = Math.min(t, -2);
  return t;
}
// Nudge an opponent's profile ({ level, spirit }) in place. Returns a short mood line when it changed something, else ''.
function adaptApply(profile, opponent, isBoss) {
  let t = adaptTilt();
  if (isBoss && t > 0) t = 0;                                   // bosses are never made harder
  if (!t) return '';
  profile.spirit = Math.max(ADAPT.minSpirit, profile.spirit + t);
  if (Math.abs(t) >= 2) {
    const i = ADAPT.levels.indexOf(profile.level);
    if (i >= 0) profile.level = ADAPT.levels[Math.max(0, Math.min(ADAPT.levels.length - 1, i + (t > 0 ? 1 : -1)))];
  }
  return t < 0 ? `${opponent.name} is feeling gentle today.` : `${opponent.name} is in a competitive mood.`;
}
// Settings -> Battles -> Adjust to my results.
function syncAdaptiveToggle() { const el = document.getElementById('adaptiveToggle'); if (el) el.classList.toggle('on', adaptOn()); }
(function wireAdaptive() {
  const el = document.getElementById('adaptiveToggle'); if (!el) return;
  el.addEventListener('click', () => { prefs.adaptive = !adaptOn(); savePrefs(); syncAdaptiveToggle(); sfx('tap'); });
  syncAdaptiveToggle();
})();
