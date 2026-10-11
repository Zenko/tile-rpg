// The neighbour card is three tabs (Talk / Play / Gift): one pane visible at a time, Gift only with something to give,
// and a gift's thank-you is spoken back on the Talk tab.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const vis = sel => ev(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.hidden'); }, sel);
  await ev(() => { switchTab('town'); state.progress.bread = 0; openTalk({ id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 }); });
  assert.ok(await vis('#talkMain'), 'opens on the Talk tab');
  assert.ok(!(await vis('#talkFight')), 'the match button is on Play, not Talk');
  assert.ok(await ev(() => document.querySelector('[data-tab="gift"]').classList.contains('hidden')), 'no Gift tab with nothing to give');
  await ev(() => document.querySelector('[data-tab="play"]').click());
  assert.ok(await vis('#talkFight') && !(await vis('#talkMain')), 'Play shows the match button only');
  await ev(() => { state.progress.bread = 2; renderTalk(); });
  assert.ok(await ev(() => !document.querySelector('[data-tab="gift"]').classList.contains('hidden')), 'a loaf makes the Gift tab appear');
  await ev(() => document.querySelector('[data-tab="gift"]').click());
  assert.ok(await vis('#talkGift'), 'Gift shows the loaf');
  await ev(() => document.querySelector('#talkGift').click());
  assert.ok(await vis('#talkText') && await ev(() => document.querySelector('[data-tab="talk"]').classList.contains('on')), 'the thank-you comes back on the Talk tab');
  await ev(() => closeTalk());
  await ev(() => openTalk({ id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 }));
  assert.ok(await ev(() => document.querySelector('[data-tab="talk"]').classList.contains('on')), 'reopening starts on Talk again');
};
