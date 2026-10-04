/* ============================================================
   SLIDING TABS (build 103)
   Every segmented control (.seg: Cards, Journal, Rewards, Character, Settings/Social, Deck, theme...) now behaves like the
   bottom dock: a pill slides under the active button, and the content that changes fades in with a short slide in the
   direction of travel. Both are transform/opacity only (width on the tiny pill), so they stay smooth on a busy page.

   It needs no change to the code that switches views: each .seg is watched for its active button changing class. A pill
   element is added to the control, the active button's own fill is made transparent (.has-pill in css/latest.css), and the
   siblings that follow the control (the views it switches between) get the same .tab-in-l/.tab-in-r classes switchTab uses.
   Controls built later (the Character tab's) are picked up by watching the document for new .seg elements.
   Honours reduced motion through btMotionOk().
   ============================================================ */
(function () {
  const motionOk = () => (typeof btMotionOk === 'function' ? btMotionOk() : true);
  const watched = new WeakSet();
  let queued = false;

  function place(seg, instant) {
    const act = seg.querySelector(':scope > .seg-btn.active, :scope > * > .seg-btn.active');
    let pill = seg.querySelector(':scope > .seg-pill');
    if (!act || !seg.offsetWidth || !act.offsetWidth) { if (pill) pill.style.opacity = '0'; return false; }
    if (!pill) { pill = document.createElement('i'); pill.className = 'seg-pill'; pill.setAttribute('aria-hidden', 'true'); seg.insertBefore(pill, seg.firstChild); seg.classList.add('has-pill'); instant = true; }
    if (instant) pill.style.transition = 'none';
    pill.style.opacity = '1';
    pill.style.width = act.offsetWidth + 'px'; pill.style.height = act.offsetHeight + 'px';
    pill.style.transform = `translate3d(${act.offsetLeft}px, ${act.offsetTop}px, 0)`;
    if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    // a scrolling control keeps the active tab in the middle of view
    if (seg.classList.contains('seg-scroll') && seg.scrollWidth > seg.clientWidth) {
      const left = Math.max(0, act.offsetLeft - (seg.clientWidth - act.offsetWidth) / 2);
      if (seg.scrollTo) seg.scrollTo({ left, behavior: instant || !motionOk() ? 'auto' : 'smooth' }); else seg.scrollLeft = left;
    }
    return true;
  }

  // The views a control switches between are the elements after it (or after its wrapper, e.g. the Journal's bar).
  function contentOf(seg) {
    const anchor = seg.parentElement && seg.parentElement.classList.contains('journal-bar') ? seg.parentElement : seg;
    const out = []; for (let n = anchor.nextElementSibling; n; n = n.nextElementSibling) if (!n.hidden && !n.classList.contains('hidden') && !n.hasAttribute('data-keep') && n.offsetParent !== null) out.push(n);
    return out;
  }

  function changed(seg) {
    const buttons = [...seg.querySelectorAll('.seg-btn')], idx = buttons.findIndex(b => b.classList.contains('active'));
    const prev = seg.dataset.segIdx === undefined ? -1 : +seg.dataset.segIdx, visible = seg.offsetWidth > 0;
    if (idx >= 0 && visible) seg.dataset.segIdx = idx;
    const moved = place(seg, prev < 0 || !visible);
    if (!moved || prev < 0 || idx < 0 || idx === prev || !motionOk()) return;
    const cls = idx > prev ? 'tab-in-r' : 'tab-in-l';
    contentOf(seg).forEach(el => { el.classList.remove('tab-in', 'tab-in-r', 'tab-in-l'); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 360); });
  }

  function watch(seg) {
    if (watched.has(seg)) return; watched.add(seg);
    new MutationObserver(() => changed(seg)).observe(seg, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
    if (window.ResizeObserver) new ResizeObserver(() => place(seg, true)).observe(seg);
    changed(seg);
  }
  function scan() { queued = false; document.querySelectorAll('.seg').forEach(watch); }
  function queueScan() { if (!queued) { queued = true; requestAnimationFrame(scan); } }

  scan();
  new MutationObserver(queueScan).observe(document.body, { childList: true, subtree: true });   // controls built later
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('.seg').forEach(s => place(s, true)));
  window.addEventListener('resize', () => document.querySelectorAll('.seg').forEach(s => place(s, true)));
})();
