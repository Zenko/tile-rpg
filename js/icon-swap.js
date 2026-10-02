/* ============================================================
   ICON SWAP: replace any emoji icon, everywhere, with your own picture (build 128).
   The game draws its icons as emoji written all over the code (about 400 different ones, 2,000 places). Rather than editing each one, this layer
   watches the page and swaps a mapped emoji for an <img> the moment it appears, so every screen, dialog and toast follows. With nothing mapped it
   does nothing at all (no observer is even started).
   Icon ids are the emoji's code points in hex without the variation selector (the wrapped present is 1f381); assets/icons/manifest.js lists every
   icon in the game with its id and file name (regenerate it with scripts/icon-inventory.py).
   Keyword icons can be replaced one by one even though they share emoji with other things (the leaf on Mend is also the Grove leaf): a replaced
   keyword's icon text gets invisible marker characters appended, which this layer recognises.
   Two sources of replacements:
     ICON_ART / KW_ART below   the approved, committed ones (id -> file path). Empty until art is approved.
     the Asset Lab preview     asset-lab.html can store a preview pack in this browser's localStorage ('tr-icon-preview'); while it is switched on,
                               the game uses it and shows an "Icon preview" pill with an Exit button. Only affects the browser that made it.
   ============================================================ */
(function () {
  var ICON_ART = {};   // e.g. { '1f381': 'assets/icons/wrapped-present.png' }
  var KW_ART = {};     // e.g. { guard: 'assets/icons/kw-guard.png' }
  var MARK = '⁣';  // invisible separator: n of them after a keyword's emoji = "keyword number n"
  var KW_IDS = (typeof KW !== 'undefined') ? Object.keys(KW) : [];
  var KW_ORIG = {}; KW_IDS.forEach(function (k) { KW_ORIG[k] = KW[k].icon; });
  var PIC = '[\\u2190-\\u21FF\\u2300-\\u23FF\\u25A0-\\u25FF\\u2600-\\u27BF\\u2900-\\u297F\\u2B00-\\u2BFF\\u3030\\u303D\\u3297\\u3299\\u{1F000}-\\u{1FAFF}]';
  var TONE = '[\\uFE0F\\u{1F3FB}-\\u{1F3FF}]*';
  var RX_SRC = '(?:[0-9#*]\\uFE0F?\\u20E3|[\\u{1F1E6}-\\u{1F1FF}]{2}|' + PIC + TONE + '(?:\\u200D' + PIC + TONE + ')*)(' + MARK + '*)';
  var map = {}, kw = {}, started = false, obs = null, queue = [], raf = 0;
  var SKIP_TAG = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE|NOSCRIPT|CANVAS|CODE|PRE)$/;

  function keyOf(s) { var out = [], i = 0, cps = Array.from(s); for (; i < cps.length; i++) { var c = cps[i].codePointAt(0); if (c === 0xFE0F) continue; out.push(c === 0x200D ? '-' : c.toString(16)); } return out.join('').replace(/-/g, '-'); }
  function skipped(n) { for (var e = n.parentNode; e && e.nodeType === 1; e = e.parentNode) { if (SKIP_TAG.test(e.tagName) || (e.namespaceURI === 'http://www.w3.org/2000/svg' && e.tagName !== 'foreignObject') || e.hasAttribute('data-no-icon-swap')) return true; } return false; }

  function swapText(tn) {
    var t = tn.nodeValue; if (!t || t.length > 4000) return;
    var rx = new RegExp(RX_SRC, 'gu'), m, last = 0, frag = null;
    while ((m = rx.exec(t))) {
      var glyph = m[0].slice(0, m[0].length - m[1].length), url = null;
      if (m[1].length) { var id = KW_IDS[m[1].length - 1]; url = kw[id] || null; } else url = map[keyOf(glyph)] || null;
      if (!url) continue;
      if (!frag) { if (skipped(tn)) return; frag = document.createDocumentFragment(); }
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      var img = document.createElement('img'); img.className = 'ico-swap'; img.alt = glyph; img.src = url; img.draggable = false; img.setAttribute('data-o', m[0]);
      frag.appendChild(img); last = m.index + m[0].length;
    }
    if (frag) { if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last))); if (tn.parentNode) tn.parentNode.replaceChild(frag, tn); }
  }
  function scan(root) {
    if (!started || !root) return;
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var w = document.createTreeWalker(root, 4, null), n, list = [];
    while ((n = w.nextNode())) { if (n.nodeValue && n.nodeValue.length > 0 && /[^\x00-↏]|[←-⇿]/.test(n.nodeValue)) list.push(n); }
    list.forEach(swapText);
  }
  function flush() {
    raf = 0; if (!obs) return;
    obs.disconnect(); var q = queue; queue = [];
    q.forEach(function (n) { if (n.isConnected) scan(n); });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function start() {
    if (started || !document.body) return; started = true;
    obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) { if (m.type === 'characterData') queue.push(m.target); else m.addedNodes.forEach(function (n) { if (n.nodeType === 1 || n.nodeType === 3) queue.push(n); }); });
      if (!raf) raf = requestAnimationFrame(flush);
    });
    scan(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function stop() { if (obs) { obs.disconnect(); obs = null; } started = false; queue = []; }
  function restoreAll(root) { (root || document).querySelectorAll('img.ico-swap').forEach(function (img) { img.replaceWith(document.createTextNode(img.getAttribute('data-o') || img.alt)); }); }
  function applyKeywordMarkers() { KW_IDS.forEach(function (k, i) { KW[k].icon = kw[k] ? KW_ORIG[k] + new Array(i + 2).join(MARK) : KW_ORIG[k]; }); }
  /* configure({ map: { iconId: url }, kw: { keywordId: url } }): replaces the active set; an empty set switches the layer off */
  function configure(o) {
    o = o || {}; map = {}; kw = {};
    Object.keys(o.map || {}).forEach(function (k) { if (o.map[k]) map[k] = o.map[k]; });
    Object.keys(o.kw || {}).forEach(function (k) { if (o.kw[k] && KW_ORIG[k] !== undefined) kw[k] = o.kw[k]; });
    applyKeywordMarkers();
    var any = Object.keys(map).length || Object.keys(kw).length;
    if (any) { if (started) scan(document.body); else if (document.body) start(); else document.addEventListener('DOMContentLoaded', start); } else stop();
  }
  window.IconSwap = { configure: configure, scan: function (r) { scan(r || document.body); }, restoreAll: restoreAll, keyOf: keyOf, MARK: MARK, get active() { return started; } };

  /* ---- the game itself: committed art, plus the Asset Lab's preview pack when it is switched on ---- */
  if (!window.ICON_SWAP_NO_AUTOLOAD) {   // the Asset Lab sets this flag so it can drive the layer itself
    var pack = null;
    try { var raw = localStorage.getItem('tr-icon-preview'); pack = raw ? JSON.parse(raw) : null; } catch (e) { pack = null; }
    var on = pack && pack.on;
    var m = {}, k = {}; Object.keys(ICON_ART).forEach(function (i) { m[i] = ICON_ART[i]; }); Object.keys(KW_ART).forEach(function (i) { k[i] = KW_ART[i]; });
    if (on) { Object.keys(pack.map || {}).forEach(function (i) { m[i] = pack.map[i]; }); Object.keys(pack.kw || {}).forEach(function (i) { k[i] = pack.kw[i]; }); }
    configure({ map: m, kw: k });
    if (on) {
      var pill = function () {
        var p = document.createElement('div'); p.className = 'ico-pill'; p.setAttribute('data-no-icon-swap', '');
        p.innerHTML = '<span>Icon preview on</span><button type="button">Exit</button>';
        p.querySelector('button').onclick = function () { try { var q = JSON.parse(localStorage.getItem('tr-icon-preview') || '{}'); q.on = false; localStorage.setItem('tr-icon-preview', JSON.stringify(q)); } catch (e) {} location.reload(); };
        document.body.appendChild(p);
      };
      if (document.body) pill(); else document.addEventListener('DOMContentLoaded', pill);
    }
  }
})();
