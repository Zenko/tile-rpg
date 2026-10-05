/* ============================================================
   ICON SWAP: replace any emoji icon, everywhere, with your own picture (build 128).
   The game draws its icons as emoji written all over the code (about 400 different ones, 2,000 places). Rather than editing each one, this layer
   watches the page and swaps a mapped emoji for an <img> the moment it appears, so every screen, dialog and toast follows. With nothing mapped it
   does nothing at all (no observer is even started).
   Icon ids are the emoji's code points in hex without the variation selector (the wrapped present is 1f381); assets/icons/manifest.js lists every
   icon in the game with its id and file name (regenerate it with scripts/icon-inventory.py).
   Keyword icons can be replaced one by one even though they share emoji with other things (the leaf on Rest is also the Grove leaf): a replaced
   keyword's icon text gets invisible marker characters appended, which this layer recognises.
   Two sources of replacements:
     ICON_ART / KW_ART below   the approved, committed ones (id -> file path). Empty until art is approved.
     the Asset Lab preview     asset-lab.html can store a preview pack in this browser's localStorage ('tr-icon-preview'); while it is switched on,
                               the game uses it and shows an "Icon preview" pill with an Exit button. Only affects the browser that made it.
   ============================================================ */
(function () {
  // Written by scripts/build-art.js between the markers (the clean gradient art, drawn in scripts/art/). Add anything by hand outside them.
  var ICON_ART = {   // icon id -> picture, e.g. '1f381': 'assets/icons/icon-wrapped-present.png'
    /* BEGIN GENERATED ICON_ART */
    '1f0cf': 'assets/icons/icon-playing-card-black-joker.png',
    '1f300': 'assets/icons/icon-cyclone.png',
    '1f305': 'assets/icons/icon-sunrise.png',
    '1f308': 'assets/icons/icon-rainbow.png',
    '1f30a': 'assets/icons/icon-water-wave.png',
    '1f30c': 'assets/icons/icon-milky-way.png',
    '1f315': 'assets/icons/icon-full-moon-symbol.png',
    '1f319': 'assets/icons/icon-crescent-moon.png',
    '1f31e': 'assets/icons/icon-sun-with-face.png',
    '1f31f': 'assets/icons/icon-glowing-star.png',
    '1f320': 'assets/icons/icon-shooting-star.png',
    '1f326': 'assets/icons/icon-white-sun-behind-cloud-with-rain.png',
    '1f327': 'assets/icons/icon-cloud-with-rain.png',
    '1f329': 'assets/icons/icon-cloud-with-lightning.png',
    '1f32b': 'assets/icons/icon-fog.png',
    '1f32c': 'assets/icons/icon-wind-blowing-face.png',
    '1f330': 'assets/icons/icon-chestnut.png',
    '1f331': 'assets/icons/icon-seedling.png',
    '1f332': 'assets/icons/icon-evergreen-tree.png',
    '1f333': 'assets/icons/icon-deciduous-tree.png',
    '1f335': 'assets/icons/icon-cactus.png',
    '1f336': 'assets/icons/icon-hot-pepper.png',
    '1f337': 'assets/icons/icon-tulip.png',
    '1f338': 'assets/icons/icon-cherry-blossom.png',
    '1f33b': 'assets/icons/icon-sunflower.png',
    '1f33c': 'assets/icons/icon-blossom.png',
    '1f33e': 'assets/icons/icon-ear-of-rice.png',
    '1f33f': 'assets/icons/icon-herb.png',
    '1f340': 'assets/icons/icon-four-leaf-clover.png',
    '1f341': 'assets/icons/icon-maple-leaf.png',
    '1f342': 'assets/icons/icon-fallen-leaf.png',
    '1f343': 'assets/icons/icon-leaf-fluttering-in-wind.png',
    '1f344': 'assets/icons/icon-mushroom.png',
    '1f35e': 'assets/icons/icon-bread.png',
    '1f361': 'assets/icons/icon-dango.png',
    '1f372': 'assets/icons/icon-pot-of-food.png',
    '1f373': 'assets/icons/icon-cooking.png',
    '1f375': 'assets/icons/icon-teacup-without-handle.png',
    '1f37d': 'assets/icons/icon-fork-and-knife-with-plate.png',
    '1f381': 'assets/icons/icon-wrapped-present.png',
    '1f382': 'assets/icons/icon-birthday-cake.png',
    '1f383': 'assets/icons/icon-jack-o-lantern.png',
    '1f384': 'assets/icons/icon-christmas-tree.png',
    '1f386': 'assets/icons/icon-fireworks.png',
    '1f388': 'assets/icons/icon-balloon.png',
    '1f389': 'assets/icons/icon-party-popper.png',
    '1f38b': 'assets/icons/icon-tanabata-tree.png',
    '1f38f': 'assets/icons/icon-carp-streamer.png',
    '1f390': 'assets/icons/icon-wind-chime.png',
    '1f392': 'assets/icons/icon-school-satchel.png',
    '1f397': 'assets/icons/icon-reminder-ribbon.png',
    '1f3a3': 'assets/icons/icon-fishing-pole-and-fish.png',
    '1f3a8': 'assets/icons/icon-artist-palette.png',
    '1f3a9': 'assets/icons/icon-top-hat.png',
    '1f3aa': 'assets/icons/icon-circus-tent.png',
    '1f3ad': 'assets/icons/icon-performing-arts.png',
    '1f3af': 'assets/icons/icon-direct-hit.png',
    '1f3b2': 'assets/icons/icon-game-die.png',
    '1f3b4': 'assets/icons/icon-flower-playing-cards.png',
    '1f3b8': 'assets/icons/icon-guitar.png',
    '1f3c5': 'assets/icons/icon-sports-medal.png',
    '1f3c6': 'assets/icons/icon-trophy.png',
    '1f3d8': 'assets/icons/icon-house-buildings.png',
    '1f3db': 'assets/icons/icon-classical-building.png',
    '1f3e0': 'assets/icons/icon-house-building.png',
    '1f3ea': 'assets/icons/icon-convenience-store.png',
    '1f3ee': 'assets/icons/icon-izakaya-lantern.png',
    '1f3f0': 'assets/icons/icon-european-castle.png',
    '1f3f3': 'assets/icons/icon-waving-white-flag.png',
    '1f3f5': 'assets/icons/icon-rosette.png',
    '1f3f7': 'assets/icons/icon-label.png',
    '1f3fa': 'assets/icons/icon-amphora.png',
    '1f400': 'assets/icons/icon-rat.png',
    '1f407': 'assets/icons/icon-rabbit.png',
    '1f408': 'assets/icons/icon-cat.png',
    '1f408-2b1b': 'assets/icons/icon-cat-black-large-square.png',
    '1f409': 'assets/icons/icon-dragon.png',
    '1f40b': 'assets/icons/icon-whale.png',
    '1f40c': 'assets/icons/icon-snail.png',
    '1f40d': 'assets/icons/icon-snake.png',
    '1f40f': 'assets/icons/icon-ram.png',
    '1f410': 'assets/icons/icon-goat.png',
    '1f414': 'assets/icons/icon-chicken.png',
    '1f419': 'assets/icons/icon-octopus.png',
    '1f41a': 'assets/icons/icon-spiral-shell.png',
    '1f41d': 'assets/icons/icon-honeybee.png',
    '1f41e': 'assets/icons/icon-lady-beetle.png',
    '1f41f': 'assets/icons/icon-fish.png',
    '1f420': 'assets/icons/icon-tropical-fish.png',
    '1f421': 'assets/icons/icon-blowfish.png',
    '1f422': 'assets/icons/icon-turtle.png',
    '1f426': 'assets/icons/icon-bird.png',
    '1f42d': 'assets/icons/icon-mouse-face.png',
    '1f430': 'assets/icons/icon-rabbit-face.png',
    '1f431': 'assets/icons/icon-cat-face.png',
    '1f432': 'assets/icons/icon-dragon-face.png',
    '1f433': 'assets/icons/icon-spouting-whale.png',
    '1f43b': 'assets/icons/icon-bear-face.png',
    '1f440': 'assets/icons/icon-eyes.png',
    '1f441': 'assets/icons/icon-eye.png',
    '1f44b': 'assets/icons/icon-waving-hand-sign.png',
    '1f451': 'assets/icons/icon-crown.png',
    '1f45f': 'assets/icons/icon-athletic-shoe.png',
    '1f463': 'assets/icons/icon-footprints.png',
    '1f469-1f33e': 'assets/icons/icon-woman-ear-of-rice.png',
    '1f479': 'assets/icons/icon-japanese-ogre.png',
    '1f47b': 'assets/icons/icon-ghost.png',
    '1f480': 'assets/icons/icon-skull.png',
    '1f48c': 'assets/icons/icon-love-letter.png',
    '1f48e': 'assets/icons/icon-gem-stone.png',
    '1f49e': 'assets/icons/icon-revolving-hearts.png',
    '1f4a1': 'assets/icons/icon-electric-light-bulb.png',
    '1f4a4': 'assets/icons/icon-sleeping-symbol.png',
    '1f4a7': 'assets/icons/icon-droplet.png',
    '1f4a8': 'assets/icons/icon-dash-symbol.png',
    '1f4ab': 'assets/icons/icon-dizzy-symbol.png',
    '1f4ac': 'assets/icons/icon-speech-balloon.png',
    '1f4c5': 'assets/icons/icon-calendar.png',
    '1f4c8': 'assets/icons/icon-chart-with-upwards-trend.png',
    '1f4cb': 'assets/icons/icon-clipboard.png',
    '1f4cc': 'assets/icons/icon-pushpin.png',
    '1f4cd': 'assets/icons/icon-round-pushpin.png',
    '1f4d3': 'assets/icons/icon-notebook.png',
    '1f4d6': 'assets/icons/icon-open-book.png',
    '1f4dc': 'assets/icons/icon-scroll.png',
    '1f4dd': 'assets/icons/icon-memo.png',
    '1f4e1': 'assets/icons/icon-satellite-antenna.png',
    '1f4e5': 'assets/icons/icon-inbox-tray.png',
    '1f4e6': 'assets/icons/icon-package.png',
    '1f4ec': 'assets/icons/icon-open-mailbox-with-raised-flag.png',
    '1f4ee': 'assets/icons/icon-postbox.png',
    '1f4ef': 'assets/icons/icon-postal-horn.png',
    '1f505': 'assets/icons/icon-low-brightness-symbol.png',
    '1f506': 'assets/icons/icon-high-brightness-symbol.png',
    '1f50d': 'assets/icons/icon-left-pointing-magnifying-glass.png',
    '1f512': 'assets/icons/icon-lock.png',
    '1f514': 'assets/icons/icon-bell.png',
    '1f525': 'assets/icons/icon-fire.png',
    '1f526': 'assets/icons/icon-electric-torch.png',
    '1f528': 'assets/icons/icon-hammer.png',
    '1f52e': 'assets/icons/icon-crystal-ball.png',
    '1f535': 'assets/icons/icon-large-blue-circle.png',
    '1f537': 'assets/icons/icon-large-blue-diamond.png',
    '1f54a': 'assets/icons/icon-dove-of-peace.png',
    '1f56f': 'assets/icons/icon-candle.png',
    '1f573': 'assets/icons/icon-hole.png',
    '1f58c': 'assets/icons/icon-lower-left-paintbrush.png',
    '1f590': 'assets/icons/icon-raised-hand-with-fingers-splayed.png',
    '1f5bc': 'assets/icons/icon-frame-with-picture.png',
    '1f5d1': 'assets/icons/icon-wastebasket.png',
    '1f5dd': 'assets/icons/icon-old-key.png',
    '1f5fa': 'assets/icons/icon-world-map.png',
    '1f5fb': 'assets/icons/icon-mount-fuji.png',
    '1f5fc': 'assets/icons/icon-tokyo-tower.png',
    '1f5ff': 'assets/icons/icon-moyai.png',
    '1f634': 'assets/icons/icon-sleeping-face.png',
    '1f642': 'assets/icons/icon-slightly-smiling-face.png',
    '1f648': 'assets/icons/icon-see-no-evil-monkey.png',
    '1f6a9': 'assets/icons/icon-triangular-flag-on-post.png',
    '1f6aa': 'assets/icons/icon-door.png',
    '1f6ab': 'assets/icons/icon-no-entry-sign.png',
    '1f6bf': 'assets/icons/icon-shower.png',
    '1f6cd': 'assets/icons/icon-shopping-bags.png',
    '1f6ce': 'assets/icons/icon-bellhop-bell.png',
    '1f6e1': 'assets/icons/icon-shield.png',
    '1f6e2': 'assets/icons/icon-oil-drum.png',
    '1f91d': 'assets/icons/icon-handshake.png',
    '1f940': 'assets/icons/icon-wilted-flower.png',
    '1f947': 'assets/icons/icon-first-place-medal.png',
    '1f948': 'assets/icons/icon-second-place-medal.png',
    '1f949': 'assets/icons/icon-third-place-medal.png',
    '1f950': 'assets/icons/icon-croissant.png',
    '1f956': 'assets/icons/icon-baguette-bread.png',
    '1f958': 'assets/icons/icon-shallow-pan-of-food.png',
    '1f980': 'assets/icons/icon-crab.png',
    '1f981': 'assets/icons/icon-lion-face.png',
    '1f984': 'assets/icons/icon-unicorn-face.png',
    '1f985': 'assets/icons/icon-eagle.png',
    '1f987': 'assets/icons/icon-bat.png',
    '1f989': 'assets/icons/icon-owl.png',
    '1f98a': 'assets/icons/icon-fox-face.png',
    '1f98b': 'assets/icons/icon-butterfly.png',
    '1f98c': 'assets/icons/icon-deer.png',
    '1f991': 'assets/icons/icon-squid.png',
    '1f994': 'assets/icons/icon-hedgehog.png',
    '1f9a1': 'assets/icons/icon-badger.png',
    '1f9a2': 'assets/icons/icon-swan.png',
    '1f9a6': 'assets/icons/icon-otter.png',
    '1f9ad': 'assets/icons/icon-seal.png',
    '1f9ca': 'assets/icons/icon-ice-cube.png',
    '1f9d1': 'assets/icons/icon-adult.png',
    '1f9d1-1f373': 'assets/icons/icon-adult-cooking.png',
    '1f9d3': 'assets/icons/icon-older-adult.png',
    '1f9d8': 'assets/icons/icon-person-in-lotus-position.png',
    '1f9d9': 'assets/icons/icon-mage.png',
    '1f9e9': 'assets/icons/icon-jigsaw-puzzle-piece.png',
    '1f9ed': 'assets/icons/icon-compass.png',
    '1f9f0': 'assets/icons/icon-toolbox.png',
    '1f9f1': 'assets/icons/icon-brick.png',
    '1f9f3': 'assets/icons/icon-luggage.png',
    '1f9f5': 'assets/icons/icon-spool-of-thread.png',
    '1f9f6': 'assets/icons/icon-ball-of-yarn.png',
    '1f9fa': 'assets/icons/icon-basket.png',
    '1fa81': 'assets/icons/icon-kite.png',
    '1fa91': 'assets/icons/icon-chair.png',
    '1fa99': 'assets/icons/icon-coin.png',
    '1faa2': 'assets/icons/icon-knot.png',
    '1faa3': 'assets/icons/icon-bucket.png',
    '1faa7': 'assets/icons/icon-placard.png',
    '1faa8': 'assets/icons/icon-rock.png',
    '1faad': 'assets/icons/icon-u1faad.png',
    '1fab1': 'assets/icons/icon-worm.png',
    '1fab2': 'assets/icons/icon-beetle.png',
    '1fab4': 'assets/icons/icon-potted-plant.png',
    '1fab5': 'assets/icons/icon-wood.png',
    '1fab6': 'assets/icons/icon-feather.png',
    '1fab7': 'assets/icons/icon-lotus.png',
    '1fabc': 'assets/icons/icon-u1fabc.png',
    '1fabd': 'assets/icons/icon-u1fabd.png',
    '1fad6': 'assets/icons/icon-teapot.png',
    '1fad8': 'assets/icons/icon-beans.png',
    '1fad9': 'assets/icons/icon-jar.png',
    '1fae7': 'assets/icons/icon-bubbles.png',
    '2600': 'assets/icons/icon-black-sun-with-rays.png',
    '2601': 'assets/icons/icon-cloud.png',
    '2604': 'assets/icons/icon-comet.png',
    '2694': 'assets/icons/icon-crossed-swords.png',
    '2696': 'assets/icons/icon-scales.png',
    '2699': 'assets/icons/icon-gear.png',
    '26c8': 'assets/icons/icon-thunder-cloud-and-rain.png',
    '26e9': 'assets/icons/icon-shinto-shrine.png',
    '26f0': 'assets/icons/icon-mountain.png',
    '270f': 'assets/icons/icon-pencil.png',
    '2728': 'assets/icons/icon-sparkles.png',
    '2744': 'assets/icons/icon-snowflake.png',
    '2764': 'assets/icons/icon-heavy-black-heart.png',
    '2b50': 'assets/icons/icon-white-medium-star.png',
    /* END GENERATED ICON_ART */
  };
  var KW_ART = {     // keyword id -> picture, e.g. guard: 'assets/icons/kw-guard.png'
    /* BEGIN GENERATED KW_ART */
    guard: 'assets/icons/kw-guard.png',
    swift: 'assets/icons/kw-swift.png',
    mend: 'assets/icons/kw-mend.png',
    bloom: 'assets/icons/kw-bloom.png',
    shield: 'assets/icons/kw-shield.png',
    echo: 'assets/icons/kw-echo.png',
    thorns: 'assets/icons/kw-thorns.png',
    rally: 'assets/icons/kw-rally.png',
    drain: 'assets/icons/kw-drain.png',
    seed: 'assets/icons/kw-seed.png',
    lull: 'assets/icons/kw-lull.png',
    kin: 'assets/icons/kw-kin.png',
    sting: 'assets/icons/kw-sting.png',
    /* END GENERATED KW_ART */
  };
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
