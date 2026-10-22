/* ============================================================
   SETTINGS, THE EXTRAS (build 318): what was added when the Settings screen was reorganised into Gameplay, Appearance, Sound & feel,
   Notifications, Privacy, Backup and Help & data. The switches and sliders that were already there still live in js/titles.js and friends;
   this file holds the new things:
     - Search and jump chips at the top (filters the rows by their words and by each group's data-kw keywords)
     - Text size (Normal / Large / Largest, with a sample line; the old on/off Larger text became Large)
     - Screen animations (Full / Reduced: prefs.motion, read by btMotionOk in js/battle-ui.js, plus html.reduce-motion)
     - Haptic strength (Gentle / Normal / Strong: prefs.hapticStrength, scaled in buzz() in js/audio.js; picking one buzzes a sample)
     - Quiet hours (prefs.quiet {on, from, to}: scheduleLocalNotify moves anything due in the window to its end, quietShift in js/audio.js)
     - Reset settings (with a confirm): every preference on this screen back to how it started. The game and the save are not touched.
   Preferences are the small `prefs` object in localStorage, never the save, so none of this travels with Back up / Restore.
   ============================================================ */
const SETTINGS_DEFAULTS = { sound: true, haptics: true, music: true, musicVol: 0.5, sfxVol: 0.7, notifs: false, weatherAlerts: false, sharePresence: true, presenceChosen: false, ambient: true, theme: 'dark',
  textSize: 'normal', motion: 'full', hapticStrength: 'normal', quiet: { on: false, from: 22, to: 7 } };
const SETTINGS_CLEARED = ['approach', 'menuHand', 'charFx', 'shareStats', 'shareDeck', 'adaptive', 'talkStyle'];   // not stored when they are at their default

/* ---- the sync: show the saved choices ---- */
function syncSettingsExtra() {
  const seg = (id, attr, val) => document.querySelectorAll(`#${id} .seg-btn`).forEach(b => b.classList.toggle('active', b.dataset[attr] === val));
  seg('textSeg', 'textPick', prefs.textSize); seg('motionSeg', 'motionPick', prefs.motion); seg('hapticSeg', 'hapticPick', prefs.hapticStrength);
  const q = prefs.quiet, qt = document.getElementById('quietToggle'); if (!qt) return;
  qt.classList.toggle('on', q.on);
  document.getElementById('quietFrom').value = String(q.from); document.getElementById('quietTo').value = String(q.to);
  document.getElementById('quietRow').classList.toggle('hidden', !q.on);
}

/* ---- text size, screen animations, haptic strength ---- */
document.querySelectorAll('#textSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  prefs.textSize = b.dataset.textPick; savePrefs(); applyComfortPrefs(); syncSettingsExtra(); sfx('tap');
  if (typeof renderTown === 'function' && !inBattle) renderTown();
}));
document.querySelectorAll('#motionSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  prefs.motion = b.dataset.motionPick; savePrefs(); applyComfortPrefs(); syncSettingsExtra(); sfx('tap');
}));
document.querySelectorAll('#hapticSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  prefs.hapticStrength = b.dataset.hapticPick; savePrefs(); syncSettingsExtra(); sfx('tap');
  if (prefs.haptics) buzz(HAP.win);   // a sample at the new strength
}));

/* ---- quiet hours ---- */
document.getElementById('quietToggle').addEventListener('click', () => {
  prefs.quiet.on = !prefs.quiet.on; savePrefs(); syncSettingsExtra(); sfx('tap');
  if (typeof scheduleAllPendingNotifs === 'function') scheduleAllPendingNotifs();   // re-time whatever is already waiting
});
[['quietFrom', 'from'], ['quietTo', 'to']].forEach(([id, k]) => document.getElementById(id).addEventListener('change', e => {
  prefs.quiet[k] = +e.target.value; savePrefs(); sfx('tap'); if (typeof scheduleAllPendingNotifs === 'function') scheduleAllPendingNotifs();
}));

/* ---- search and jump chips ---- */
const ST_GROUPS = [['gameplay', 'Gameplay'], ['look', 'Appearance'], ['sound', 'Sound'], ['notify', 'Alerts'], ['privacy', 'Privacy'], ['backup', 'Backup'], ['help', 'Help']];
document.getElementById('stJump').innerHTML = ST_GROUPS.map(([id, t]) => `<button type="button" class="st-chip" data-jump="stg-${id}">${t}</button>`).join('');
document.getElementById('stJump').addEventListener('click', e => {
  const c = e.target.closest('[data-jump]'); if (!c) return; sfx('tap');
  const g = document.getElementById(c.dataset.jump); if (g) g.scrollIntoView({ behavior: typeof btMotionOk === 'function' && btMotionOk() ? 'smooth' : 'auto', block: 'start' });
});
// A row matches when the search is in its words; a group stays when any row matches, or its heading or keywords do.
function settingsFilter(q) {
  q = (q || '').trim().toLowerCase(); let any = false;
  document.querySelectorAll('#pmSettingsView .st-group, #stg-help, #stg-danger').forEach(g => {
    const head = (g.querySelector('.st-title').textContent + ' ' + (g.dataset.kw || '')).toLowerCase(), headHit = !q || head.includes(q);
    let rows = 0;
    g.querySelectorAll('.st-card > *').forEach(r => { const hit = !q || headHit || r.textContent.toLowerCase().includes(q); r.classList.toggle('st-hide', !hit); if (hit) rows++; });
    g.classList.toggle('st-hide', rows === 0); if (rows) any = true;
  });
  document.getElementById('stNone').classList.toggle('hidden', any || !q);
  document.getElementById('stJump').classList.toggle('hidden', !!q);
}
document.getElementById('stSearch').addEventListener('input', e => settingsFilter(e.target.value));

/* ---- reset settings ---- */
function resetSettings() {
  Object.keys(prefs).forEach(k => { delete prefs[k]; });
  Object.assign(prefs, JSON.parse(JSON.stringify(SETTINGS_DEFAULTS)));
  SETTINGS_CLEARED.forEach(k => { delete prefs[k]; });
  Object.keys(notifTimers).forEach(k => clearTimeout(notifTimers[k]));
  savePrefs(); applyTheme(); applyComfortPrefs(); applyVolumes(); syncMusic(); if (typeof syncWeatherAudio === 'function') syncWeatherAudio();
  if (typeof syncHandSeg === 'function') syncHandSeg(); if (typeof syncApproachSeg === 'function') syncApproachSeg(); if (typeof syncAdaptiveToggle === 'function') syncAdaptiveToggle();
  if (typeof fanLayout === 'function') { fanLayout(); if (typeof fanDockUpdate === 'function') fanDockUpdate(); }
  if (typeof pfxSync === 'function') { pfxLast = ''; pfxSync(); }
  syncToggles(); if (typeof renderTown === 'function' && !inBattle) renderTown();
  toast('Settings are back to how they started');
}
document.getElementById('resetSettingsBtn').addEventListener('click', () => {
  askConfirm({ title: 'Reset settings?', text: 'Sound, look, notifications and sharing go back to how they started. Your game and save are not touched.', ok: 'Reset' }, () => { resetSettings(); sfx('nav'); });
});

applyComfortPrefs(); syncSettingsExtra();
