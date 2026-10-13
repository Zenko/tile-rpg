// Build 248: the "Weather alerts" setting - weather keeps moving while the game is hidden, and each change is announced.
module.exports = async (page, assert) => {
  const r = await page.evaluate(async () => {
    const out = {}, sent = [], realNotify = localNotify, realPerm = Object.getOwnPropertyDescriptor(Notification, 'permission');
    localNotify = (title, body, tag, pref) => sent.push({ title, body, tag, pref });
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
    let hidden = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    const hide = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
    const setW = () => { state.weather = { current: 'clear', next: 'rain', elapsed: 1000, changesAt: 1500 }; };
    try {
      // the switch turns it on (permission is granted here) and persists in prefs
      prefs.weatherAlerts = false; syncToggles();
      document.getElementById('weatherAlertsToggle').click(); await new Promise(r => setTimeout(r, 50));
      out.toggledOn = prefs.weatherAlerts && document.getElementById('weatherAlertsToggle').classList.contains('on');

      // off: hiding the game arms nothing and the weather does not move
      prefs.weatherAlerts = false; setW(); hide(true);
      out.offTimer = !!weatherAwayTimer; weatherAwayStep(); out.offStill = state.weather.current === 'clear' && state.weather.elapsed === 1000; hide(false);

      // on: hiding arms one timer; a step after the change time rolls the weather and sends exactly one notification
      prefs.weatherAlerts = true; setW(); hide(true);
      out.onTimer = !!weatherAwayTimer;
      weatherAwayAt = Date.now() - 2000; weatherAwayStep();
      out.after = state.weather.current; out.sent = sent.length; out.msg = sent[0];
      out.rearmed = !!weatherAwayTimer;
      // a step before the change time moves the clock but sends nothing
      sent.length = 0; state.weather.changesAt = state.weather.elapsed + 600000; weatherAwayAt = Date.now() - 1000; const before = state.weather.current; weatherAwayStep();
      out.quiet = sent.length === 0 && state.weather.current === before;
      // coming back stops the timer
      hide(false); out.stopped = !weatherAwayTimer;
      // hidden time is capped
      prefs.weatherAlerts = true; setW(); state.weather.changesAt = 1e12; hide(true); weatherAwayAt = Date.now() - 10 * 3600 * 1000; weatherAwayStep();
      out.capped = state.weather.elapsed <= 1000 + WEATHER_AWAY_CAP_MS + 1000; hide(false);
    } finally {
      localNotify = realNotify; delete document.hidden; weatherAwayStop(); prefs.weatherAlerts = false;
      if (realPerm) Object.defineProperty(Notification, 'permission', realPerm);
    }
    return out;
  });
  assert.ok(r.toggledOn, 'the Weather alerts switch turns on: ' + JSON.stringify(r));
  assert.ok(!r.offTimer && r.offStill, 'with alerts off nothing runs in the background: ' + JSON.stringify(r));
  assert.ok(r.onTimer && r.after === 'rain' && r.sent === 1 && r.msg.tag === 'weather' && r.msg.pref === 'weatherAlerts' && /Moonrain/.test(r.msg.title + r.msg.body) && r.rearmed, 'a change while hidden sends one weather notification and sets the next timer: ' + JSON.stringify(r));
  assert.ok(r.quiet && r.stopped, 'no change, no notification; coming back stops the timer: ' + JSON.stringify(r));
  assert.ok(r.capped, 'a long hidden stretch is capped: ' + JSON.stringify(r));
};
