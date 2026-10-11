/* ============================================================
   ADAPTIVE DIFFICULTY (build 221)
   A calm game should not feel hopeless after a bad run or trivial after a good one. This keeps the results of your last few matches against
   plain neighbours and district bosses (state.progress.form.recent: 1 = win, 0 = loss; yields and every special match do not count) and turns
   them into a small "tilt" from -2 (struggling) to +2 (cruising), used when the next opponent is set up. Each tilt step does two small things:
     opponent Calm: 1 less (struggling) or 1 more (cruising) per step     AI mistakes (G.aiShift, see aiNextAction): a step makes it play a random move
     12 percentage points more often (struggling) or less often (cruising), so two steps are 25 points
   Measured against the real engine (tune pass, build 231): one step moves your win rate about 5-10 points and two steps about 10-17, smoothly, at any AI
   level, where the old "one AI level easier/smarter" step moved it 17 points at once and the Calm change alone was lost in the noise. Bosses are never made
   harder, three losses in a row is always at least -2, it needs 3 results before it does anything, the Calm floor is 12 and a plain 'smart' AI cannot be sharpened
   further (it already never errs). It can be switched off (Settings -> Battles).
   When it is nudging, the versus screen says so in the opponent's own words ("feeling gentle today", "in a competitive mood"), so it never
   feels hidden. Tuned by the tilt table above and ADAPT; nothing else in the engine knows about it.
   ============================================================ */
const ADAPT = { window: 8, min: 3, target: 0.6, shiftPerStep: 0.125, minSpirit: 12 };
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
// Nudge an opponent's profile ({ level, spirit }) in place and set profile.shift (the AI's mistake-rate change). Returns a short mood line when it changed something, else ''.
function adaptApply(profile, opponent, isBoss) {
  let t = adaptTilt();
  if (isBoss && t > 0) t = 0;                                   // bosses are never made harder
  if (!t) return '';
  profile.spirit = Math.max(ADAPT.minSpirit, profile.spirit + t);
  profile.shift = -t * ADAPT.shiftPerStep;                      // struggling (t < 0) -> more mistakes; cruising (t > 0) -> fewer
  return t < 0 ? `${opponent.name} is feeling gentle today.` : `${opponent.name} is in a competitive mood.`;
}
// Settings -> Battles -> Adjust to my results.
function syncAdaptiveToggle() { const el = document.getElementById('adaptiveToggle'); if (el) el.classList.toggle('on', adaptOn()); }
(function wireAdaptive() {
  const el = document.getElementById('adaptiveToggle'); if (!el) return;
  el.addEventListener('click', () => { prefs.adaptive = !adaptOn(); savePrefs(); syncAdaptiveToggle(); sfx('tap'); });
  syncAdaptiveToggle();
})();
