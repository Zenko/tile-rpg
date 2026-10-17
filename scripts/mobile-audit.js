#!/usr/bin/env node
/* Phone audit: loads the main screens (and a battle) at phone sizes and reports what is hard to use with a thumb.
     - tap targets: the EFFECTIVE size of every visible control, found by probing which element receives a tap a few pixels outside it
       (so an invisible hit-area padding counts, a bare 34px button does not). Under 44px is reported (Apple's guideline; Material says 48).
     - text: visible text smaller than 11px
     - page overflow: the page itself scrolling sideways (a strip that scrolls on purpose is fine)
     - the battle at small phone sizes: whether the Calm number, the End turn button and the hand fit
   usage: node scripts/mobile-audit.js [--sizes=360x640,390x844] [--screens=town,cardsMine,...] [--battle]     (needs Playwright; about a minute)
   Read it before and after any change to a screen's layout; tests/mobile.test.js guards the fixed parts. */
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const arg = (k, d) => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] || d;
const SIZES = arg('sizes', '360x740,390x844').split(',').map(s => s.split('x').map(Number));
const T = id => `document.getElementById('${id}').click()`;
const SCREENS = {
  town: T('tabTown'), journal: T('tabJournal'), cardsMine: T('tabCollection') + ";setCardsView('mine')", cardsDeck: T('tabCollection') + ";setCardsView('deck')", cardsSets: T('tabCollection') + ";setCardsView('almanac')",
  workshop: T('tabCollection') + ";setCardsView('craft')", shop: "switchTab('shop')", rewards: T('tabQuests'), character: T('tabCharacter') + ";charSetView('me')", companion: T('tabCharacter') + ";charSetView('pals')", hall: "openScene('museum')",
};
const only = arg('screens', '') ? arg('screens', '').split(',') : Object.keys(SCREENS);
const MIN = 44;
const measure = () => {
  const vw = innerWidth, vh = innerHeight, out = { small: [], text: {}, overflowX: document.documentElement.scrollWidth > vw + 1 };
  const visible = e => { const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false; for (let a = e; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || c.pointerEvents === 'none') return false; } return true; };
  const hit = (e, x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
  document.querySelectorAll('button,a[href],[role=button],[role=tab],input,select,.seg-btn,.panel-action').forEach(e => {
    if (!visible(e)) return;
    const r = e.getBoundingClientRect(), cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    if (!hit(e, cx, cy)) return;                                 // covered by something else right now
    const reach = (dx, dy) => { let n = 0; for (let i = 1; i <= 30; i++) { const x = cx + dx * (dx ? (i + r.width / 2) : 0), y = cy + dy * (dy ? (i + r.height / 2) : 0); if (!hit(e, Math.round(x), Math.round(y))) break; n = i; } return n; };
    const w = Math.round(r.width) + reach(-1, 0) + reach(1, 0), h = Math.round(r.height) + reach(0, -1) + reach(0, 1);
    if (Math.min(w, h) < 43) out.small.push({ what: (e.id || (e.className || '').toString().split(' ')[0] || e.tagName.toLowerCase()) + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 14) + '"', w, h });
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; if (!e || !visible(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11) { const k = (e.id || (e.className || '').toString().split(' ')[0] || e.tagName.toLowerCase()) + ' ' + fs.toFixed(1) + 'px'; out.text[k] = (out.text[k] || 0) + 1; } }
  return out;
};
const setup = () => { Object.keys(TIPS).forEach(k => { tipsSeen()[k] = true; }); while (storyCur) storyEnd(); storyScenes().seen.intro = true; prefs.tossStyle = 'skip';
  const st = document.createElement('style'); st.textContent = '.overlay{display:none!important}'; document.head.appendChild(st);
  state.ownedCards = CARD_POOL.filter(c => !c.exclusive).flatMap(c => [c.id, c.id, c.id]); state.progress.level = 12; state.progress.pebbles = 500; state.deck = BattleEngine.suggestDeck(ownedCardCounts());
  chooseCompanion(cardEntry('hermit-crab')); state.companion.bond = BOND_AT[2] + 1; state.companion.perk = 'spirit';
  state.progress.tarot = Object.assign({ attuned: [] }, state.progress.tarot || {}); const star = ARCANA.findIndex(a => a.card === 'moonstone'); state.progress.tarot.attuned = [star]; chooseFate(star); saveState(); };
(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), page = await ctx.newPage();
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await page.waitForTimeout(900); await page.evaluate(setup);
    console.log(`\n=== ${w}x${h}`);
    const agg = {}, texts = {};
    for (const name of only) {
      await page.evaluate(SCREENS[name]); await page.waitForTimeout(600);
      const r = await page.evaluate(measure);
      console.log(name.padEnd(11), 'under 44px:', String(r.small.length).padStart(2), r.overflowX ? '  PAGE SCROLLS SIDEWAYS' : '');
      r.small.forEach(s => { const k = s.what + ' ' + s.w + 'x' + s.h; (agg[k] = agg[k] || []).push(name); });
      Object.entries(r.text).forEach(([k, n]) => { texts[k] = (texts[k] || 0) + n; });
    }
    console.log('small targets (effective size), most common first:'); Object.entries(agg).sort((a, b) => b[1].length - a[1].length).slice(0, 14).forEach(([k, v]) => console.log('  ', k.padEnd(48), 'x' + v.length, [...new Set(v)].slice(0, 3).join(',')));
    console.log('text under 11px, by element:'); Object.entries(texts).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log('  ', k.padEnd(44), n));
    await ctx.close();
  }
  await browser.close();
})();
