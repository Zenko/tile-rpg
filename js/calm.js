/* ============================================================
   CALM CORNER (build 104)
   Quiet things to do that score nothing, time nothing and cost nothing. One full-screen overlay (#calmOverlay) shows a hub of
   activities, and each activity draws itself into #calmBody:

     breathe  - a slow orb (in 4, hold 1.5, out 6). Five breaths in a day leave you "Rested": +5% XP until tomorrow.
     sand     - rake a sand garden and place stones. It is saved and comes back as you left it.
     lanterns - after dark, release lanterns into the sky. Every tenth one lifts the town's mood a little.
     chimes   - drag across seven wind chimes tuned to a scale where every note agrees with every other.
     stars    - after dark, tap the stars of a constellation in order. Finished ones are remembered.
     tea      - pour (hold), let it steep, sip, and get one line of quiet.
     bonsai   - a tree that grows by real days (more if you tend it, never less if you don't).
     sit      - on any bench, the town zooms out gently and the sky drifts by until you stand up.
     postcards - save a small card of this place and moment.

   Entry points: the Journal's Today page (Calm corner), Wren's tea, your cottage (sand, bonsai), the Net Loft (lanterns), and
   every bench. Cozy mode (Settings -> Comfort) hides the nudges that ask for your attention. Everything honours Calm motion.
   Saved in state.progress.calm (created lazily), nothing in it can run out or expire.
   ============================================================ */
const CALM_ACTIVITIES = [
  { id: 'breathe',  icon: '🌬️', name: 'Breathing pond',  text: 'One slow breath at a time.' },
  { id: 'sand',     icon: '🪨', name: 'Sand garden',     text: 'Rake lines, set a stone or two.' },
  { id: 'lanterns', icon: '🏮', name: 'Lantern night',   text: 'Send a light up into the dark.', night: true },
  { id: 'chimes',   icon: '🎐', name: 'Wind chimes',     text: 'Drag a finger across the chimes.' },
  { id: 'stars',    icon: '✨', name: 'Star gazing',     text: 'Join the dots in the night sky.', night: true },
  { id: 'tea',      icon: '🍵', name: 'Tea ritual',      text: 'Pour, steep, sip.' },
  { id: 'bonsai',   icon: '🪴', name: 'Bonsai',          text: 'A tree that grows while you are away.' },
];
const CALM_SCALE = [392, 440, 523, 587, 659, 784, 880];     // a pentatonic scale: any two notes sound fine together
const CALM_TEA_LINES = ['The steam curls and lets go.', 'Warm hands, a quiet mind.', 'Nothing needs you for the next minute.', 'The cup is just the right size.', 'Somewhere, rain on a roof.', 'You taste leaves, and a little sunlight.', 'Slow is also a speed.', 'The kettle sings and settles.', 'A good pause is a kind of progress.', 'You do not have to finish anything.'];
const CALM_SIT_LINES = ['A leaf turns over in the breeze.', 'Someone laughs, far away and friendly.', 'The light moves a little along the wall.', 'A bird makes a small decision.', 'The town hums to itself.', 'Nothing is asked of you here.'];
const BONSAI_STAGES = [{ icon: '🌱', name: 'Seedling', at: 0 }, { icon: '🌿', name: 'Sapling', at: 3 }, { icon: '🪴', name: 'Young tree', at: 7 }, { icon: '🌳', name: 'Bonsai', at: 14 }, { icon: '🎋', name: 'Old bonsai', at: 30 }];
const CALM_CONSTELLATIONS = [
  { name: 'The Kettle', note: 'A warm pot, always on the boil somewhere.', pts: [[18, 64], [28, 48], [44, 44], [58, 52], [62, 68]] },
  { name: 'The Fox', note: 'It sleeps with one eye open, curled around the north.', pts: [[72, 22], [80, 32], [88, 26], [84, 44], [74, 50], [66, 40]] },
  { name: 'The Lantern', note: 'Hung by someone patient, just out of reach.', pts: [[30, 14], [38, 22], [32, 32], [24, 26]] },
  { name: 'The Heron', note: 'Stands very still, so the night can pass.', pts: [[52, 66], [54, 54], [50, 42], [56, 30], [62, 24]] },
];

function calmState() {
  const p = state.progress; if (!p.calm || typeof p.calm !== 'object') p.calm = {};
  const c = p.calm;
  if (!c.sand) c.sand = { strokes: [], stones: [] };
  if (!Array.isArray(c.postcards)) c.postcards = [];
  if (!c.stars) c.stars = {};
  return c;
}
function calmRested() { const c = calmState(); return c.breathDay === todayKey() && (c.breathsToday || 0) >= 5; }
const calmMotion = () => typeof btMotionOk !== 'function' || btMotionOk();
const calmIsNight = () => typeof skyPhase === 'function' && skyPhase().isNight;

let calmCleanups = [], calmCur = null, calmSitting = false;
const calmEl = () => document.getElementById('calmOverlay');
const calmBody = () => document.getElementById('calmBody');
function calmOn(target, type, fn, opts) { target.addEventListener(type, fn, opts); calmCleanups.push(() => target.removeEventListener(type, fn, opts)); }
function calmLater(fn, ms) { const t = setTimeout(fn, ms); calmCleanups.push(() => clearTimeout(t)); return t; }
function calmEvery(fn, ms) { const t = setInterval(fn, ms); calmCleanups.push(() => clearInterval(t)); return t; }
function calmReset() { calmCleanups.forEach(f => { try { f(); } catch (e) { /* already gone */ } }); calmCleanups = []; }
function calmNote(freq, vol, dur) { if (prefs.sound && typeof bell === 'function') { try { bell(freq, 0, dur || 1.6, vol || 0.035); } catch (e) { /* audio unavailable */ } } }

function openCalm(act) {
  if (inBattle) return;
  ensureAudio && ensureAudio();
  calmReset(); calmSitting = false; document.body.classList.remove('calm-sit');
  const el = calmEl(); el.classList.remove('hidden', 'sit'); calmCur = act || 'hub'; sfx('nav'); buzz(HAP.tap);
  showTipOnce('calm');
  calmRender();
}
function closeCalm(toHub) {
  calmReset();
  if (calmSitting) { calmSitting = false; document.body.classList.remove('calm-sit'); }
  if (toHub && calmCur && calmCur !== 'hub') { calmCur = 'hub'; calmRender(); return; }
  calmEl().classList.add('hidden'); calmCur = null; sfx('tap');
}
function calmRender() {
  calmReset();
  const body = calmBody(), title = document.getElementById('calmTitle'), back = document.getElementById('calmBack');
  const def = CALM_ACTIVITIES.find(a => a.id === calmCur);
  title.textContent = def ? def.name : calmCur === 'sit' ? '' : 'Calm corner';
  back.classList.toggle('hidden', calmCur === 'hub' || calmCur === 'sit');
  body.className = 'calm-body calm-act-' + calmCur;   // not calm-<id>: that is also the stage's own class body.innerHTML = '';
  ({ hub: calmHub, breathe: calmBreathe, sand: calmSand, lanterns: calmLanterns, chimes: calmChimes, stars: calmStars, tea: calmTea, bonsai: calmBonsai, sit: calmSitView })[calmCur](body);
}

/* ---------- hub ---------- */
function calmHub(body) {
  const c = calmState(), night = calmIsNight();
  body.innerHTML = `<p class="calm-lead">Nothing here is scored, timed or paid. Come and go as you like.</p>
    ${calmRested() ? '<div class="calm-rested">🌿 Rested · +5% XP until tomorrow</div>' : `<div class="calm-hint">Five breaths in a day leave you Rested (${Math.min(5, c.breathDay === todayKey() ? c.breathsToday || 0 : 0)}/5).</div>`}
    <div class="calm-list">${CALM_ACTIVITIES.map(a => { const locked = a.night && !night;
      return `<button type="button" class="calm-item${locked ? ' locked' : ''}" data-calm="${a.id}" ${locked ? 'aria-disabled="true"' : ''}><span class="calm-ico">${a.icon}</span><span class="calm-tx"><b>${a.name}</b><small>${locked ? 'Comes out after dark' : a.text}</small></span><span class="calm-go">›</span></button>`; }).join('')}</div>
    <div class="calm-section">Postcards</div>
    <button type="button" class="calm-item" id="calmPostcard"><span class="calm-ico">📮</span><span class="calm-tx"><b>Save a postcard of this moment</b><small>${DISTRICTS[state.currentDistrict].name}, ${skyPhase().label.toLowerCase()}</small></span><span class="calm-go">+</span></button>
    <div class="calm-cards" id="calmCards"></div>`;
  onAll(body, '[data-calm]', b => { if (b.getAttribute('aria-disabled')) { toast('🌙 That one comes out after dark.'); sfx('tie'); return; } calmCur = b.dataset.calm; sfx('tap'); calmRender(); });
  document.getElementById('calmPostcard').addEventListener('click', () => { calmSavePostcard(); calmRenderCards(); });
  calmRenderCards();
}
const CALM_POSTCARD_LINES = ['Quiet enough to hear the town breathe.', 'A good place to have been.', 'Remember this light.', 'Nothing happened, and it was lovely.', 'The air felt like this.'];
function calmSavePostcard() {
  const c = calmState(), sp = skyPhase();
  const weather = (typeof weatherBrief === 'function' ? weatherBrief().split(' now')[0] : '');
  c.postcards.unshift({ at: Date.now(), place: DISTRICTS[state.currentDistrict].name, icon: sp.icon, time: sp.label, weather, line: CALM_POSTCARD_LINES[Math.floor(Math.random() * CALM_POSTCARD_LINES.length)], companion: state.companion ? state.companion.icon : '' });
  c.postcards = c.postcards.slice(0, 30); saveState(); sfx('claim'); buzz(HAP.found); toast('📮 Postcard saved');
}
function calmRenderCards() {
  const box = document.getElementById('calmCards'); if (!box) return;
  const list = calmState().postcards;
  box.innerHTML = list.length ? list.map((p, i) => `<div class="calm-pc"><span class="calm-pc-ico">${p.icon}</span><div><b>${escapeHtml(p.place)} · ${escapeHtml(p.time)}</b><small>${escapeHtml(p.weather || '')} ${p.companion || ''}</small><em>${escapeHtml(p.line)}</em></div><button type="button" class="calm-pc-x" data-pc="${i}" aria-label="Delete this postcard">✕</button></div>`).join('') : '<div class="calm-hint">No postcards yet.</div>';
  onAll(box, '[data-pc]', b => { calmState().postcards.splice(+b.dataset.pc, 1); saveState(); sfx('tap'); calmRenderCards(); });
}

/* ---------- breathing ---------- */
function calmBreathe(body) {
  body.innerHTML = `<div class="calm-pond" id="cPond"><div class="calm-orb" id="cOrb"></div><div class="calm-say" id="cSay">Tap the pond to begin</div></div><div class="calm-row"><button type="button" class="calm-btn pri" id="cGo">Begin</button><span class="calm-count" id="cCount"></span></div>`;
  const orb = document.getElementById('cOrb'), say = document.getElementById('cSay'), go = document.getElementById('cGo'), pond = document.getElementById('cPond'), count = document.getElementById('cCount');
  let running = false, timers = [];
  const showCount = () => { const c = calmState(), n = c.breathDay === todayKey() ? c.breathsToday || 0 : 0; count.textContent = n ? `${n} breath${n === 1 ? '' : 's'} today${n >= 5 ? ' · Rested' : ''}` : ''; };
  showCount();
  const set = (t, ms) => timers.push(setTimeout(t, ms)); calmCleanups.push(() => timers.forEach(clearTimeout));
  const scale = (s, sec) => { if (!calmMotion()) return; orb.style.transitionDuration = sec + 's'; orb.style.transform = `scale(${s})`; };
  function cycle() {
    if (!running) return;
    say.textContent = 'Breathe in'; scale(2.1, 4); calmNote(392, 0.02, 3);
    set(() => { say.textContent = 'Hold'; set(() => { if (!running) return; say.textContent = 'Breathe out'; scale(1, 6); calmNote(294, 0.02, 4);
      set(() => { if (!running) return; const c = calmState(); if (c.breathDay !== todayKey()) { c.breathDay = todayKey(); c.breathsToday = 0; } c.breathsToday++; c.breathsTotal = (c.breathsTotal || 0) + 1; saveState(); showCount();
        if (c.breathsToday === 5) { toast('🌿 Rested. A little extra XP until tomorrow.'); sfx('found'); } cycle(); }, 6000); }, 1500); }, 4000);
  }
  const toggle = () => { running = !running; go.textContent = running ? 'Rest' : 'Begin'; go.classList.toggle('pri', !running); timers.forEach(clearTimeout); timers = []; if (running) cycle(); else { say.textContent = 'Tap the pond to begin'; scale(1, 1.5); } };
  go.addEventListener('click', toggle);
  pond.addEventListener('pointerdown', e => { const b = pond.getBoundingClientRect(), r = document.createElement('i'); r.className = 'calm-ripple'; r.style.left = (e.clientX - b.left) + 'px'; r.style.top = (e.clientY - b.top) + 'px'; pond.appendChild(r); setTimeout(() => r.remove(), 2500); calmNote(CALM_SCALE[Math.floor(Math.random() * 4)], 0.015, 1.2); if (!running) toggle(); });
}

/* ---------- sand garden ---------- */
function calmSand(body) {
  body.innerHTML = `<div class="calm-sand" id="cSand"><canvas id="cSandCv" aria-label="Sand garden: drag to rake"></canvas></div><div class="calm-row"><button type="button" class="calm-btn" id="cStone" aria-pressed="false">🪨 Place stones</button><button type="button" class="calm-btn" id="cSmooth">Smooth the sand</button></div>`;
  const box = document.getElementById('cSand'), cv = document.getElementById('cSandCv'), cx = cv.getContext('2d'), st = calmState().sand, stoneBtn = document.getElementById('cStone');
  let placing = false, drawing = false, last = null, cur = null, W = 0, H = 0;
  const POINT_CAP = 1600, count = () => st.strokes.reduce((n, s) => n + s.length, 0);
  function rakeSeg(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    [-9, 0, 9].forEach(o => {
      cx.lineCap = 'round'; cx.lineWidth = 4; cx.strokeStyle = 'rgba(120,104,70,.55)'; cx.beginPath(); cx.moveTo(a.x + nx * o, a.y + ny * o); cx.lineTo(b.x + nx * o, b.y + ny * o); cx.stroke();
      cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,248,225,.5)'; cx.beginPath(); cx.moveTo(a.x + nx * o + 2, a.y + ny * o + 2); cx.lineTo(b.x + nx * o + 2, b.y + ny * o + 2); cx.stroke();
    });
  }
  function stoneEl(x, y) { const r = document.createElement('span'); r.className = 'calm-rock'; r.textContent = '🪨'; r.style.left = (x * 100) + '%'; r.style.top = (y * 100) + '%'; box.appendChild(r); }
  function redraw() {
    const b = box.getBoundingClientRect(), d = window.devicePixelRatio || 1; W = b.width; H = b.height;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, W, H);
    st.strokes.forEach(s => { for (let i = 1; i < s.length; i++) rakeSeg({ x: s[i - 1][0] * W, y: s[i - 1][1] * H }, { x: s[i][0] * W, y: s[i][1] * H }); });
    box.querySelectorAll('.calm-rock').forEach(r => r.remove()); st.stones.forEach(s => stoneEl(s[0], s[1]));
  }
  redraw(); calmOn(window, 'resize', redraw);
  const pos = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left), y: (e.clientY - b.top) }; };
  cv.addEventListener('pointerdown', e => {
    const p = pos(e);
    if (placing) { if (st.stones.length >= 12) st.stones.shift(); st.stones.push([p.x / W, p.y / H]); saveState(); redraw(); sfx('tap'); return; }
    drawing = true; last = p; cur = [[p.x / W, p.y / H]]; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); if (Math.hypot(p.x - last.x, p.y - last.y) > 5) { rakeSeg(last, p); cur.push([+(p.x / W).toFixed(3), +(p.y / H).toFixed(3)]); last = p; } });
  const end = () => { if (!drawing) return; drawing = false; if (cur && cur.length > 1) { st.strokes.push(cur); while (count() > POINT_CAP && st.strokes.length > 1) st.strokes.shift(); saveState(); } cur = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  stoneBtn.addEventListener('click', () => { placing = !placing; stoneBtn.setAttribute('aria-pressed', placing); stoneBtn.classList.toggle('pri', placing); stoneBtn.textContent = placing ? '🪨 Tap the sand' : '🪨 Place stones'; });
  document.getElementById('cSmooth').addEventListener('click', () => { st.strokes = []; st.stones = []; saveState(); redraw(); sfx('soft'); });
}

/* ---------- lanterns ---------- */
function calmLanterns(body) {
  body.innerHTML = `<div class="calm-night" id="cNight"><div class="calm-hint-top">Tap the sky</div></div><div class="calm-row"><span class="calm-count" id="cLCount"></span></div>`;
  const sky = document.getElementById('cNight'), c = calmState(), info = document.getElementById('cLCount');
  const show = () => { info.textContent = `${c.lanterns || 0} lantern${(c.lanterns || 0) === 1 ? '' : 's'} released in all`; }; show();
  for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.className = 'calm-star'; s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 75 + '%'; s.style.opacity = 0.25 + Math.random() * 0.6; sky.appendChild(s); }
  sky.addEventListener('pointerdown', e => {
    const b = sky.getBoundingClientRect(), l = document.createElement('span'); l.className = 'calm-lantern'; l.textContent = '🏮';
    l.style.left = (e.clientX - b.left) + 'px'; l.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px'); sky.appendChild(l); setTimeout(() => l.remove(), 7200);
    c.lanterns = (c.lanterns || 0) + 1; saveState(); show(); calmNote(CALM_SCALE[Math.floor(Math.random() * CALM_SCALE.length)] / 2, 0.03, 2);
    if (c.lanterns % 10 === 0 && typeof lifeMood === 'function') { lifeMood(1); toast('🏮 The town feels a little warmer.'); }
  });
}

/* ---------- wind chimes ---------- */
function calmChimes(body) {
  body.innerHTML = `<div class="calm-chimes" id="cChimes" role="group" aria-label="Wind chimes"><div class="calm-beam"></div></div><div class="calm-row"><span class="calm-count">Drag across them, or tap one.</span></div>`;
  const box = document.getElementById('cChimes'); let lastI = -1;
  CALM_SCALE.forEach((f, i) => { const c = document.createElement('div'); c.className = 'calm-chime'; c.dataset.i = i; c.style.setProperty('--string', (30 + (i % 3) * 14) + 'px'); c.style.setProperty('--len', (150 - i * 11) + 'px'); c.innerHTML = '<i></i>'; box.appendChild(c); });
  const ring = i => { const c = box.children[i + 1]; if (!c) return; c.classList.remove('ring'); void c.offsetWidth; if (calmMotion()) c.classList.add('ring'); calmNote(CALM_SCALE[i], 0.05, 2.4); };
  const hit = e => { const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest && el.closest('.calm-chime'); if (c && +c.dataset.i !== lastI) { lastI = +c.dataset.i; ring(lastI); } if (!c) lastI = -1; };
  box.addEventListener('pointerdown', e => { lastI = -1; hit(e); }); box.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') hit(e); });
}

/* ---------- star gazing ---------- */
function calmStars(body) {
  body.innerHTML = `<div class="calm-night" id="cSky"><svg class="calm-lines" id="cLines" viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div class="calm-hint-top" id="cStarHint">Tap a star, then the next one</div></div><div class="calm-row"><span class="calm-count" id="cStarCount"></span></div>`;
  const sky = document.getElementById('cSky'), lines = document.getElementById('cLines'), hint = document.getElementById('cStarHint'), c = calmState();
  const found = () => CALM_CONSTELLATIONS.filter(k => c.stars[k.name]).length;
  const refresh = () => { document.getElementById('cStarCount').textContent = `${found()} of ${CALM_CONSTELLATIONS.length} constellations found`; }; refresh();
  for (let i = 0; i < 50; i++) { const s = document.createElement('i'); s.className = 'calm-star'; s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%'; s.style.opacity = 0.2 + Math.random() * 0.5; sky.appendChild(s); }
  const prog = {};
  CALM_CONSTELLATIONS.forEach((k, ci) => {
    prog[ci] = c.stars[k.name] ? k.pts.length : 0;
    k.pts.forEach((pt, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'calm-bigstar' + (c.stars[k.name] ? ' done' : ''); b.style.left = pt[0] + '%'; b.style.top = pt[1] + '%'; b.setAttribute('aria-label', `${k.name}, star ${i + 1}`); b.textContent = '✦'; sky.appendChild(b);
      if (c.stars[k.name] && i > 0) lines.insertAdjacentHTML('beforeend', `<line x1="${k.pts[i - 1][0]}" y1="${k.pts[i - 1][1]}" x2="${pt[0]}" y2="${pt[1]}"/>`);
      b.addEventListener('click', () => {
        if (prog[ci] >= k.pts.length) { hint.textContent = `${k.name}: ${k.note}`; return; }
        if (i !== prog[ci]) { b.classList.remove('shy'); void b.offsetWidth; b.classList.add('shy'); hint.textContent = i === 0 ? 'Start here' : 'Try the other end'; return; }
        if (i > 0) lines.insertAdjacentHTML('beforeend', `<line x1="${k.pts[i - 1][0]}" y1="${k.pts[i - 1][1]}" x2="${pt[0]}" y2="${pt[1]}"/>`);
        b.classList.add('done'); prog[ci]++; calmNote(CALM_SCALE[i % CALM_SCALE.length], 0.035, 1.8);
        if (prog[ci] === k.pts.length) { if (!c.stars[k.name]) { c.stars[k.name] = Date.now(); saveState(); } hint.textContent = `${k.name}: ${k.note}`; sfx('found'); refresh(); }
      });
    });
  });
}

/* ---------- tea ritual ----------
   Three steps shown as chips (Pour, Steep, Sip), a stage with a cup on a saucer, and two full-width buttons that always sit in the
   same place, like the other screens. Holding the pour button runs a thin stream into the cup. */
function calmTea(body) {
  body.innerHTML = `<div class="calm-stage calm-tea-stage"><div class="calm-steam" id="cSteam">♨</div><div class="calm-stream" id="cStream"></div>
      <div class="calm-cup"><i id="cFill"></i></div><div class="calm-saucer"></div></div>
    <div class="calm-say" id="cTeaSay">Hold the button to pour</div>
    <div class="calm-steps" id="cSteps"><span class="on">1 · Pour</span><span>2 · Steep</span><span>3 · Sip</span></div>
    <div class="calm-actions"><button type="button" class="calm-btn pri wide" id="cPour">🫖 Hold to pour</button><button type="button" class="calm-btn wide" id="cSteep" disabled>Let it steep</button></div>`;
  const fill = document.getElementById('cFill'), say = document.getElementById('cTeaSay'), pour = document.getElementById('cPour'), steep = document.getElementById('cSteep'), steam = document.getElementById('cSteam'), stream = document.getElementById('cStream'), steps = [...document.querySelectorAll('#cSteps span')];
  let level = 0, pouring = null, stage = 'pour';
  const setStep = n => steps.forEach((el, i) => { el.classList.toggle('on', i === n); el.classList.toggle('done', i < n); });
  const draw = () => { fill.style.height = level + '%'; };
  const stopPour = () => { clearInterval(pouring); pouring = null; stream.classList.remove('on'); };
  pour.addEventListener('pointerdown', e => { if (stage !== 'pour' || pouring) return; pour.setPointerCapture(e.pointerId); say.textContent = 'Pouring…'; stream.classList.add('on');
    pouring = setInterval(() => { level = Math.min(88, level + 1.2); draw(); if (level >= 88) { stopPour(); say.textContent = 'Just right'; steep.disabled = false; steep.classList.add('pri'); pour.classList.remove('pri'); } }, 60); calmNote(330, 0.012, 2); });
  ['pointerup', 'pointercancel'].forEach(t => pour.addEventListener(t, () => { if (!pouring) return; stopPour(); if (level > 30) { steep.disabled = false; steep.classList.add('pri'); pour.classList.remove('pri'); say.textContent = 'Whenever you are ready'; } }));
  calmCleanups.push(stopPour);
  steep.addEventListener('click', () => {
    if (stage !== 'pour') { say.textContent = CALM_TEA_LINES[Math.floor(Math.random() * CALM_TEA_LINES.length)]; level = Math.max(20, level - 28); draw(); calmNote(523, 0.03, 2); steam.classList.add('on'); steep.textContent = 'Another sip'; return; }
    stage = 'steep'; setStep(1); steep.disabled = true; pour.disabled = true; steep.classList.remove('pri'); steam.classList.add('on'); say.textContent = 'Steeping…';
    calmLater(() => { stage = 'sip'; setStep(2); steep.disabled = false; steep.textContent = 'Take a sip'; steep.classList.add('pri'); say.textContent = 'Ready'; calmNote(659, 0.03, 2); }, calmMotion() ? 7000 : 1500);
  });
}

/* ---------- bonsai ---------- */
function bonsaiGrowthDays() { const b = calmState().bonsai; if (!b) return 0; return Math.max(0, (Date.now() - b.since) / 86400000) + (b.trims || 0) * 0.5; }
function bonsaiStage() { const g = bonsaiGrowthDays(); let s = 0; BONSAI_STAGES.forEach((x, i) => { if (g >= x.at) s = i; }); return s; }
function calmBonsai(body) {
  const c = calmState();
  const draw = () => {
    if (!c.bonsai) { body.innerHTML = `<div class="calm-tree"><div class="calm-tree-ico">🫘</div><div class="calm-say">Nothing planted yet</div></div><div class="calm-row"><button type="button" class="calm-btn pri" id="cPlant">Plant a seedling</button></div><p class="calm-hint">It grows with real days. Tending it helps a little. Missing days costs nothing.</p>`; document.getElementById('cPlant').addEventListener('click', () => { c.bonsai = { since: Date.now(), trims: 0, trimDay: '', paid: 0 }; saveState(); sfx('claim'); draw(); }); return; }
    const s = bonsaiStage(), st = BONSAI_STAGES[s], nx = BONSAI_STAGES[s + 1], g = bonsaiGrowthDays(), tended = c.bonsai.trimDay === todayKey();
    if (s > (c.bonsai.paid || 0)) { const peb = 10 * s; addPebbles(peb, 'bonsai'); c.bonsai.paid = s; saveState(); toast(`${st.icon} Your bonsai is now a ${st.name.toLowerCase()}. +${peb} 🫧`); sfx('found'); }
    body.innerHTML = `<div class="calm-tree"><div class="calm-tree-ico s${s}">${st.icon}</div><div class="calm-say">${st.name}</div><small class="calm-hint">${nx ? `${Math.max(0, nx.at - g).toFixed(1)} days to ${nx.name.toLowerCase()}` : 'As grown as it gets. Still lovely.'}</small></div>
      <div class="calm-row"><button type="button" class="calm-btn pri" id="cTend" ${tended ? 'disabled' : ''}>${tended ? 'Tended today ✓' : '✂️ Trim and water'}</button></div><p class="calm-hint">Tending once a day speeds it up a little. Nothing is lost if you miss a day.</p>`;
    const b = document.getElementById('cTend'); if (b) b.addEventListener('click', () => { c.bonsai.trims = (c.bonsai.trims || 0) + 1; c.bonsai.trimDay = todayKey(); saveState(); sfx('soft'); calmNote(587, 0.03, 1.8); draw(); });
  };
  draw();
}

/* ---------- sitting on a bench ---------- */
function calmSit(company) {
  if (inBattle) return;
  calmReset(); calmCur = 'sit'; calmSitting = true; const el = calmEl(); el.classList.remove('hidden'); el.classList.add('sit'); document.body.classList.add('calm-sit');
  calmRender();
  if (company) document.getElementById('calmSitSay').textContent = `${company} settles in beside you.`;
}
function calmSitView(body) {
  body.innerHTML = `<div class="calm-sit-say" id="calmSitSay">You sit for a while.</div><button type="button" class="calm-btn" id="cStand">Stand up</button>`;
  const say = document.getElementById('calmSitSay'); let i = 0;
  calmEvery(() => { say.classList.add('fade'); setTimeout(() => { say.textContent = CALM_SIT_LINES[i++ % CALM_SIT_LINES.length]; say.classList.remove('fade'); }, 600); }, 8000);
  document.getElementById('cStand').addEventListener('click', () => closeCalm());
}

document.getElementById('calmClose').addEventListener('click', () => closeCalm());
document.getElementById('calmBack').addEventListener('click', () => closeCalm(true));
