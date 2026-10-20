// The neighbour screen's message card (js/requests-friendship-rival.js, build 293): a neighbour with a favour to offer, or one you can hand in,
// says it first with Accept / Not now (Hand it in / Later); it comes only when you open that neighbour, once per opening; and in the
// close-up the words sit in their own panel under the face instead of on top of it.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const open = () => ev(() => { const n = ensureDistrictData(state.currentDistrict).npcs.find(n => /^npc-/.test(n.id) && !n.isBoss); window.__n = n; openTalk(n); return n.id; });
  const offering = () => ev(() => document.getElementById('talkCard').classList.contains('offering'));
  await ev(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); prefs.talkStyle = 'combo'; document.querySelectorAll('.overlay').forEach(o => { if (o.id !== 'talkOverlay') o.classList.add('hidden'); }); });

  // nothing to say: the usual screen, no card
  const id = await open(); await page.waitForTimeout(300);
  assert.strictEqual(await offering(), false, 'no favour waiting, so no message card');
  await ev(() => closeTalk());

  // a favour is on offer: the card is the first thing, with the words and the reward
  await ev(i => { reqState().list[i] = { id: i, giver: window.__n.name, kind: 'visit', state: 'open', made: Date.now(), text: 'Could you say hello at the bakery?', hint: 'Step inside.', pebbles: 4, visited: false }; }, id);
  await open(); await page.waitForTimeout(400);
  const c = await ev(() => { const o = document.getElementById('talkOffer'), r = o.getBoundingClientRect(); return { on: document.getElementById('talkCard').classList.contains('offering'), shown: getComputedStyle(o).display !== 'none' && r.height > 40, text: o.textContent, lower: getComputedStyle(document.querySelector('.tk-lower')).display, yes: !!o.querySelector('[data-offer="accept"]'), no: !!o.querySelector('[data-offer="later"]') }; });
  assert.ok(c.on && c.shown && /bakery/.test(c.text) && /Embers|🫧/.test(c.text) && c.lower === 'none' && c.yes && c.no, 'the message card comes first: ' + JSON.stringify(c));

  // Not now puts it away for this opening and leaves the favour open; opening them again brings it back
  await ev(() => document.querySelector('[data-offer="later"]').click()); await page.waitForTimeout(200);
  assert.ok(!(await offering()) && await ev(i => reqState().list[i].state === 'open', id), 'Not now dismisses the card and keeps the favour');
  await ev(() => closeTalk()); await open(); await page.waitForTimeout(300);
  assert.ok(await offering(), 'tapping them again shows the message again');

  // Accept takes the favour
  await ev(() => document.querySelector('[data-offer="accept"]').click()); await page.waitForTimeout(200);
  assert.ok(!(await offering()) && await ev(i => reqState().list[i].state === 'active', id), 'Accept makes it an active favour');

  // finished: the next opening says thank you with Hand it in
  await ev(i => { const r = reqState().list[i]; r.visited = true; }, id);
  await ev(() => closeTalk()); await open(); await page.waitForTimeout(300);
  assert.ok(await offering() && await ev(() => !!document.querySelector('#talkOffer [data-offer="complete"]')), 'a finished favour opens with Hand it in');
  const before = await ev(() => pebbleCount ? pebbleCount() : 0).catch(() => 0);
  await ev(() => document.querySelector('[data-offer="complete"]').click()); await page.waitForTimeout(300);
  assert.ok(!(await offering()) && await ev(i => reqState().list[i].state === 'done', id), 'Hand it in completes it');

  // the words are never on the face: the bubble sits below the picture
  await ev(() => { closeTalk(); delete reqState().list[window.__n.id]; });
  await open(); await page.waitForTimeout(500);
  const g = await ev(() => { const p = document.getElementById('talkPortrait').getBoundingClientRect(), b = document.getElementById('talkBubble').getBoundingClientRect(); return { portraitBottom: p.bottom, bubbleTop: b.top }; });
  assert.ok(g.bubbleTop >= g.portraitBottom - 12, 'the speech panel starts below the neighbour (the picture breathes a few px): ' + JSON.stringify(g));
};
