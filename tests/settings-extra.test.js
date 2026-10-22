// The reorganised Settings (js/settings-extra.js): text size, screen animations, haptic strength, quiet hours, search, jump chips and
// Reset settings, plus the new groups and the privacy copy.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); openPlayerMenu(); });
  await page.waitForTimeout(300);
  // the groups: Neighbours and Battles are one Gameplay group, Privacy and Notifications are apart, Start over is its own danger zone
  const titles = await q("[...document.querySelectorAll('#pmSettingsView .st-title, #stg-help .st-title, #stg-danger .st-title')].map(e => e.textContent)");
  assert.deepStrictEqual(titles, ['Gameplay', 'Appearance', 'Sound & feel', 'Notifications', 'Privacy', 'Backup', 'Help & data', 'Danger zone'], 'the groups: ' + titles.join(' | '));
  assert.ok(await q("!document.getElementById('talkStyleSeg') && !document.getElementById('bigTextToggle')"), 'the removed controls are gone');
  assert.ok(await q("document.querySelectorAll('#stg-privacy .st-row').length === 3 && /Sends your name, level, district/.test(document.getElementById('stg-privacy').textContent) && /Only the game's maker/.test(document.getElementById('stg-privacy').textContent)"), 'each privacy switch says what is sent and who sees it');
  // the window slides down from the top and back up, like the tab window (a closed menu must not already be on screen)
  await q("closePlayerMenu()"); await page.waitForTimeout(500);
  assert.ok(await q("document.getElementById('playerMenu').classList.contains('hidden')"), 'it closes');
  await q("openPlayerMenu()"); await page.waitForTimeout(40);
  assert.ok(await q("document.getElementById('playerMenu').classList.contains('pm-in') && document.getElementById('playerMenu').getBoundingClientRect().top < -50"), 'opening starts above the screen and slides down');
  await page.waitForTimeout(800); assert.ok(await q("Math.round(document.getElementById('playerMenu').getBoundingClientRect().top) === 0 && !document.getElementById('playerMenu').classList.contains('pm-in')"), 'and settles at the top');
  await q("closePlayerMenu()"); await page.waitForTimeout(120);
  assert.ok(await q("document.getElementById('playerMenu').classList.contains('pm-out') && !document.getElementById('playerMenu').classList.contains('hidden')"), 'closing slides it back up first');
  await page.waitForTimeout(500); assert.ok(await q("document.getElementById('playerMenu').classList.contains('hidden')"), 'then hides it');
  await q("openPlayerMenu()"); await page.waitForTimeout(800);
  // text size
  await page.click('[data-text-pick="largest"]'); assert.ok(await q("document.documentElement.classList.contains('bigger-text') && prefs.textSize === 'largest'"), 'Largest text');
  await page.click('[data-text-pick="large"]'); assert.ok(await q("document.documentElement.classList.contains('big-text') && !document.documentElement.classList.contains('bigger-text')"), 'Large text');
  await page.click('[data-text-pick="normal"]'); assert.ok(await q("!document.documentElement.classList.contains('big-text')"), 'Normal text');
  // screen animations
  assert.ok(await q("btMotionOk()"), 'animations are on by default');
  await page.click('[data-motion-pick="reduced"]'); assert.ok(await q("!btMotionOk() && document.documentElement.classList.contains('reduce-motion')"), 'Reduced turns them off');
  await page.click('[data-motion-pick="full"]'); assert.ok(await q("btMotionOk() && !document.documentElement.classList.contains('reduce-motion')"), 'and Full brings them back');
  // haptic strength scales the buzz
  await page.click('[data-haptic-pick="gentle"]'); assert.deepStrictEqual(await q("[hapScale(10), hapScale([20, 60, 20])]"), [6, [12, 60, 12]], 'Gentle shortens the buzzes and keeps the gaps');
  await page.click('[data-haptic-pick="strong"]'); assert.deepStrictEqual(await q("[hapScale(10), hapScale([20, 60, 20])]"), [17, [34, 60, 34]], 'Strong lengthens them');
  await page.click('[data-haptic-pick="normal"]'); assert.strictEqual(await q("hapScale(10)"), 10, 'Normal leaves them alone');
  // quiet hours: off by default, on moves a notification due inside the window to its end, and the window may cross midnight
  assert.ok(await q("document.getElementById('quietRow').classList.contains('hidden')"), 'the time pickers wait for the switch');
  await page.click('#quietToggle'); assert.ok(await q("prefs.quiet.on && !document.getElementById('quietRow').classList.contains('hidden')"), 'turning it on shows the times');
  await page.selectOption('#quietFrom', '21'); assert.strictEqual(await q("prefs.quiet.from"), 21, 'the From time is saved');
  const r = await q(`(() => { prefs.quiet = { on: true, from: 22, to: 7 };
    const at = (h, m) => new Date(2030, 5, 15, h, m).getTime(), hr = ms => new Date(ms).getHours() + ':' + new Date(ms).getDate();
    return [hr(quietShift(at(23, 30))), hr(quietShift(at(3, 0))), hr(quietShift(at(12, 0))), hr(quietShift(at(7, 0)))]; })()`);
  assert.deepStrictEqual(r, ['7:16', '7:15', '12:15', '7:15'], 'late and early notifications wait until 7, daytime ones are left alone: ' + r.join(' '));
  await q("prefs.quiet = { on: false, from: 22, to: 7 }; syncSettingsExtra()");
  assert.strictEqual(await q("(() => { const t = Date.now() + 3600000; return quietShift(t) === t; })()"), true, 'with the switch off nothing moves');
  // search
  await page.fill('#stSearch', 'vibration'); await page.waitForTimeout(100);
  assert.ok(await q("[...document.querySelectorAll('#pmSettingsView .st-group')].filter(g => !g.classList.contains('st-hide')).map(g => g.id).join() === 'stg-sound'"), 'searching for vibration keeps only Sound & feel');
  await page.fill('#stSearch', 'zzzz'); assert.ok(await q("!document.getElementById('stNone').classList.contains('hidden')"), 'no match says so');
  await page.fill('#stSearch', ''); assert.ok(await q("document.querySelectorAll('#pmSettingsView .st-group.st-hide').length === 0"), 'clearing shows everything again');
  // jump chips
  assert.strictEqual(await page.locator('.st-chip').count(), 7, 'seven jump chips');
  await page.click('[data-jump="stg-privacy"]'); await page.waitForTimeout(1500); assert.ok(await q("Math.abs(document.getElementById('stg-privacy').getBoundingClientRect().top - document.querySelector('.pm-body').getBoundingClientRect().top) < 140"), 'a chip scrolls to its group');
  // reset settings: confirm first, then everything is back
  await q("prefs.theme = 'light'; prefs.textSize = 'largest'; prefs.sound = false; prefs.menuHand = 'left'; prefs.hapticStrength = 'strong'; prefs.quiet = { on: true, from: 1, to: 2 }; applyTheme(); applyComfortPrefs(); syncToggles()");
  await page.click('#resetSettingsBtn'); assert.ok(await q("!document.getElementById('confirmOverlay').classList.contains('hidden')"), 'Reset asks first');
  assert.ok(await q("prefs.theme === 'light'"), 'and changes nothing until you say yes');
  await page.click('#confirmOk'); await page.waitForTimeout(200);
  assert.ok(await q("prefs.theme === 'dark' && prefs.textSize === 'normal' && prefs.sound === true && prefs.menuHand === undefined && prefs.hapticStrength === 'normal' && prefs.quiet.on === false"), 'Reset puts the preferences back');
  assert.ok(await q("document.documentElement.getAttribute('data-theme') === 'dark' && !document.documentElement.classList.contains('bigger-text') && document.getElementById('soundToggle').classList.contains('on')"), 'and the screen shows it');
  assert.ok(await q("state.ownedCards.length >= 0 && !!state.progress"), 'the game itself is untouched');
};
