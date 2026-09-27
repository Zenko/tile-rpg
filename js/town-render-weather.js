/* ============================================================
   TOWN MAP: drawing, camera, tap-to-walk, houses and the cellar dungeon.
   ============================================================ */
const townView = document.getElementById('townGrid');
const VIEW_COLS = 7, STEP_MS = 140;
let viewRows = 7;
let townWorld = null, townBuiltFor = null, tilePx = 48, playerEl = null, walkToken = 0;
let inScene = false, scene = null;
const sceneView = document.getElementById('sceneView');

function svgUse(id, cls) { return `<svg class="spr ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`; }

/* ============================================================
   DAY/NIGHT CYCLE + WEATHER
   One in-game day = DAY_LEN_MS of real, active play time (paused while the tab is hidden).
   Weather is a simple random walk: it holds for a while, then rerolls, weighted by day vs night.
   ============================================================ */
const DAY_LEN_MS = 20 * 60 * 1000;   // a full day/night lap every ~20 minutes of play
const SKY_STOPS = [   // [time-of-day 0-1, tint color, tint strength, dim strength, vignette]
  { t: 0.00, color: '#0a1830', tint: '#1b2a55', tintA: 0.55, dim: 0.55, vig: 0.5, icon: '🌙', label: 'the middle of the night' },
  { t: 0.20, color: '#0a1830', tint: '#1b2a55', tintA: 0.5,  dim: 0.5,  vig: 0.45, icon: '🌌', label: 'late night' },
  { t: 0.24, color: '#3a3560', tint: '#d98a5e', tintA: 0.4,  dim: 0.28, vig: 0.22, icon: '🌅', label: 'dawn' },
  { t: 0.30, color: '#7a6a55', tint: '#ffd9a0', tintA: 0.22, dim: 0.08, vig: 0.08, icon: '🌤️', label: 'early morning' },
  { t: 0.46, color: 'transparent', tint: '#fff6df', tintA: 0.05, dim: 0,    vig: 0,    icon: '☀️', label: 'midday' },
  { t: 0.62, color: 'transparent', tint: '#fff6df', tintA: 0.05, dim: 0,    vig: 0,    icon: '☀️', label: 'the afternoon' },
  { t: 0.72, color: '#6a4a3a', tint: '#ff9d5c', tintA: 0.3,  dim: 0.12, vig: 0.12, icon: '🌇', label: 'sunset' },
  { t: 0.80, color: '#2a2440', tint: '#8a5a8f', tintA: 0.45, dim: 0.3,  vig: 0.3,  icon: '🌆', label: 'dusk' },
  { t: 0.88, color: '#0a1830', tint: '#1b2a55', tintA: 0.5,  dim: 0.5,  vig: 0.45, icon: '🌙', label: 'nightfall' },
  { t: 1.00, color: '#0a1830', tint: '#1b2a55', tintA: 0.55, dim: 0.55, vig: 0.5, icon: '🌙', label: 'the middle of the night' }
];
function lerp(a, b, f) { return a + (b - a) * f; }
function hexMix(a, b, f) {
  if (a === 'transparent') a = '#00000000'; if (b === 'transparent') b = '#00000000';
  const pa = [1,3,5].map(i => parseInt(a.slice(i,i+2)||'00',16)), pb = [1,3,5].map(i => parseInt(b.slice(i,i+2)||'00',16));
  return '#' + pa.map((v,i) => Math.round(lerp(v, pb[i], f)).toString(16).padStart(2,'0')).join('');
}
// atMs: a position on the day clock to look at instead of now (the forecast asks whether it will be night then).
function skyPhase(atMs) {
  const e = typeof atMs === 'number' ? atMs : state.sky.elapsedMs;
  const dayPos = (((e % DAY_LEN_MS) + DAY_LEN_MS) % DAY_LEN_MS) / DAY_LEN_MS;
  let lo = SKY_STOPS[0], hi = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    if (dayPos >= SKY_STOPS[i].t && dayPos <= SKY_STOPS[i + 1].t) { lo = SKY_STOPS[i]; hi = SKY_STOPS[i + 1]; break; }
  }
  const span = (hi.t - lo.t) || 1, f = (dayPos - lo.t) / span;
  return {
    dayPos,
    color: hexMix(lo.color, hi.color, f),
    tint: hexMix(lo.tint, hi.tint, f),
    tintA: lerp(lo.tintA, hi.tintA, f),
    dim: lerp(lo.dim, hi.dim, f),
    vig: lerp(lo.vig, hi.vig, f),
    icon: f < 0.5 ? lo.icon : hi.icon,
    label: f < 0.5 ? lo.label : hi.label,
    isNight: lerp(lo.dim, hi.dim, f) > 0.35
  };
}
function advanceClock() {
  const now = Date.now();
  if (state.sky.lastTickAt != null && !document.hidden) {
    const delta = now - state.sky.lastTickAt;
    state.sky.elapsedMs = (state.sky.elapsedMs + delta) % DAY_LEN_MS;
    state.weather.elapsed = (state.weather.elapsed || 0) + delta;
  }
  state.sky.lastTickAt = now;
}

const WEATHER_KINDS = {
  clear:  { icon: '', name: 'Clear skies', weight: (n) => n ? 5 : 6 },
  cloudy: { icon: '☁️', name: 'Cloudy', weight: () => 3 },
  rain:   { icon: '🌧️', name: 'Rain', weight: (n) => n ? 2 : 2.4 },
  storm:  { icon: '⛈️', name: 'Storm', weight: (n) => n ? 1.1 : 0.8 },
  fog:    { icon: '🌫️', name: 'Fog', weight: (n) => n ? 1.6 : 1 },
  snow:   { icon: '❄️', name: 'Snow', weight: () => 0.9 }
};
function rollWeather(isNight) {
  const tilt = seasonDef().weather || {};
  const entries = Object.entries(WEATHER_KINDS).map(([k, v]) => [k, v.weight(isNight) * (tilt[k] || 1)]);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return 'clear';
}
const WEATHER_LOG = {
  clear: 'The sky clears up.', cloudy: 'Clouds roll in overhead.', rain: 'Rain starts to fall.',
  storm: 'A storm rolls in. Thunder rumbles somewhere over the rooftops.', fog: 'A soft fog settles over the town.', snow: 'Snow begins to drift down.'
};
// What each kind of weather actually changes. `short` goes on the battle chip and in toasts; the numbers are read
// by the systems they touch (fishing, finds, chests, spirits, battles, rewards) through weatherIs()/WEATHER_EFFECTS.
const WEATHER_EFFECTS = {
  clear:  null,
  cloudy: { short: 'Spirits give double XP' },
  rain:   { short: 'Fish bite sooner, rare fish more often', biteSpeed: 0.6, rareFish: 2.5 },
  storm:  { short: '💨 Swift cards +1 power in battle', swiftBonus: 1 },
  fog:    { short: 'Hidden cards & chests turn up more', findMult: 2, chestMult: 2.5 },
  snow:   { short: 'Bosses +2 Spirit, richer rewards', bossSpirit: 2, richerRewards: true },
};
/* ---------------- seasons: one real week each, spring -> summer -> autumn -> winter ----------------
   A season recolours the trees, swaps the music's chord set, tilts the weather, and makes its own cards turn up
   more often (3x as likely within their rarity, from packs, prizes and finds alike). */
const SEASONS = {
  spring: { icon: '🌸', name: 'Spring', weather: { rain: 1.5, cloudy: 1.2 },
    cards: ['sprout', 'blossom', 'sakura-petal', 'cherry-blossom-storm', 'clover', 'lily', 'foxglove', 'moth', 'dove', 'garden-spirit', 'rain-shower', 'starfall-unicorn'] },
  summer: { icon: '☀️', name: 'Summer', weather: { clear: 1.4, storm: 1.4 },
    cards: ['firefly', 'reed', 'feather', 'gale', 'thunderhead', 'storm-lily', 'lucky-cat', 'festival-drum', 'koi', 'paper-fan', 'sunbeam', 'phoenix-ember'] },
  autumn: { icon: '🍂', name: 'Autumn', weather: { fog: 1.8, cloudy: 1.3 },
    cards: ['acorn', 'autumn-maple', 'dew-leaf', 'harvest-lantern', 'hollow-log', 'twig-bundle', 'pinewood-owl', 'moth-queen', 'hedgehog', 'copper-carp', 'harvest', 'ironroot-treant'] },
  winter: { icon: '❄️', name: 'Winter', weather: { snow: 3.5, clear: 0.8 },
    cards: ['winter-hare', 'glacier-spirit', 'crystal-spire', 'quartz-cluster', 'moonstone', 'snail', 'geode', 'northern-lights', 'moonlit-shrine', 'stone-lantern', 'moonlit-tide', 'celestial-owl'] },
};
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function seasonNow() { return SEASON_ORDER[Math.floor(Date.now() / WEEK_MS) % SEASON_ORDER.length]; }
function seasonDef() { return SEASONS[seasonNow()]; }
function inSeason(id) { return seasonDef().cards.includes(BattleEngine.baseIdOf(id)); }
// days left until the season turns
function seasonDaysLeft() { return Math.ceil((WEEK_MS - (Date.now() % WEEK_MS)) / 86400000); }
// Announces a new season the first time the town is drawn in it.
function noteSeasonChange() {
  const now = seasonNow(), pr = state.progress;
  if (pr.seasonSeen === now) return;
  const first = !pr.seasonSeen;
  pr.seasonSeen = now; saveState();
  const s = SEASONS[now];
  if (!first) { toast(`${s.icon} ${s.name} has come to town`); logEvent(s.icon, `${s.name} arrived. Its cards turn up more often for the next week.`); }
}

function weatherNow() { return (state.weather && state.weather.current) || 'clear'; }
function weatherIs(kind) { return weatherNow() === kind; }
function weatherFx() { return WEATHER_EFFECTS[weatherNow()] || {}; }
// "Now X, then Y in about N minutes" - minutes of active play, since the weather clock pauses while the game is closed.
function forecastText() {
  const w = state.weather, now = WEATHER_KINDS[weatherNow()], nx = WEATHER_KINDS[w.next] ? w.next : null;
  const mins = Math.max(1, Math.round(((w.changesAt || 0) - (w.elapsed || 0)) / 60000));
  const fx = k => (WEATHER_EFFECTS[k] ? ` (${WEATHER_EFFECTS[k].short})` : '');
  const name = k => `${WEATHER_KINDS[k].icon || '☀️'} ${WEATHER_KINDS[k].name}`;
  const nowPart = `Now: ${name(weatherNow())}${fx(weatherNow())}.`;
  if (!nx) return nowPart;
  return `${nowPart} ${nx === weatherNow() ? `It should stay that way for another ~${mins} min and beyond.` : `In ~${mins} min: ${name(nx)}${fx(nx)}.`}`;
}
function weatherEffectLine() { const w = WEATHER_EFFECTS[weatherNow()]; return w ? `${WEATHER_KINDS[weatherNow()].icon} ${w.short}` : ''; }

/* ---------------- ambient flavor line: a quiet, rotating sense-of-place above the event log ---------------- */
const DISTRICT_AMBIENT = {
  square: { day: ['Pigeons peck at crumbs near the fountain.', 'Sunlight settles warm over the square.', 'Someone left a book open on a bench.', 'The old fountain trickles quietly.'],
            night: ['The fountain catches the moonlight.', 'Lamplight pools soft over the cobblestones.', 'The square is hushed but for a distant owl.', 'Moths circle the street lamps.'] },
  market: { day: ['The smell of fresh bread drifts from a stall.', 'Awnings flap gently in the breeze.', 'Baskets of goods sit stacked and waiting.', 'A cart wheel creaks somewhere nearby.'],
            night: ['The stalls are shuttered for the night.', 'A lone lantern glows over the empty market.', 'Crates sit stacked neatly, waiting for morning.'] },
  harbor: { day: ['Gulls wheel and call over the docks.', 'Boats rock gently against their moorings.', 'Salt air drifts in off the water.', 'A seal suns itself on the rocks.'],
            night: ['Waves lap quietly against the dock posts.', 'A buoy bell rings faint in the distance.', 'Harbor lights ripple on dark water.'] },
  garden: { day: ['Bees drift lazily between the blossoms.', 'Sunflowers turn slowly toward the light.', 'Something rustles gently in the hedges.', 'The air smells of warm earth and petals.'],
            night: ['Night-blooming flowers open their petals.', 'Crickets sing from somewhere in the garden.', 'The garden holds its breath in the moonlight.'] },
};
const WEATHER_AMBIENT = {
  cloudy: ['Clouds drift lazily overhead.', 'The light has gone soft and grey.'],
  rain: ['Rain patters steadily on rooftops.', 'Puddles gather along the path.', 'The air smells like wet stone.'],
  storm: ['Thunder rumbles somewhere beyond the rooftops.', 'Wind rattles the shutters.'],
  fog: ['Fog blurs the edges of the town.', 'Shapes loom soft and unclear in the mist.'],
  snow: ['Snow gathers quietly on the rooftops.', 'Footprints trail behind you in the fresh snow.'],
};
let ambientState = { key: '', at: 0, el: null };
function updateAmbient() {
  const wrap = document.getElementById('ambientLine'), textEl = document.getElementById('ambientText'), iconEl = document.getElementById('ambientIcon');
  if (!wrap || !textEl || inBattle || inScene) return;
  const s = skyPhase(), weather = state.weather.current || 'clear', dist = state.currentDistrict;
  const key = dist + '|' + weather + '|' + (s.isNight ? 'night' : 'day');
  const now = Date.now();
  // Rerolls when the scene actually changes (district, weather, day/night), and every so often anyway for variety.
  if (key === ambientState.key && now - ambientState.at < 90000) return;
  ambientState = { key, at: now };
  let pool = WEATHER_AMBIENT[weather], icon = WEATHER_KINDS[weather] && WEATHER_KINDS[weather].icon;
  if (!pool) { const d = DISTRICT_AMBIENT[dist] || DISTRICT_AMBIENT.square; pool = s.isNight ? d.night : d.day; icon = s.icon; }
  const text = pool[Math.floor(Math.random() * pool.length)];
  wrap.classList.add('fading');
  setTimeout(() => { textEl.textContent = text; iconEl.textContent = icon || s.icon; wrap.classList.remove('fading'); }, 220);
}
function maybeRollWeather() {
  // Scheduled on state.weather.elapsed (a plain, non-wrapping clock) rather than state.sky.elapsedMs,
  // which wraps every DAY_LEN_MS - comparing against a wrapped clock could push changesAt past the wrap
  // point and freeze the weather forever, since the wrapped clock would never reach it again.
  const now = state.weather.elapsed || 0;
  if (now >= state.weather.changesAt) {
    const isNight = skyPhase().isNight, prev = state.weather.current, first = state.weather.changesAt === 0;
    // Bias toward staying clear/calm rather than flickering: weather changes are rare, atmospheric events.
    // The next weather is rolled one change ahead, so the weather board in the square can forecast it.
    state.weather.current = !first && state.weather.next && WEATHER_KINDS[state.weather.next] ? state.weather.next : rollWeather(isNight);
    state.weather.changesAt = now + (4 + Math.random() * 6) * 60 * 1000;   // holds for 4-10 minutes of active play
    state.weather.next = rollWeather(skyPhase(state.sky.elapsedMs + (state.weather.changesAt - now)).isNight);
    if (!first && state.weather.current !== prev && !inBattle && !inScene && townLog) {
      townLog.textContent = WEATHER_LOG[state.weather.current];
      const fx = weatherEffectLine(); if (fx) toast(fx);
    }
  }
}

const WEATHER_DIM = { clear: 0, cloudy: 0.08, rain: 0.06, storm: 0.14, fog: 0.05, snow: 0.03 };
function applySky(instant) {
  if (!skyEl) return;
  const s = skyPhase();
  const extraDim = WEATHER_DIM[state.weather.current] || 0;
  // Overcast weather borrows the night's cool grey-blue even at midday, so cloudy/rainy noon still reads dimmer
  const color = extraDim > 0 ? hexMix(s.color === '#000000' ? '#3a4048' : s.color, '#3a4048', Math.min(1, extraDim * 2)) : s.color;
  skyEl.style.setProperty('--sky-color', color);
  skyEl.style.setProperty('--sky-opacity', Math.min(0.6, s.dim + extraDim).toFixed(2));
  skyEl.style.setProperty('--sky-tint', s.tint);
  skyEl.style.setProperty('--sky-tint-opacity', s.tintA.toFixed(2));
  if (vignetteEl) vignetteEl.style.setProperty('--vig-opacity', s.vig.toFixed(2));
  if (instant) { skyEl.style.transition = 'none'; if (vignetteEl) vignetteEl.style.transition = 'none';
    requestAnimationFrame(() => { if (skyEl) skyEl.style.transition = ''; if (vignetteEl) vignetteEl.style.transition = ''; }); }
  townView.classList.toggle('is-night', s.isNight);
  const timeText = document.getElementById('hudTimeText');
  if (timeText) { const t = s.label.replace(/^the /i, ''); timeText.textContent = t.charAt(0).toUpperCase() + t.slice(1); }
  const clockEl = document.getElementById('hudClock');
  if (clockEl) clockEl.textContent = formatGameClock(s.dayPos);
  updateSkyBadgeIcon();
}
// Maps the day/night cycle (0-1 lap of DAY_LEN_MS) onto a 12-hour clock face, so the HUD clock always
// agrees with the sky tint and weather - midnight at dayPos 0, noon at dayPos 0.5.
function formatGameClock(dayPos) {
  const totalMinutes = Math.floor(dayPos * 24 * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60), m = totalMinutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
// The top-right badge shows one simple icon: the current weather when it isn't clear, otherwise the
// time-of-day icon - so it never stacks two icons like the old sky+weather pair did.
function updateSkyBadgeIcon() {
  const iconEl = document.getElementById('hudSkyIcon');
  if (!iconEl) return;
  const kind = state.weather.current || 'clear';
  const w = WEATHER_KINDS[kind];
  const icon = (w && w.icon) ? w.icon : skyPhase().icon;
  if (iconEl.textContent !== icon) iconEl.textContent = icon;
}

let snowFlakes = [];
function buildSnowFlakes() {
  if (!snowFieldEl) return;
  snowFieldEl.innerHTML = '';
  snowFlakes = [];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const f = document.createElement('div'); f.className = 'snow-flake';
    const size = 3 + Math.random() * 4, left = Math.random() * 100, dur = 6 + Math.random() * 7, delay = Math.random() * dur;
    f.style.left = left + '%'; f.style.width = size + 'px'; f.style.height = size + 'px';
    f.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px');
    f.style.animationDuration = dur + 's'; f.style.animationDelay = '-' + delay + 's';
    snowFieldEl.appendChild(f);
  }
}
let rainBuilt = false, rainLayerEl = null;
function buildRainDrops(storm) {
  if (!rainLayerEl) return;
  rainLayerEl.innerHTML = '';
  const count = 40;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div'); d.className = 'rain-drop';
    const speed = storm ? 0.75 : 1;   // storms fall a bit quicker than plain rain, but both are gentler than before
    const left = Math.random() * 100, dur = (1.7 + Math.random() * 0.9) * speed, len = 6 + Math.random() * 4;
    // Negative delay spread across the FULL duration (not a fraction of it) so drops are already mid-fall,
    // spread evenly through the whole visible band, the instant the layer appears.
    const delay = Math.random() * dur;
    d.style.left = left + '%'; d.style.height = len + '%';
    d.style.animationDuration = dur + 's'; d.style.animationDelay = '-' + delay + 's';
    rainLayerEl.appendChild(d);
  }
  rainBuilt = true;
}
function applyWeather(instant) {
  if (!weatherEl) return;
  maybeRollWeather();
  const kind = state.weather.current;
  const hasOverlay = kind === 'rain' || kind === 'storm' || kind === 'snow' || kind === 'fog';
  weatherEl.className = 'town-weather' + (hasOverlay ? ' on weather-' + kind : '');   // cloudy softens the sky tint only, no overlay animation
  if (kind === 'snow' && !snowFlakes.length) buildSnowFlakes();
  if ((kind === 'rain' || kind === 'storm') && !rainBuilt) buildRainDrops(kind === 'storm');
  const weatherText = document.getElementById('hudWeatherText');
  if (weatherText) weatherText.textContent = kind === 'clear' ? '' : WEATHER_KINDS[kind].name;
  updateSkyBadgeIcon();
  syncWeatherAudio();
  if (instant) { weatherEl.style.transition = 'none'; requestAnimationFrame(() => { if (weatherEl) weatherEl.style.transition = ''; }); }
}
let skyTicks = 0;
function tickSkyAndWeather() {
  advanceClock();
  applyWeather();
  applySky();
  updateAmbient();
  applyWeatherToMusic();
  syncWeatherAudio();   // cheap re-check: catches battle/scene entry+exit without hooking every transition
  if (++skyTicks % 6 === 0) saveState();   // persist the clock every ~30s so a refresh doesn't lose time-of-day
}
setInterval(tickSkyAndWeather, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) state.sky.lastTickAt = Date.now(); });

/* ---------------- static world (ground, trees, water, buildings) ---------------- */
function buildWorld(key) {
  const m = getMap(key);
  townView.innerHTML = '';
  townView.dataset.biome = m.biome;
  townWorld = document.createElement('div');
  townWorld.id = 'townWorld'; townWorld.className = 'town-world';
  townWorld.style.width = `calc(var(--t) * ${m.w})`; townWorld.style.height = `calc(var(--t) * ${m.h})`;
  const rnd = seeded('tiles-' + key), frag = document.createDocumentFragment();
  const at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 'o' : m.rows[y][x];
  const isPath = c => c === '=' || c === 'b' || c === '#';
  const isWater = c => c === '~' || c === 'b';
  const edge = (x, y, is, color, px) => {
    const s = [];
    if (!is(at(x, y - 1))) s.push(`inset 0 ${px}px 0 0 ${color}`);
    if (!is(at(x + 1, y))) s.push(`inset -${px}px 0 0 0 ${color}`);
    if (!is(at(x, y + 1))) s.push(`inset 0 -${px}px 0 0 ${color}`);
    if (!is(at(x - 1, y))) s.push(`inset ${px}px 0 0 0 ${color}`);
    return s.join(',');
  };
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = m.rows[y][x], el = document.createElement('div');
    el.className = 'town-tile'; el.dataset.x = x; el.dataset.y = y;
    el.style.setProperty('--x', x); el.style.setProperty('--y', y);
    let html = '', tone = rnd(), r2 = rnd();
    if (c === '=' || c === '#') {
      el.classList.add('t-path'); el.style.boxShadow = edge(x, y, isPath, 'var(--path-edge)', 3);
      if (c === '#') html = svgUse('s-cobble'); else if (r2 < 0.24) html = svgUse('s-pebbles');
    } else if (c === '~' || c === 'b') {
      el.classList.add('t-water'); el.style.boxShadow = edge(x, y, isWater, 'var(--shore)', 4);
      if (c === 'b') html = svgUse(at(x + 1, y) === 'b' ? 's-bridge-l' : at(x - 1, y) === 'b' ? 's-bridge-r' : 's-bridge');
      else {
        if (r2 < 0.55) html = svgUse('s-ripple');
        // A swimming fish marks the only water tiles that can actually be fished right now.
        if (m.fishTiles[x + ',' + y]) {
          const dur = (3.2 + rnd() * 2.2).toFixed(2), delay = (rnd() * 2.6).toFixed(2);
          html += `<span class="fish-hint" style="--fdur:${dur}s;--fdelay:${delay}s">🐟</span>`;
        }
      }
    } else {
      el.classList.add(tone < 0.34 ? 'g1' : tone < 0.67 ? 'g2' : 'g3');
      if (c === 'o') { el.classList.add('tree'); html = svgUse(r2 < 0.5 ? 's-oak' : 's-oak2', 'tree'); el.style.zIndex = y * 2; }
      else if (c === 'i') { el.classList.add('tree'); html = svgUse('s-pine', 'tree'); el.style.zIndex = y * 2; }
      else if (c === 'h') { el.classList.add('tree'); html = svgUse('s-hedge', 'tree'); el.style.zIndex = y * 2; }
      else if (c === 'r') { el.classList.add('tree'); html = svgUse('s-rock', 'tree'); el.style.zIndex = y * 2; }
      else if (c === ',') html = svgUse('s-flowers');
      else if (r2 < 0.17) html = svgUse('s-tuft');
    }
    el.innerHTML = html; frag.appendChild(el);
  }
  m.buildings.forEach(b => {
    const el = document.createElement('div');
    el.className = 'bld' + (b.enter ? ' enterable' : ' locked'); el.dataset.building = b.id;
    el.style.setProperty('--x', b.x); el.style.setProperty('--y', b.y); el.style.setProperty('--w', b.w); el.style.setProperty('--h', b.h);
    el.style.zIndex = (b.y + b.h - 1) * 2 + 1;
    if (b.roof) { el.style.setProperty('--roof', b.roof); el.style.setProperty('--roof2', b.roof2 || b.roof); }
    el.innerHTML = `<svg aria-hidden="true"><use href="#${b.sprite}"/></svg>`;
    frag.appendChild(el);
  });
  townWorld.appendChild(frag);
  townView.appendChild(townWorld);
  buildSkyLayers();
  playerEl = null; townBuiltFor = key;
}

/* ---------------- sky (day/night tint) + weather overlays, sit above the world but inside town-view ---------------- */
let skyEl = null, vignetteEl = null, weatherEl = null, snowFieldEl = null;
function buildSkyLayers() {
  skyEl = document.createElement('div'); skyEl.className = 'town-sky';
  weatherEl = document.createElement('div'); weatherEl.className = 'town-weather'; weatherEl.id = 'townWeather';
  weatherEl.innerHTML = `<div class="fog-layer f1"></div><div class="fog-layer f2"></div><div class="rain-layer"></div><div class="lightning"></div><div class="snow-field" id="snowField"></div>`;
  vignetteEl = document.createElement('div'); vignetteEl.className = 'town-vignette';
  townView.appendChild(skyEl); townView.appendChild(weatherEl); townView.appendChild(vignetteEl);
  snowFieldEl = weatherEl.querySelector('#snowField');
  rainLayerEl = weatherEl.querySelector('.rain-layer');
  rainBuilt = false;
  applyWeather(true); applySky(true);
}

/* ---------------- layout and camera ---------------- */
function layoutTown() {
  const vw = townView.parentElement ? townView.parentElement.clientWidth : 0;
  if (!vw || townView.offsetParent === null) return false;
  tilePx = Math.max(38, Math.floor(vw / VIEW_COLS));
  // on tall phones show more of the village: use the room left under the map (tab bar, hint and log take about 170px)
  const top = townView.getBoundingClientRect().top, nav = document.getElementById('bottomNav');
  const room = window.innerHeight - top - ((nav && nav.offsetHeight) || 70) - 34;
  viewRows = Math.max(6, Math.min(15, Math.floor(room / tilePx)));
  townView.style.setProperty('--t', tilePx + 'px');
  townView.style.width = (tilePx * VIEW_COLS) + 'px';
  townView.style.height = (tilePx * viewRows) + 'px';
  return true;
}
function updateCamera(animate) {
  if (!townWorld) return;
  const m = getMap(state.currentDistrict), vw = tilePx * VIEW_COLS, vh = tilePx * viewRows;
  let cx = vw / 2 - (state.playerPos.x + 0.5) * tilePx, cy = vh / 2 - (state.playerPos.y + 0.5) * tilePx;
  cx = Math.min(0, Math.max(vw - m.w * tilePx, cx)); cy = Math.min(0, Math.max(vh - m.h * tilePx, cy));
  townWorld.style.transition = animate ? `transform ${STEP_MS}ms linear` : 'none';
  townWorld.style.transform = `translate(${cx}px, ${cy}px)`;
  updateNightHole(cx, cy, vw, vh);
}
// Cuts a soft hole in the night-darkening (.town-sky) and vignette layers exactly where the player stands,
// so the player reads as genuinely lit rather than merely brightened underneath a dark overlay - a CSS filter
// on the player alone can't out-brighten a layer painted on top of it, so the darkness has to skip that spot instead.
function updateNightHole(cx, cy, vw, vh) {
  if (!skyEl && !vignetteEl) return;
  const px = (state.playerPos.x + 0.5) * tilePx + cx, py = (state.playerPos.y + 0.5) * tilePx + cy;
  const xPct = vw ? (px / vw) * 100 : 50, yPct = vh ? (py / vh) * 100 : 50;
  const holeR = tilePx * 3.6;
  const mask = `radial-gradient(circle ${holeR}px at ${xPct}% ${yPct}%, transparent 0%, rgba(255,255,255,0.85) 100%)`;
  if (skyEl) skyEl.style.setProperty('--night-hole', mask);
  if (vignetteEl) vignetteEl.style.setProperty('--night-hole', mask);
}
function positionPlayer(animate) {
  if (state.companion && (!state.companionPos || Math.abs(state.companionPos.x - state.playerPos.x) + Math.abs(state.companionPos.y - state.playerPos.y) > 2))
    state.companionPos = besidePlayer();                              // arrived somewhere new: it catches up beside you
  if (!playerEl) {
    playerEl = document.createElement('div'); playerEl.className = 'ent player';
    playerEl.innerHTML = '<div class="pl-glow"></div><div class="pl-badge"></div><div class="ent-name"></div><div class="ent-title"></div>';
    townWorld.appendChild(playerEl);
  }
  playerEl.style.transition = animate ? `left ${STEP_MS}ms linear, top ${STEP_MS}ms linear` : 'none';
  playerEl.style.setProperty('--x', state.playerPos.x); playerEl.style.setProperty('--y', state.playerPos.y);
  playerEl.style.zIndex = state.playerPos.y * 2 + 2;
  const badge = playerEl.querySelector('.pl-badge'); badge.textContent = state.character.emoji; applyAvatarStyle(badge, state.character);
  const nameEl = playerEl.querySelector('.ent-name'); if (nameEl) nameEl.textContent = state.character.name || 'You';
  const titleEl = playerEl.querySelector('.ent-title'), t = currentTitle();
  if (titleEl) { titleEl.textContent = t ? t.name : ''; titleEl.classList.toggle('hidden', !t); }
}

/* ---------------- moving things: neighbors, cards, props, door hints ---------------- */
function renderEntities(data) {
  if (!townWorld) return;
  const m = getMap(state.currentDistrict);
  townWorld.querySelectorAll('.ent:not(.player)').forEach(e => e.remove());
  const add = (cls, x, y, html) => {
    const e = document.createElement('div'); e.className = 'ent ' + cls; e.dataset.x = x; e.dataset.y = y;
    e.style.setProperty('--x', x); e.style.setProperty('--y', y); e.style.zIndex = y * 2 + 1; e.innerHTML = html; townWorld.appendChild(e); return e;
  };
  m.props.forEach(p => { const e = add('prop', p.x, p.y, svgUse(PROP_SPRITE[p.type], 'prop')); e.dataset.prop = p.id; });
  (data.decorations || []).forEach(d => {
    const def = DECORATION_ITEMS.find(x => x.id === d.id);
    const e = add('decoration' + (def && def.night ? ' glowy' : ''), d.x, d.y, `<span>${def ? def.icon : '❔'}</span>`);
    e.dataset.uid = d.uid;
  });
  (data.crops || []).forEach(c => {
    const ready = cropStage(c) === 2;
    const e = add('crop' + (ready ? ' ready' : ''), c.x, c.y, `<span>${cropIcon(c)}</span>` + (ready ? '' : `<div class="crop-bar"><i style="width:${Math.round(cropProgress(c) * 100)}%"></i></div>`));
    e.dataset.uid = c.uid;
  });
  data.items.forEach(it => {
    if (it.collected) return;
    const e = add('item', it.x, it.y, '<span>🃏</span>');
    if (ITEM_DESPAWN_MS - (Date.now() - it.spawnedAt) < 6000) e.classList.add('despawning');
  });
  (data.spirits || []).forEach(s => {
    const def = cardDef(s.cardId);
    const e = add('spirit', s.x, s.y, `<span>${def ? def.icon : '✨'}</span>`);
    e.dataset.id = s.id;
  });
  if (data.chest) add('chest-glow', data.chest.x, data.chest.y, '<span class="chest-glow-core"></span><span class="chest-icon">🗝️</span>');
  if (state.companion && state.companionPos) { const ce = add('companion', state.companionPos.x, state.companionPos.y, `<span>${state.companion.icon}</span>`); ce.style.zIndex = state.companionPos.y * 2 + 2; }
  if (lanternOpen()) { const lv = add('vendor', LANTERN_TILE.x, LANTERN_TILE.y, '<span>🦉</span><div class="ent-name">Lantern Market</div>'); lv.style.zIndex = LANTERN_TILE.y * 2 + 2; }
  (data.bugs || []).forEach(b => { const def = bugDef(b.kind); add('bug' + (def && def.legendary ? ' legendary' : ''), b.x, b.y, `<span>${def ? def.icon : '✨'}</span>`); });
  if (state.currentDistrict === 'square' && unreadMail()) { const mf = add('mail-flag', 11, 1, '<span>📬</span>'); mf.style.zIndex = 60; }
  [...data.npcs, ...(data.boss ? [data.boss] : [])].forEach(f => {
    if (f.defeated) {
      if (!f.grave) return;
      const g = add('grave' + (f.isBoss ? ' grave-boss' : ''), f.grave.x, f.grave.y, svgUse(f.isBoss ? 'g-grave-boss' : 'g-grave', 'prop'));
      g.dataset.id = f.id; return;
    }
    // Alive-but-hidden: the boss is off on its 30-minutes-off half of the cycle, so skip it entirely.
    if (f.isBoss && !bossVisible()) return;
    const portrait = f.isBoss ? '<span>👹</span>' : `<span>${opponentPortrait(f)}</span>`;
    // close friends (3+ hearts) wear a little heart by their name; the rival gets a star
    const tag = f.isRival ? ' ⭐' : (!f.isBoss && friendHearts(f) >= SIG_HEARTS ? ' 💞' : '');
    const e = add(f.isBoss ? 'boss' : 'npc' + (f.isRival ? ' rival' : ''), f.x, f.y, portrait + `<div class="ent-name">${escapeHtml(f.name)}${tag}</div>`);
    e.dataset.id = f.id;
    if (f.justArrived) { e.classList.add('npc-arrive'); f.justArrived = false; }
  });
}

function renderTown(justMoved) {
  const key = state.currentDistrict, def = DISTRICTS[key], data = ensureDistrictData(key);
  syncRival();
  tickItems(data);
  districtNameEl.textContent = def.name;
  const sd = seasonDef();
  const ev = eventNow();
  document.getElementById('seasonTag').textContent = ` · ${sd.icon} ${sd.name} · ${ev.icon} ${ev.name}`;
  noteTodayEvent();
  townView.dataset.season = seasonNow();
  noteSeasonChange();
  if (!layoutTown()) return;
  if (townBuiltFor !== key || !townWorld || !townWorld.isConnected) buildWorld(key);
  else { applyWeather(); applySky(); }
  renderEntities(data);
  positionPlayer(false);
  updateCamera(false);
  updateAmbient();
  renderRadar();
}
window.addEventListener('resize', () => { if (!inBattle && !inScene) renderTown(); });

/* ---------------- district data: neighbors, boss, cards ---------------- */
function pickSpot(m, taken, data, walker) {
  const free = [], safe = [], roomy = [];
  const baseline = data ? cutOffCount(m, data, null, null) : 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!spawnable(m, x, y) || taken.has(x + ',' + y)) continue;
    free.push({ x, y });
    // Nobody may be placed where they would wall off part of the village (a gap in a fence, a narrow path).
    if (data && cutOffCount(m, data, null, x + ',' + y) > baseline) continue;
    // Keep fighters a couple of tiles apart so two of them never box each other into a lane.
    if (data && [...data.npcs, ...(data.boss ? [data.boss] : [])].some(o => Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) continue;
    safe.push({ x, y });
    // A walker also needs somewhere to walk to: at least two open neighbors, so it never starts boxed in.
    if (walker && stepOptionsFrom(m, data, walker, x, y) >= 2) roomy.push({ x, y });
  }
  const from = walker && roomy.length ? roomy : (safe.length ? safe : free);
  return from.length ? from[Math.floor(Math.random() * from.length)] : { x: m.spawn.x, y: m.spawn.y };
}
// One-line lore rolled once per spirit and kept for its lifetime, so re-tapping it tells the same story.
const SPIRIT_STORIES = [
  '{name} drifted in on the wind and never quite left {town}.',
  'Locals say {name} has watched over {town} for longer than anyone can remember.',
  'A quiet spirit - {name} only shows itself to those who slow down enough to notice.',
  '{name} seems to know every corner of {town} by heart.',
  'They say {name} brings luck to whoever crosses its path with a kind word.',
  '{name} flickers in and out of sight, like a memory not quite ready to fade.',
  'No one is quite sure where {name} came from, only that it has always been near {town}.',
  '{name} hums a tune too faint to place, gone the moment you try to listen closer.',
  'Children in {town} leave small gifts out for {name}, just in case the stories are true.',
  '{name} rarely lingers long enough to be seen twice in the same place.',
];
// Wandering spirit critters, drawn at random from the card pool - purely decorative flavor, added lazily
// so districts already visited (and cached) in an existing save pick some up too.
function ensureSpirits(key, data) {
  if (data.spirits) return data.spirits;
  const m = getMap(key), taken = new Set([state.playerPos.x + ',' + state.playerPos.y]);
  fighters(data).forEach(f => taken.add(f.x + ',' + f.y));
  data.items.forEach(it => taken.add(it.x + ',' + it.y));
  const spirits = [];
  for (let i = 0; i < 3; i++) {
    const s = pickSpot(m, taken, data, null);
    taken.add(s.x + ',' + s.y);
    const spiritPool = CARD_POOL.filter(c => !c.exclusive);
    const card = spiritPool[Math.floor(Math.random() * spiritPool.length)];
    const story = SPIRIT_STORIES[Math.floor(Math.random() * SPIRIT_STORIES.length)].replace('{name}', card.name).replace('{town}', DISTRICTS[key].name);
    spirits.push({ id: 'spirit-' + key + '-' + i, cardId: card.id, x: s.x, y: s.y, homeX: s.x, homeY: s.y, nextMoveAt: 0, story });
  }
  data.spirits = spirits;
  return spirits;
}
function ensureDistrictData(key) {
  if (state.districtData[key]) {
    const data = state.districtData[key];
    if (!data.decorations) data.decorations = [];
    ensureSpirits(key, data);
    return data;
  }
  const m = getMap(key), taken = new Set([state.playerPos.x + ',' + state.playerPos.y]), npcs = [], items = [];
  const partial = { npcs, boss: null, items: [] };
  const take = (walker) => { const s = pickSpot(m, taken, partial, walker); taken.add(s.x + ',' + s.y); return s; };
  for (let i = 0; i < 4; i++) {
    const s = take({ isBoss: false });
    npcs.push({ id: 'npc-' + key + '-' + i, name: randomNpcName(key, npcs.map(n => n.name)), x: s.x, y: s.y,
      deck: buildDeckForOpponent(DECK_SIZE, false), rewardCard: randomCardId(rollRewardRarity(false)), defeated: false, isBoss: false });
  }
  const bs = take({ isBoss: true });
  const boss = { id: 'boss-' + key, name: DISTRICTS[key].boss, x: bs.x, y: bs.y, deck: buildDeckForOpponent(DECK_SIZE, true), rewardCard: randomCardId(rollRewardRarity(true)), defeated: false, isBoss: true };
  for (let i = 0; i < 3; i++) {
    const s = take();
    items.push({ id: 'item-' + key + '-' + i, x: s.x, y: s.y, cardId: weightedTownCardId(rollTownFindRarity()), collected: false, spawnedAt: Date.now(), collectedAt: null });
  }
  state.districtData[key] = { npcs, boss, items, spirits: null, scenery: [], buildings: {}, decorations: [] };
  ensureSpirits(key, state.districtData[key]);
  return state.districtData[key];
}
function findFreeTile(data, walker) {
  const m = getMap(state.currentDistrict), taken = occupiedSet(data);
  return pickSpot(m, taken, data, walker);
}
function generateTiles() { /* maps are compiled on demand by getMap() */ }
function isAdjacent(x, y) { return Math.abs(x - state.playerPos.x) + Math.abs(y - state.playerPos.y) === 1; }
function buildingState(id) { const d = ensureDistrictData(state.currentDistrict); return d.buildings[id] || (d.buildings[id] = {}); }
function migrateMapV2() {
  if (state.progress.mapV2) return;
  state.progress.mapV2 = true;
  state.districtData = {};
  if (!state.currentDistrict || !DISTRICTS[state.currentDistrict]) state.currentDistrict = 'square';
  state.playerPos = Object.assign({}, getMap(state.currentDistrict).spawn);
  saveState();
}

/* ---------------- tap to walk ---------------- */
function cancelWalk() { walkToken++; if (playerEl) playerEl.classList.remove('walking'); }

function showProp(icon, title, desc) {
  sceneryIcon.textContent = icon; sceneryTitle.textContent = title; sceneryDesc.textContent = desc;
  sceneryOverlay.classList.remove('hidden'); sfx('tap'); buzz(HAP.tap);
}
function tapRing(x, y) {
  if (!townWorld) return;
  const e = document.createElement('div'); e.className = 'ent tap-ring'; e.style.setProperty('--x', x); e.style.setProperty('--y', y); e.style.zIndex = 1;
  townWorld.appendChild(e); setTimeout(() => e.remove(), 520);
}
function startWalk(path, done) {
  const token = ++walkToken;
  path = path.slice();
  if (!path.length) { pendingWalk = null; done && done(); return; }   // already there: the walk is finished, so it can never be resumed later
  let i = 0;
  const data = ensureDistrictData(state.currentDistrict);
  const m = getMap(state.currentDistrict);
  playerEl.classList.add('walking');
  const step = () => {
    if (token !== walkToken || inBattle || inScene) return;
    const fresh = chaseNextStep(path, i);
    if (fresh === null) { playerEl.classList.remove('walking'); saveState(); setChase(null); townLog.textContent = 'They wandered out of reach.'; return; }
    if (fresh !== path) path = fresh;
    if (i >= path.length) { playerEl.classList.remove('walking'); saveState(); pendingWalk = null; done && done(); return; }
    const p = path[i++];
    const prevPos = state.playerPos;
    state.playerPos = { x: p.x, y: p.y };
    followPlayer(prevPos);
    positionPlayer(true); updateCamera(true);
    if (i % 2 === 1) { sfx('step'); buzz(HAP.step); }
    bumpStat('steps', 1); noteStep(state.playerPos.x, state.playerPos.y);
    const exit = m.exits[p.x + ',' + p.y];
    if (exit) { walkToken++; playerEl.classList.remove('walking'); saveState(); pendingWalk = null; crossExit(exit); return; }
    const item = data.items.find(it => it.x === p.x && it.y === p.y && !it.collected);
    if (item) { walkToken++; playerEl.classList.remove('walking'); saveState(); collectItem(item); return; }
    if (data.chest && data.chest.x === p.x && data.chest.y === p.y) { walkToken++; playerEl.classList.remove('walking'); openChest(data); return; }
    // A rare hidden card tucked in the grass or flowers - each tile only ever gives one up.
    const tileChar = m.rows[p.y] && m.rows[p.y][p.x];
    if (tileChar === ',' || tileChar === '.') {
      if (!data.foundTiles) data.foundTiles = {};
      const tk = p.x + ',' + p.y;
      maybeFindSeed(data, tk);                        // a seed never interrupts the walk, it just goes in your pocket
      if (!data.foundTiles[tk]) {
        const chance = (tileChar === ',' ? 0.025 : 0.008) * (weatherFx().findMult || 1) * (hasPerk('finds') ? 1.5 : 1) * (1 + cardBonus('finds'));   // fog, a sharp-eyed companion and charms find more
        if (Math.random() < chance) {
          data.foundTiles[tk] = true;
          walkToken++; playerEl.classList.remove('walking'); saveState();
          grantHiddenCard('You spot something in the grass');
          return;
        }
      }
    }
    setTimeout(step, STEP_MS);
  };
  step();
}
let pendingWalk = null;   // { isGoal, done } for a walk that a card pickup interrupted
function walkThen(isGoal, done) {
  const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict);
  const path = findPath(m, data, state.playerPos, isGoal);
  if (!path) { townLog.textContent = "You can't get there from here."; sfx('soft'); return false; }
  pendingWalk = done ? { isGoal, done } : null;
  startWalk(path, done); return true;
}
/* After a card pickup closes, carry on with whatever the walk was for (a chat, a fight, a door, the water). */
function resumePendingWalk() {
  const w = pendingWalk; pendingWalk = null;
  if (!w || inBattle || inScene || !townWorld) return;
  const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict);
  const path = findPath(m, data, state.playerPos, w.isGoal);
  if (path) { pendingWalk = { isGoal: w.isGoal, done: w.done }; startWalk(path, w.done); }
}
const adjacentTo = (t) => (x, y) => Math.abs(x - t.x) + Math.abs(y - t.y) === 1;

function interactWith(kind, t) {
  if (inBattle || inScene) return;
  if (kind === 'talk') { openTalk(t); return; }
  if (kind === 'fight') {
    const tw = bossTwistFor(t);
    townLog.textContent = t.isBoss ? `${t.name} rises to meet you.${tw ? ' ' + BattleEngine.TWISTS[tw].icon + ' ' + BattleEngine.TWISTS[tw].text : ' This will be a tougher match.'}` : `${t.name} looks up, ready for a friendly match.`;
    sfx('tap'); buzz(HAP.tap); startBattle(t);
  } else if (kind === 'prop' && t.type === 'fountain') {
    sfx('claim'); buzz(HAP.tap); openScene('cup');
  } else if (kind === 'prop' && t.type === 'sign' && state.currentDistrict === 'market') {
    sfx('claim'); openScene('trades');
  } else if (kind === 'prop' && t.type === 'sign') {
    showProp('🪧', t.title + ' · weather board', `${t.desc} ${forecastText()} Today: ${eventNow().icon} ${eventNow().name} - ${eventNow().text}`); showTipOnce('forecast');
  } else if (kind === 'prop') {
    const data = ensureDistrictData(state.currentDistrict);
    if (!data.propFinds) data.propFinds = {};
    if (!data.propFinds[t.id] && Math.random() < 0.15) {
      data.propFinds[t.id] = true; saveState();
      grantHiddenCard('A closer look pays off');
      return;
    }
    showProp(PROP_ICON[t.type] || '✨', t.title, t.desc);
  } else if (kind === 'building') {
    if (t.enter) { sfx('claim'); buzz(HAP.tap); openScene(t.enter); }
    else showProp(PROP_ICON.door, 'Closed for now', t.locked || 'The door is shut.');
  } else if (kind === 'spirit') {
    bumpStat('spiritsMet', 1);
    const cloudy = weatherIs('cloudy') || eventIs('spirit-parade');   // overcast days (and the Spirit Parade) bring spirits closer: double XP
    if (cloudy) addXP(XP_PER_STAT.spiritsMet);
    showCardReveal(t.cardId, 'A card spirit appears', false, t.story + (cloudy ? ' ☁️ The clouds make it linger.' : ''), XP_PER_STAT.spiritsMet * (cloudy ? 2 : 1));
    if (!state.companion) {                             // no companion yet: this one could come along
      const inv = document.getElementById('pickupInvite');
      inv.dataset.spirit = t.id; inv.classList.remove('hidden');
      const perk = COMPANION_PERKS[companionPerkFor(t.cardId)];
      inv.textContent = `✨ Invite it along (${perk.text.toLowerCase()})`;
      showTipOnce('companion');
    }
  } else if (kind === 'crop') {
    tickCrops();
    if (cropStage(t) === 2) harvestCrop(t); else showCrop(t);
  } else if (kind === 'decoration') {
    const def = DECORATION_ITEMS.find(x => x.id === t.id);
    showProp(def ? def.icon : '❔', def ? def.name : 'A decoration', (def ? def.desc : 'Something you placed here.') + ' You set this down yourself.');
  }
}
// A rare hidden card, found on the ground or tucked near a prop - mostly common, rarely rare, and
// weighted toward cards already owned so it plays like a nice duplicate rather than a jackpot.
function grantHiddenCard(label) {
  const cardId = weightedTownCardId(rollTownFindRarity());
  const isNewCard = !state.ownedCards.includes(cardId);
  state.ownedCards.push(cardId);
  saveState(); updateHud();
  bumpPill('pillCards'); bumpStat('cardsFound', 1);
  if (isNewCard) toast('📖 New entry in your Index');
  sfx('claim'); buzz(HAP.tap);
  showCardReveal(cardId, label, false, null, XP_PER_STAT.cardsFound);
}
function decorationAt(data, x, y) { return (data.decorations || []).find(d => d.x === x && d.y === y) || null; }
function handleMapTap(tx, ty) {
  if (inBattle || inScene) return;
  if (placingDecoration) { handleDecorationTap(tx, ty); return; }
  const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict);
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return;
  cancelWalk(); setChase(null); pendingWalk = null;
  const boss = data.boss && !data.boss.defeated && bossVisible() && data.boss.x === tx && data.boss.y === ty ? data.boss : null;
  const npc = data.npcs.find(n => !n.defeated && n.x === tx && n.y === ty);
  const fighter = boss || npc;
  if (fighter) {
    setChase(fighter);
    if (!walkThen(adjacentTo(fighter), () => { setChase(null); interactWith(fighter.isBoss ? 'fight' : 'talk', fighter); })) setChase(null);
    return;
  }
  const grv = graveAt(data, tx, ty);
  if (grv) { showGrave(grv); return; }
  const bug = bugAt(data, tx, ty);
  if (bug) { walkThen(adjacentTo(bug), () => catchBug(bug)); return; }
  if (lanternOpen() && tx === LANTERN_TILE.x && ty === LANTERN_TILE.y) { walkThen(adjacentTo(LANTERN_TILE), () => { sfx('claim'); openScene('lantern'); showTipOnce('lantern'); }); return; }
  const spirit = (data.spirits || []).find(s => s.x === tx && s.y === ty);
  if (spirit) { walkThen(adjacentTo(spirit), () => interactWith('spirit', spirit)); return; }
  const crop = cropAt(data, tx, ty);
  if (crop) { walkThen(adjacentTo(crop), () => interactWith('crop', crop)); return; }
  const deco = decorationAt(data, tx, ty);
  if (deco) { walkThen(adjacentTo(deco), () => interactWith('decoration', deco)); return; }
  const prop = propAt(m, tx, ty);
  if (prop) { walkThen(adjacentTo(prop), () => interactWith('prop', prop)); return; }
  const bld = buildingAt(m, tx, ty);
  if (bld) { walkThen((x, y) => x === bld.entry.x && y === bld.entry.y, () => interactWith('building', bld)); return; }
  if (tryFishTap(m, tx, ty)) return;
  if (m.solid[ty][tx]) {
    const c = m.rows[ty][tx], list = c === '~' ? WATER_FLAVOR : TREE_FLAVOR;
    townLog.textContent = list[(tx * 7 + ty * 3) % list.length]; sfx('soft'); return;
  }
  if (tx === state.playerPos.x && ty === state.playerPos.y) return;
  tapRing(tx, ty);
  walkThen((x, y) => x === tx && y === ty, null);
}

/* ---------------- decoration placement: buy in Shop > Items, then tap a glowing tile in whichever district you are in ----------------
   Decorations don't block movement (unlike map props), so placement never needs the "would this wall off
   part of the village" safety check that NPC/item spawns use - it only needs an open, reachable, unoccupied tile.
   The same flow plants seeds (placingDecoration.seed), which always go in Town Square's garden ground. */
// placingDecoration: { item, district, movingUid, movingOriginal, seed } - movingUid/movingOriginal are set only when
// repositioning an already-placed decoration (Move), seed only when planting.
let placingDecoration = null;
function decorationInventoryCount(id) { return (state.decorationInventory && state.decorationInventory[id]) || 0; }
function decorationPlaceableTiles(district) {
  const m = getMap(district), data = ensureDistrictData(district), occ = occupiedSet(data), tiles = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!spawnable(m, x, y) || occ.has(x + ',' + y)) continue;
    tiles.push({ x, y });
  }
  return tiles;
}
function canPlaceDecorationAt(district, x, y) {
  const m = getMap(district);
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  if (!spawnable(m, x, y)) return false;
  return !occupiedSet(ensureDistrictData(district)).has(x + ',' + y);
}
function highlightPlaceableTiles() {
  if (!townWorld || !placingDecoration) return;
  const valid = new Set(decorationPlaceableTiles(placingDecoration.district).map(t => t.x + ',' + t.y));
  townWorld.querySelectorAll('.town-tile').forEach(el => {
    el.classList.toggle('placeable', valid.has(el.dataset.x + ',' + el.dataset.y));
  });
}
function clearPlaceableHighlight() {
  if (!townWorld) return;
  townWorld.querySelectorAll('.town-tile.placeable').forEach(el => el.classList.remove('placeable'));
}
// Every placed decoration, wherever it is: [{ district, deco }].
function allDecorations() {
  const out = [];
  Object.keys(state.districtData).forEach(k => (state.districtData[k].decorations || []).forEach(d => out.push({ district: k, deco: d })));
  return out;
}
function findDecoration(uid) {
  for (const k of Object.keys(state.districtData)) {
    const list = state.districtData[k].decorations || [], idx = list.findIndex(d => d.uid === uid);
    if (idx >= 0) return { district: k, list, idx };
  }
  return null;
}
// Walks you (instantly) to a district so placement happens where you can see it.
function goToDistrictFor(district) {
  if (state.currentDistrict === district) return;
  state.currentDistrict = district;
  state.playerPos = Object.assign({}, getMap(district).spawn);
  saveState();
}
function beginPlacementUI(text) {
  switchTab('town');
  document.getElementById('districtLabel').classList.add('hidden');
  document.getElementById('decorationHintText').textContent = text;
  document.getElementById('decorationHint').classList.remove('hidden');
  renderTown();
  highlightPlaceableTiles();
}
// item: a DECORATION_ITEMS entry. movingUid: pass an existing placed decoration's uid to relocate it (within its own
// district) instead of spending one from inventory - its old spot is freed up (and highlightable) while you choose.
function startPlacingDecoration(item, movingUid) {
  if (inBattle || inScene) return;
  let movingOriginal = null, district = state.currentDistrict;
  if (movingUid) {
    const found = findDecoration(movingUid);
    if (!found) return;
    district = found.district;
    movingOriginal = found.list.splice(found.idx, 1)[0];
  } else if (decorationInventoryCount(item.id) <= 0) {
    return;
  }
  placingDecoration = { item, district, movingUid: movingUid || null, movingOriginal };
  goToDistrictFor(district);
  beginPlacementUI(`${movingUid ? 'Moving' : 'Placing'} ${item.icon} ${item.name} in ${DISTRICTS[district].name} - tap a glowing tile`);
}
function endPlacementUI() {
  document.getElementById('decorationHint').classList.add('hidden');
  document.getElementById('districtLabel').classList.remove('hidden');
  clearPlaceableHighlight();
}
function cancelPlacingDecoration(silent) {
  if (!placingDecoration) return;
  const { movingUid, movingOriginal, district } = placingDecoration;
  if (movingUid && movingOriginal) ensureDistrictData(district).decorations.push(movingOriginal);
  placingDecoration = null;
  endPlacementUI();
  if (movingUid) renderTown();
  if (!silent) { sfx('nav'); buzz(HAP.tap); }
}
function handleDecorationTap(tx, ty) {
  const { item, movingUid, movingOriginal, district, seed } = placingDecoration;
  if (state.currentDistrict !== district) { cancelPlacingDecoration(true); return; }
  if (!canPlaceDecorationAt(district, tx, ty)) { toast(seed ? "Can't plant there" : "Can't place it there"); sfx('tie'); return; }
  const data = ensureDistrictData(district), where = DISTRICTS[district].name;
  if (seed) {
    plantSeed(seed, tx, ty);
  } else if (movingUid) {
    data.decorations.push(Object.assign({}, movingOriginal, { x: tx, y: ty }));
    logEvent(item.icon, `Moved the ${item.name} in ${where}.`);
    toast(`${item.icon} Moved`);
  } else {
    if (decorationInventoryCount(item.id) <= 0) { toast("You don't have one to place"); placingDecoration = null; endPlacementUI(); return; }
    state.decorationInventory[item.id]--;
    data.decorations.push({ uid: 'deco-' + Date.now() + '-' + Math.floor(Math.random() * 1000), id: item.id, x: tx, y: ty });
    bumpStat('decorationsPlaced', 1);
    logEvent(item.icon, `Placed a ${item.name} in ${where}.`);
    toast(`${item.icon} Placed in ${where}`);
  }
  saveState(); updateHud();
  sfx('claim'); buzz(HAP.found);
  placingDecoration = null;
  endPlacementUI();
  renderTown();
  if (!shopPanel.classList.contains('hidden') && shopSubView === 'items') renderItems();
}
function buyDecoration(item) {
  if (state.progress.pebbles < item.cost) { toast('Not enough Pebbles yet'); sfx('tie'); return; }
  state.progress.pebbles -= item.cost;
  state.decorationInventory[item.id] = decorationInventoryCount(item.id) + 1;
  saveState(); updateHud(); bumpPill('pillPebbles');
  logEvent(item.icon, `Bought a ${item.name} for the town.`);
  toast(`${item.icon} Added to your decorations`); sfx('claim'); buzz(HAP.found);
  renderItems();
}
function storeDecoration(uid) {
  const found = findDecoration(uid);
  if (!found) return;
  const d = found.list.splice(found.idx, 1)[0];
  const item = DECORATION_ITEMS.find(x => x.id === d.id);
  state.decorationInventory[d.id] = decorationInventoryCount(d.id) + 1;
  saveState(); updateHud();
  logEvent(item ? item.icon : '📦', `Stored a ${item ? item.name : 'decoration'} back in your decorations.`);
  toast('Stored - find it under Your Decorations'); sfx('tap'); buzz(HAP.tap);
  renderTown(); renderItems();
}
function deleteDecoration(uid) {
  const found = findDecoration(uid);
  if (!found) return;
  const item = DECORATION_ITEMS.find(x => x.id === found.list[found.idx].id);
  if (!confirm(`Remove this ${item ? item.name : 'decoration'} for good? It won't return to your decorations.`)) return;
  found.list.splice(found.idx, 1);
  saveState();
  logEvent(item ? item.icon : '🗑️', `Removed a ${item ? item.name : 'decoration'} from ${DISTRICTS[found.district].name}.`);
  toast('Removed'); sfx('tie');
  renderTown(); renderItems();
}

townView.addEventListener('click', e => {
  if (!townWorld) return;
  const r = townWorld.getBoundingClientRect();
  handleMapTap(Math.floor((e.clientX - r.left) / tilePx), Math.floor((e.clientY - r.top) / tilePx));
});

