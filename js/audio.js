/* ============================================================
   PREFS, SOUND, HAPTICS, TOAST
   ============================================================ */
let prefs = { sound: true, haptics: true, music: true, musicVol: 0.5, sfxVol: 0.7, notifs: false, sharePresence: true, presenceChosen: false, ambient: true, theme: 'dark' };   // sound = master mute for everything; notifs default off (needs a permission grant); sharePresence defaults ON until the player toggles it (presenceChosen)
try { const pr = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); if (pr) prefs = Object.assign(prefs, pr); } catch (e) { /* ignore */ }
// An older save stored the old default (off) without the player ever choosing it, so treat that as "not chosen yet" and use the new default.
if (!prefs.presenceChosen) prefs.sharePresence = true;
// Repair anything a corrupted/edited save could hand us
['musicVol', 'sfxVol'].forEach(k => { const v = Number(prefs[k]); prefs[k] = (isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5); });
prefs.sound = prefs.sound !== false; prefs.music = prefs.music !== false; prefs.haptics = prefs.haptics !== false; prefs.ambient = prefs.ambient !== false; if (!['dark', 'light', 'auto'].includes(prefs.theme)) prefs.theme = 'dark';   // ambient (town sounds) is on unless the player turned it off
/* Colour theme: prefs.theme is 'dark' (the default), 'light' or 'auto' (follows the device). The CSS keys off
   <html data-theme> - see the token block at the top of css/style.css. Applied here, before the first paint of
   anything else, so there is no flash of the wrong theme. */
const THEME_META = { dark: '#12161b', light: '#f3ece0' };
const themeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
function resolvedTheme() { return prefs.theme === 'light' ? 'light' : prefs.theme === 'auto' && themeQuery && themeQuery.matches ? 'light' : 'dark'; }
function applyTheme() {
  const th = resolvedTheme();
  document.documentElement.setAttribute('data-theme', th);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', THEME_META[th]);
}
applyTheme();
if (themeQuery && themeQuery.addEventListener) themeQuery.addEventListener('change', () => { if (prefs.theme === 'auto') applyTheme(); });
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }

/* ============================================================
   LOCAL TIMER NOTIFICATIONS (opt-in, no server)
   The PWA already ships a service worker, so a player who leaves the tab open or backgrounded - not fully
   closed or killed, mobile OSes vary on how long that keeps running - can get a local notification when a
   real-time wait finishes: bread at the bakery, or the district boss's 30-minute cycle (see ovenAction() in
   js/houses-and-cellar.js and checkBossCycle() in js/neighbors-bosses.js for where these get scheduled).
   Deliberately scoped to just those two: crop growth's rate changes with weather/perks/events after
   planting, so there's no fixed "ready at" timestamp to schedule against up front the way there is for the
   other two. This needs no push infrastructure since it only ever fires from code already running in this
   tab - a genuinely closed/killed app still won't notify, same as any other client-only PWA feature.
   ============================================================ */
function notifsEnabled() { return !!prefs.notifs && 'Notification' in window && Notification.permission === 'granted'; }
async function requestNotifPermission() {
  if (!('Notification' in window)) { toast("This browser can't show notifications"); return false; }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') { toast('Notifications are blocked - check your browser/site settings'); return false; }
  try { return (await Notification.requestPermission()) === 'granted'; } catch (e) { return false; }
}
function localNotify(title, body, tag) {
  if (!notifsEnabled() || document.visibilityState === 'visible') return;   // already looking at it - no need to nag
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, tag, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png' })).catch(() => {});
    } else {
      new Notification(title, { body, tag, icon: 'assets/icon-192.png' });
    }
  } catch (e) { /* ignore */ }
}
const notifTimers = {};
// Re-callable any time (on the triggering action, and once at start-up for anything already pending) -
// clears any previous timer under the same key first, so re-scheduling the same wait never double-fires.
function scheduleLocalNotify(key, atMs, title, body) {
  clearTimeout(notifTimers[key]);
  if (!notifsEnabled()) return;
  const delay = atMs - Date.now();
  if (delay <= 0) return;
  notifTimers[key] = setTimeout(() => localNotify(title, body, key), delay);
}

let userHasTouched = false;
let audioCtx = null, masterGain = null, sfxBus = null, musicBus = null;

// Perceptual volume curve: a linear slider feels far too loud at the top and nothing at the bottom.
function volCurve(v) { return v * v; }

function ensureAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      sfxBus = audioCtx.createGain();
      musicBus = audioCtx.createGain();
      // A peak safety limiter, not a "glue" compressor: it should only catch occasional peaks, not sit
      // engaged on ordinary listening levels. The original settings (-14dB threshold, 6:1 ratio, 24dB knee)
      // meant the compressor was almost always doing some gain reduction on the pad's normal level, which
      // is audible as constant pumping/ducking every time a new voice or SFX fires - reported as "muffled,
      // compressed, not smooth." A much higher threshold with a tight knee means it stays fully transparent
      // until something actually gets close to clipping.
      const limiter = audioCtx.createDynamicsCompressor();
      limiter.threshold.value = -4; limiter.knee.value = 4; limiter.ratio.value = 4; limiter.attack.value = 0.003; limiter.release.value = 0.15;
      sfxBus.connect(masterGain); musicBus.connect(masterGain);
      masterGain.connect(limiter); limiter.connect(audioCtx.destination);
      applyVolumes(true);
    }
    if (audioCtx.state === 'suspended' && prefs.sound) audioCtx.resume();
  } catch (e) { audioCtx = null; }
  return prefs.sound ? audioCtx : null;
}

function applyVolumes(instant) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, ramp = instant ? 0.01 : 0.25;
  const set = (node, v) => { node.gain.cancelScheduledValues(t); node.gain.setTargetAtTime(v, t, ramp / 3); };
  set(masterGain, prefs.sound ? 1 : 0);
  set(sfxBus, volCurve(prefs.sfxVol));
  set(musicBus, prefs.music ? volCurve(prefs.musicVol) : 0);
}

function tone(freq, start, dur, vol, type) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(sfxBus);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}


/* ============================================================
   AMBIENT MUSIC: a slowly drifting pad, generated live.
   Never loops: chords, voicing, filter motion and timing are all
   re-rolled every few seconds, so it evolves rather than repeats.
   ============================================================ */
const MUSIC = {
  running: false, nodes: null, timer: null, voices: [], chordIndex: 0, started: false,
  gen: 0,          // bumped on every start/stop: any callback from an older generation is ignored
  // Everything lives in D major pentatonic-friendly territory (Dsus2 / Gmaj7 / Bm7 / Asus4 / Em7 / F#m7),
  // so any chord can follow any other and nothing ever sounds tense. Frequencies in Hz.
  CHORDS: [
    { name: 'Dsus2',  notes: [146.83, 220.00, 293.66, 329.63, 440.00] },        // D3 A3 D4 E4 A4
    { name: 'Gmaj7',  notes: [196.00, 246.94, 293.66, 369.99, 493.88] },        // G3 B3 D4 F#4 B4
    { name: 'Bm7',    notes: [123.47, 246.94, 293.66, 369.99, 440.00] },        // B2 B3 D4 F#4 A4
    { name: 'Asus4',  notes: [110.00, 220.00, 293.66, 329.63, 440.00] },        // A2 A3 D4 E4 A4
    { name: 'Em7',    notes: [164.81, 246.94, 293.66, 392.00, 493.88] },        // E3 B3 D4 G4 B4
    { name: 'F#m7',   notes: [185.00, 220.00, 277.18, 369.99, 415.30] }         // F#3 A3 C#4 F#4 G#4
  ],
  // Each season has its own chord family; summer keeps the original D set above. Every set stays within one
  // key so any chord can still follow any other.
  SEASON_CHORDS: {
    spring: [                                                                     // G major, bright and open
      { name: 'Gadd9', notes: [196.00, 246.94, 293.66, 440.00, 493.88] },
      { name: 'Cmaj7', notes: [130.81, 196.00, 246.94, 329.63, 392.00] },
      { name: 'Em7',   notes: [164.81, 246.94, 293.66, 392.00, 493.88] },
      { name: 'Dsus2', notes: [146.83, 220.00, 293.66, 329.63, 440.00] },
      { name: 'Am7',   notes: [110.00, 164.81, 196.00, 261.63, 329.63] }
    ],
    autumn: [                                                                     // A minor, warm and low
      { name: 'Am9',   notes: [110.00, 164.81, 196.00, 246.94, 261.63] },
      { name: 'Fmaj7', notes: [87.31, 130.81, 164.81, 220.00, 261.63] },
      { name: 'Cmaj7', notes: [130.81, 164.81, 196.00, 246.94, 329.63] },
      { name: 'Gsus2', notes: [98.00, 146.83, 196.00, 220.00, 293.66] },
      { name: 'Dm7',   notes: [146.83, 220.00, 261.63, 349.23, 440.00] }
    ],
    winter: [                                                                     // E minor, sparse and airy
      { name: 'Em(add9)', notes: [164.81, 246.94, 369.99, 392.00, 493.88] },
      { name: 'Cmaj7',    notes: [130.81, 196.00, 246.94, 329.63, 493.88] },
      { name: 'Gmaj7',    notes: [98.00, 146.83, 293.66, 369.99, 493.88] },
      { name: 'D6/9',     notes: [146.83, 220.00, 246.94, 329.63, 369.99] },
      { name: 'Bm7',      notes: [123.47, 185.00, 220.00, 293.66, 369.99] }
    ]
  }
};
function musicChords() { return MUSIC.SEASON_CHORDS[seasonNow()] || MUSIC.CHORDS; }

// Soft reverb from a generated impulse response (a decaying, filtered noise tail), so no audio file is needed.
function makeReverb(ctx, seconds, decay) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, decay);
      lp += ((Math.random() * 2 - 1) - lp) * 0.45;       // one-pole low-pass keeps the tail soft without going muffled
      d[i] = lp * env;
    }
  }
  const conv = ctx.createConvolver(); conv.buffer = buf; return conv;
}

function buildMusicGraph(ctx) {
  const out = ctx.createGain();            out.gain.value = 0.0001;       // fades in/out as a whole
  const dry = ctx.createGain();            dry.gain.value = 0.65;
  const wet = ctx.createGain();            wet.gain.value = 0.55;
  // Shorter than the original 5.5s/2.2 decay: a long convolution tail both costs more CPU per audio callback
  // (continuous on a low-power phone) and smears transients into each other, reading as muddiness on top of
  // the compressor pumping fixed above.
  const reverb = makeReverb(ctx, 3.2, 1.8);

  // Breathing low-pass: the pad slowly opens and closes. Raised from the original 900Hz/±380 range, which
  // cut most of the pad's harmonic content and read as muffled rather than calm - see WEATHER_MUSIC_PROFILE
  // below for the same fix applied per weather kind.
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1500; filter.Q.value = 0.5;
  const lfo = ctx.createOscillator();      lfo.type = 'sine'; lfo.frequency.value = 0.045;           // one breath ≈ 22s
  const lfoDepth = ctx.createGain();       lfoDepth.gain.value = 450;
  lfo.connect(lfoDepth); lfoDepth.connect(filter.frequency); lfo.start();

  // Gentle stereo drift
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  let panLfo = null;
  if (pan) {
    panLfo = ctx.createOscillator(); panLfo.type = 'sine'; panLfo.frequency.value = 0.031;
    const pd = ctx.createGain(); pd.gain.value = 0.35; panLfo.connect(pd); pd.connect(pan.pan); panLfo.start();
  }

  const voiceBus = ctx.createGain(); voiceBus.gain.value = 0.34;
  voiceBus.connect(filter);
  if (pan) { filter.connect(pan); pan.connect(dry); pan.connect(reverb); } else { filter.connect(dry); filter.connect(reverb); }
  reverb.connect(wet);
  dry.connect(out); wet.connect(out); out.connect(musicBus);

  return { out, voiceBus, filter, lfo, panLfo, reverb, wet };
}

// How the calm pad itself leans with the weather: darker/dimmer and more spacious when it's grey out,
// brighter and drier when it's clear. Chord changes also breathe slower under heavier weather.
// Filter frequencies raised and wet/reverb levels brought back under the dry signal across the board - the
// original values (as low as 480Hz, with wet exceeding dry under any non-clear weather) made the pad sound
// muffled rather than atmospheric, especially on phone speakers. Weather still darkens/wets the pad relative
// to clear, just from a brighter, clearer starting point.
const WEATHER_MUSIC_PROFILE = {
  clear:  { filter: 1700, wet: 0.45, tempoMin: 9,  tempoMax: 15 },
  cloudy: { filter: 1350, wet: 0.55, tempoMin: 10, tempoMax: 16 },
  rain:   { filter: 1050, wet: 0.68, tempoMin: 11, tempoMax: 18 },
  storm:  { filter: 820,  wet: 0.78, tempoMin: 13, tempoMax: 20 },
  snow:   { filter: 1150, wet: 0.75, tempoMin: 12, tempoMax: 19 },
};
// Each district leans the same in-key chords a different way, so the town has a musical identity without ever
// changing key: which of the 5 tones get picked (low/high/mixed), how much they shimmer, and how unhurried the
// changes feel. The notes themselves always come from musicChords() - only the voicing and pacing shift here.
const BIOME_MUSIC = {
  meadow:  { voicing: 'mixed', shimmer: 0.6,  tempoMul: 1 },       // El Umbral: the original balanced feel
  bazaar:  { voicing: 'high',  shimmer: 0.5,  tempoMul: 0.82 },    // El Mercado de Susurros: brighter and a little quicker
  harbor:  { voicing: 'low',   shimmer: 0.45, tempoMul: 1.25 },    // La Orilla del Arrullo: deep and unhurried
  orchard: { voicing: 'mixed', shimmer: 0.8,  tempoMul: 1.05 },    // El Jardín Lúcido: more sparkle overhead
};
function biomeMusic() { return BIOME_MUSIC[BIOME_OF[state.currentDistrict] || 'meadow'] || BIOME_MUSIC.meadow; }
function applyWeatherToMusic() {
  if (!MUSIC.nodes || !audioCtx) return;
  const kind = state.weather.current || 'clear';
  const p = WEATHER_MUSIC_PROFILE[kind] || WEATHER_MUSIC_PROFILE.clear;
  const t = audioCtx.currentTime;
  MUSIC.nodes.filter.frequency.cancelScheduledValues(t);
  MUSIC.nodes.filter.frequency.setTargetAtTime(p.filter, t, 4);
  MUSIC.nodes.wet.gain.cancelScheduledValues(t);
  MUSIC.nodes.wet.gain.setTargetAtTime(p.wet, t, 4);
  MUSIC.weatherProfile = p;
}

// One pad voice: two slightly detuned oscillators with a very slow attack and release.
function spawnVoice(ctx, nodes, freq, holdSec) {
  const t0 = ctx.currentTime;
  const attack = 5 + Math.random() * 3, release = 6 + Math.random() * 3;
  const g = ctx.createGain(); g.gain.value = 0.0001;
  const type = Math.random() < 0.7 ? 'sine' : 'triangle';
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = type; o2.type = type;
  o1.frequency.value = freq; o2.frequency.value = freq;
  o1.detune.value = -(4 + Math.random() * 5);       // a few cents apart = slow, warm beating
  o2.detune.value =  (4 + Math.random() * 5);
  // Each voice wanders a tiny bit in pitch
  const vib = ctx.createOscillator(), vibG = ctx.createGain();
  vib.frequency.value = 0.08 + Math.random() * 0.12; vibG.gain.value = 2.5;
  vib.connect(vibG); vibG.connect(o1.detune); vibG.connect(o2.detune);

  const peak = 0.10 + Math.random() * 0.05;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.setValueAtTime(peak, t0 + attack + holdSec);
  g.gain.linearRampToValueAtTime(0.0001, t0 + attack + holdSec + release);

  o1.connect(g); o2.connect(g); g.connect(nodes.voiceBus);
  const stopAt = t0 + attack + holdSec + release + 0.2;
  o1.start(t0); o2.start(t0); vib.start(t0);
  o1.stop(stopAt); o2.stop(stopAt); vib.stop(stopAt);
  const v = { stopAt, g, o1, o2, vib };
  MUSIC.voices.push(v);
  o1.onended = () => { MUSIC.voices = MUSIC.voices.filter(x => x !== v); try { g.disconnect(); } catch (e) { /* ignore */ } };
}

// A sparse, very quiet high "shimmer" note, drawn from the current chord an octave up
function spawnShimmer(ctx, nodes, freq) {
  const t0 = ctx.currentTime, dur = 7 + Math.random() * 4;
  const g = ctx.createGain(); g.gain.value = 0.0001;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * 2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.022, t0 + 2.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(nodes.voiceBus);
  o.start(t0); o.stop(t0 + dur + 0.1);
  o.onended = () => { try { g.disconnect(); } catch (e) { /* ignore */ } };
}

function nextChord() {
  if (!MUSIC.running || !audioCtx) return;
  const ctx = audioCtx, nodes = MUSIC.nodes, gen = MUSIC.gen;
  const alive = () => MUSIC.running && MUSIC.gen === gen;     // false once stopped OR restarted since this was scheduled

  // Move to a different chord (never repeat the same one twice in a row)
  const chords = musicChords(), biome = biomeMusic();
  let idx;
  do { idx = Math.floor(Math.random() * chords.length); } while (idx === MUSIC.chordIndex);
  MUSIC.chordIndex = idx;
  const chord = chords[idx];

  // Pick 3 or 4 of the 5 chord tones so the voicing changes every time - which tones lean low, high or mixed
  // depends on the district's biome (see BIOME_MUSIC), never which notes exist.
  const sorted = chord.notes.slice().sort((a, b) => a - b);
  const pool = biome.voicing === 'low' ? sorted : biome.voicing === 'high' ? sorted.slice().reverse() : sorted.sort(() => Math.random() - 0.5);
  const count = 3 + (Math.random() < 0.5 ? 1 : 0);
  const hold = 6 + Math.random() * 6;
  pool.slice(0, count).forEach((f, i) => {
    // stagger entries slightly so the chord blooms instead of switching on at once
    setTimeout(() => { if (alive()) spawnVoice(ctx, nodes, f, hold); }, i * (900 + Math.random() * 1100));
  });
  if (Math.random() < biome.shimmer) setTimeout(() => { if (alive()) spawnShimmer(ctx, nodes, chord.notes[Math.floor(Math.random() * chord.notes.length)]); }, 3000 + Math.random() * 5000);

  // Re-roll the next change: drifts rather than ticks, paced a little slower under heavier weather and biased
  // by the district's own tempo (harbor lingers, market moves along).
  const prof = MUSIC.weatherProfile || WEATHER_MUSIC_PROFILE.clear;
  MUSIC.timer = setTimeout(() => { if (alive()) nextChord(); }, (prof.tempoMin + Math.random() * (prof.tempoMax - prof.tempoMin)) * biome.tempoMul * 1000);
}

function startMusic() {
  if (!prefs.sound || !prefs.music) return;
  const ctx = ensureAudio(); if (!ctx) return;
  if (MUSIC.running) return;
  MUSIC.running = true;
  MUSIC.gen++;
  clearTimeout(MUSIC.timer);
  // Anything still ringing from a previous session is released over a short fade so sessions never pile up
  MUSIC.voices.forEach(v => {
    try { const t0 = ctx.currentTime; v.g.gain.cancelScheduledValues(t0); v.g.gain.setValueAtTime(Math.max(v.g.gain.value, 0.0001), t0); v.g.gain.linearRampToValueAtTime(0.0001, t0 + 1.2); v.o1.stop(t0 + 1.3); v.o2.stop(t0 + 1.3); v.vib.stop(t0 + 1.3); } catch (e) { /* already stopped */ }
  });
  if (!MUSIC.nodes) MUSIC.nodes = buildMusicGraph(ctx);
  applyWeatherToMusic();
  const t = ctx.currentTime;
  MUSIC.nodes.out.gain.cancelScheduledValues(t);
  MUSIC.nodes.out.gain.setValueAtTime(Math.max(MUSIC.nodes.out.gain.value, 0.0001), t);
  MUSIC.nodes.out.gain.linearRampToValueAtTime(1, t + 6);      // slow, unobtrusive fade-in
  MUSIC.started = true;
  nextChord();
}

function stopMusic(fast) {
  if (!MUSIC.running) return;
  MUSIC.running = false;
  MUSIC.gen++;                                   // invalidates every pending chord/voice/shimmer timeout
  clearTimeout(MUSIC.timer);
  if (!audioCtx || !MUSIC.nodes) return;
  const t = audioCtx.currentTime, fade = fast ? 0.4 : 2.5;
  MUSIC.nodes.out.gain.cancelScheduledValues(t);
  MUSIC.nodes.out.gain.setValueAtTime(Math.max(MUSIC.nodes.out.gain.value, 0.0001), t);
  MUSIC.nodes.out.gain.linearRampToValueAtTime(0.0001, t + fade);
  // Once the fade has finished, silence and release the voices that were ringing when we stopped
  const gen = MUSIC.gen, stale = MUSIC.voices.slice();
  setTimeout(() => {
    if (MUSIC.running || MUSIC.gen !== gen) return;      // restarted meanwhile: leave the new session alone
    stale.forEach(v => { try { v.g.gain.cancelScheduledValues(0); v.g.gain.value = 0; v.o1.stop(); v.o2.stop(); v.vib.stop(); } catch (e) { /* already stopped */ } });
  }, (fade + 0.2) * 1000);
}

// Single place that decides whether music should be playing, called after any setting or visibility change
function syncMusic() {
  applyVolumes();
  const want = prefs.sound && prefs.music && !document.hidden && userHasTouched;
  if (want && !MUSIC.running) startMusic();
  else if (!want && MUSIC.running) stopMusic(document.hidden);
  syncWeatherAudio();
}

// Don't drone in a background tab: fade out when hidden, ease back in when returning
document.addEventListener('visibilitychange', () => {
  if (!audioCtx) return;
  if (document.hidden) { stopMusic(true); try { audioCtx.suspend(); } catch (e) { /* ignore */ } }
  else { try { if (prefs.sound) audioCtx.resume(); } catch (e) { /* ignore */ } syncMusic(); }
});


/* ============================================================
   WEATHER AMBIENCE: continuous filtered-noise beds per weather kind,
   plus occasional thunder cracks during storms. Shares the music bus/toggle,
   since it's atmosphere rather than a reactive sound effect.
   ============================================================ */
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate * 2;   // a 2s loop is plenty for filtered noise; the loop point is inaudible once filtered
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}
function noiseSource(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx); src.loop = true;
  return src;
}

// Pink noise (-3dB/octave, Paul Kellet's filter) sounds like real rain; the flat white noise the rain bed used
// before is what made it hiss harshly.
let pinkBuffer = null;
function pinkSource(ctx) {
  if (!pinkBuffer || pinkBuffer.sampleRate !== ctx.sampleRate) {
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
    pinkBuffer = buf;
  }
  const src = ctx.createBufferSource(); src.buffer = pinkBuffer; src.loop = true;
  return src;
}

const WEATHER_AUDIO = { running: null, nodes: null, thunderTimer: null, gen: 0 };

function buildWeatherBed(ctx, kind) {
  const out = ctx.createGain(); out.gain.value = 0.0001;
  const rainy = kind === 'rain' || kind === 'storm';
  const src = rainy ? pinkSource(ctx) : noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  // Kept well under the music's own gain - these are meant to sit under the chords as a faint
  // texture, not compete with them (a shared bus, so turning music down turns this down too).
  let targetGain = 0.07;
  // Rain is a soft pink-noise body (lowpassed so there's no hiss) under a very faint high "patter" layer.
  if (rainy) { filter.type = 'lowpass'; filter.frequency.value = kind === 'storm' ? 1500 : 1200; filter.Q.value = 0.3; targetGain = kind === 'storm' ? 0.07 : 0.05; }
  else if (kind === 'cloudy') { filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 0.3; targetGain = 0.025; }
  else { filter.type = 'lowpass'; filter.frequency.value = 300; targetGain = 0.02; }
  let patter = null;
  if (rainy) {
    patter = pinkSource(ctx);
    const pf = ctx.createBiquadFilter(); pf.type = 'bandpass'; pf.frequency.value = 3600; pf.Q.value = 0.8;
    const pg = ctx.createGain(); pg.gain.value = 0.009;
    patter.connect(pf); pf.connect(pg); pg.connect(out);
    patter.start(0, Math.random() * 3);
  }
  // A slow gain wobble so the noise bed breathes instead of sitting perfectly flat
  const wobble = ctx.createOscillator(); wobble.type = 'sine'; wobble.frequency.value = 0.07 + Math.random() * 0.05;
  const wobbleDepth = ctx.createGain(); wobbleDepth.gain.value = targetGain * 0.18;
  const wobbleBase = ctx.createGain(); wobbleBase.gain.value = targetGain;
  wobble.connect(wobbleDepth); wobbleDepth.connect(wobbleBase.gain); wobble.start();

  let rumble = null, rumbleFilter = null;
  if (kind === 'storm') {
    rumble = noiseSource(ctx); rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 90; rumbleFilter.Q.value = 0.7;
    const rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0.05;
    rumble.connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(out);
    rumble.start();
  }

  src.connect(filter); filter.connect(wobbleBase); wobbleBase.connect(out);
  out.connect(musicBus);
  src.start();
  return { out, src, filter, wobble, wobbleBase, rumble, rumbleFilter, patter };
}

function thunderCrack() {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime;
  const src = noiseSource(ctx);
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(1400, t0);
  filter.frequency.exponentialRampToValueAtTime(120, t0 + 1.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (1.6 + Math.random() * 0.8));
  src.connect(filter); filter.connect(gain); gain.connect(musicBus);
  src.start(t0); src.stop(t0 + 2.6);
}
function scheduleThunder() {
  clearTimeout(WEATHER_AUDIO.thunderTimer);
  const gen = WEATHER_AUDIO.gen;
  WEATHER_AUDIO.thunderTimer = setTimeout(() => {
    if (WEATHER_AUDIO.gen !== gen || WEATHER_AUDIO.running !== 'storm') return;
    if (prefs.sound && prefs.music) thunderCrack();
    scheduleThunder();
  }, (6 + Math.random() * 12) * 1000);
}

function startWeatherAudio(kind) {
  if (!prefs.sound || !prefs.music) return;
  const ctx = ensureAudio(); if (!ctx) return;
  if (WEATHER_AUDIO.running === kind) return;
  stopWeatherAudio(true);
  if (kind === 'clear') return;
  WEATHER_AUDIO.gen++;
  WEATHER_AUDIO.nodes = buildWeatherBed(ctx, kind);
  WEATHER_AUDIO.running = kind;
  const t = ctx.currentTime;
  WEATHER_AUDIO.nodes.out.gain.cancelScheduledValues(t);
  WEATHER_AUDIO.nodes.out.gain.setValueAtTime(0.0001, t);
  WEATHER_AUDIO.nodes.out.gain.linearRampToValueAtTime(1, t + 3);
  if (kind === 'storm') scheduleThunder();
}
function stopWeatherAudio(fast) {
  clearTimeout(WEATHER_AUDIO.thunderTimer);
  WEATHER_AUDIO.gen++;
  const prev = WEATHER_AUDIO.running, nodes = WEATHER_AUDIO.nodes;
  WEATHER_AUDIO.running = null; WEATHER_AUDIO.nodes = null;
  if (!prev || !nodes || !audioCtx) return;
  const t = audioCtx.currentTime, fade = fast ? 0.5 : 2;
  try {
    nodes.out.gain.cancelScheduledValues(t);
    nodes.out.gain.setValueAtTime(Math.max(nodes.out.gain.value, 0.0001), t);
    nodes.out.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => {
      try { nodes.src.stop(); nodes.wobble.stop(); if (nodes.rumble) nodes.rumble.stop(); if (nodes.patter) nodes.patter.stop(); } catch (e) { /* already stopped */ }
    }, (fade + 0.2) * 1000);
  } catch (e) { /* ignore */ }
}
// Single place that decides which weather ambience (if any) should be playing
function syncWeatherAudio() {
  syncAmbientAudio();   // the district ambience shares this re-check so it follows battles, scenes and district changes
  const want = prefs.sound && prefs.music && !document.hidden && userHasTouched && !inBattle && !inScene;
  // Snow stays deliberately silent (real snowfall is famously hushed); clear has no bed either
  const audible = kind => kind === 'rain' || kind === 'storm' || kind === 'cloudy';
  const kind = state.weather.current || 'clear';
  if (!want || !audible(kind)) { if (WEATHER_AUDIO.running) stopWeatherAudio(); return; }
  if (WEATHER_AUDIO.running !== kind) startWeatherAudio(kind);
}

/* ============================================================
   TOWN AMBIENCE: a quiet synthesised bed per district (wind and birdsong in the square, a crowd murmur in the
   market, waves and gulls at the harbor, leaves and crickets in the garden). Own toggle (prefs.ambient, on by
   default) but still rides the music bus/Sound master, so the Music slider scales it too. Silent in battles
   and scenes, and the little one-shot sounds (birds, gulls, chimes) pause during rain so it doesn't clash.
   ============================================================ */
const AMBIENT_AUDIO = { running: null, nodes: null, timer: null, gen: 0 };
const AMBIENT_BEDS = {
  // [noise filter type, freq, Q, gain, swell rate Hz, swell depth 0-1]
  meadow: ['lowpass', 520, 0.3, 0.03, 0.08, 0.5],
  bazaar: ['bandpass', 420, 0.8, 0.028, 0.15, 0.3],
  harbor: ['lowpass', 650, 0.4, 0.05, 0.11, 0.8],
  orchard: ['bandpass', 2200, 0.5, 0.012, 0.09, 0.5]
};
function ambientChirp(ctx, o) {
  const t0 = ctx.currentTime + 0.05, g = ctx.createGain(), osc = ctx.createOscillator();
  osc.type = 'sine';
  const f = o.f, n = o.notes || 1, gap = o.gap || 0.12;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * gap;
    osc.frequency.setValueAtTime(f * (1 + Math.random() * 0.15), t);
    osc.frequency.exponentialRampToValueAtTime(f * o.slide, t + o.dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  }
  osc.connect(g); g.connect(musicBus);
  osc.start(t0); osc.stop(t0 + n * gap + o.dur + 0.1);
}
function ambientOneShot(kind) {
  const ctx = audioCtx; if (!ctx || !musicBus) return;
  const night = skyPhase().isNight;
  if (kind === 'meadow' && !night) ambientChirp(ctx, { f: 3000, slide: 1.25, dur: 0.09, vol: 0.012, notes: 2 + Math.floor(Math.random() * 3), gap: 0.13 });
  else if (kind === 'harbor') ambientChirp(ctx, { f: 1500, slide: 0.6, dur: 0.5, vol: 0.01, notes: 2, gap: 0.45 });
  else if (kind === 'bazaar') ambientChirp(ctx, { f: 1800 + Math.random() * 900, slide: 1, dur: 0.9, vol: 0.006 });   // a faraway chime
  else if (kind === 'orchard') {
    // night: a brief cricket trill (fast amplitude flutter); day: a single soft bird
    if (night) {
      const t0 = ctx.currentTime + 0.05, osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 4300; lfo.frequency.value = 22; lg.gain.value = 0.004; g.gain.value = 0.004;
      lfo.connect(lg); lg.connect(g.gain); osc.connect(g); g.connect(musicBus);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.004, t0 + 0.2); g.gain.linearRampToValueAtTime(0.0001, t0 + 1.6);
      osc.start(t0); lfo.start(t0); osc.stop(t0 + 1.7); lfo.stop(t0 + 1.7);
    } else ambientChirp(ctx, { f: 2600, slide: 1.4, dur: 0.12, vol: 0.01, notes: 2, gap: 0.2 });
  }
}
function scheduleAmbientOneShot() {
  clearTimeout(AMBIENT_AUDIO.timer);
  const gen = AMBIENT_AUDIO.gen;
  AMBIENT_AUDIO.timer = setTimeout(() => {
    if (AMBIENT_AUDIO.gen !== gen || !AMBIENT_AUDIO.running) return;
    const w = state.weather.current;
    if (w !== 'rain' && w !== 'storm') ambientOneShot(AMBIENT_AUDIO.running);
    scheduleAmbientOneShot();
  }, (5 + Math.random() * 10) * 1000);
}
function startAmbientAudio(biome) {
  const ctx = ensureAudio(); if (!ctx) return;
  stopAmbientAudio(true);
  const cfg = AMBIENT_BEDS[biome] || AMBIENT_BEDS.meadow;
  AMBIENT_AUDIO.gen++;
  const out = ctx.createGain(), src = noiseSource(ctx), filter = ctx.createBiquadFilter();
  filter.type = cfg[0]; filter.frequency.value = cfg[1]; filter.Q.value = cfg[2];
  // slow swell (waves, wind gusts, crowd ebb): an LFO on the bed's own gain
  const bed = ctx.createGain(); bed.gain.value = cfg[3] * (1 - cfg[5] / 2);
  const lfo = ctx.createOscillator(), lfoDepth = ctx.createGain();
  lfo.type = 'sine'; lfo.frequency.value = cfg[4] + Math.random() * 0.03; lfoDepth.gain.value = cfg[3] * cfg[5] / 2;
  lfo.connect(lfoDepth); lfoDepth.connect(bed.gain);
  src.connect(filter); filter.connect(bed); bed.connect(out); out.connect(musicBus);
  src.start(0, Math.random() * 1.5); lfo.start();
  const t = ctx.currentTime;
  out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(1, t + 3);
  AMBIENT_AUDIO.nodes = { out, src, lfo }; AMBIENT_AUDIO.running = biome;
  scheduleAmbientOneShot();
}
function stopAmbientAudio(fast) {
  clearTimeout(AMBIENT_AUDIO.timer);
  AMBIENT_AUDIO.gen++;
  const nodes = AMBIENT_AUDIO.nodes;
  AMBIENT_AUDIO.running = null; AMBIENT_AUDIO.nodes = null;
  if (!nodes || !audioCtx) return;
  const t = audioCtx.currentTime, fade = fast ? 0.5 : 2;
  try {
    nodes.out.gain.cancelScheduledValues(t);
    nodes.out.gain.setValueAtTime(Math.max(nodes.out.gain.value, 0.0001), t);
    nodes.out.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => { try { nodes.src.stop(); nodes.lfo.stop(); } catch (e) { /* already stopped */ } }, (fade + 0.2) * 1000);
  } catch (e) { /* ignore */ }
}
function syncAmbientAudio() {
  const want = prefs.sound && prefs.music && prefs.ambient && !document.hidden && userHasTouched && !inBattle && !inScene;
  if (!want) { if (AMBIENT_AUDIO.running) stopAmbientAudio(); return; }
  const biome = BIOME_OF[state.currentDistrict] || 'meadow';
  if (AMBIENT_AUDIO.running !== biome) startAmbientAudio(biome);
}


// A short filtered-noise burst on the effects bus: splashes, rustling leaves, plops (see SFX below).
function noiseBurst(type, f0, f1, dur, vol, delay) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + (delay || 0), src = noiseSource(ctx), filt = ctx.createBiquadFilter(), g = ctx.createGain();
  filt.type = type; filt.frequency.setValueAtTime(f0, t0); filt.frequency.exponentialRampToValueAtTime(f1, t0 + dur); filt.Q.value = 0.8;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(sfxBus); src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
}
/* ---- softer voices for the sound effects (v1.68.0) ----
   The old effects were bare sine and square beeps with a hard attack, which read as a machine beeping. These are shaped
   like real things instead: a wooden tap, a water drop, a mallet note and a glass bell, all rounded off with a lowpass
   and a smooth tail. A touch of random pitch on the frequent ones keeps repeats from sounding mechanical. */
const wob = (amt = 0.04) => 1 + (Math.random() - 0.5) * 2 * amt;
// A mallet note: a soft sine with quiet overtones, a short rounded attack and a long smooth tail.
function pluck(freq, start, dur, vol) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + start, g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = Math.min(3600, freq * 4.5); lp.Q.value = 0.3;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.014); g.gain.setTargetAtTime(0.0001, t0 + 0.014, dur / 4);
  [[1, 1], [2, 0.26], [3, 0.07]].forEach(([m, a]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq * m; og.gain.value = a;
    o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + dur + 0.2);
  });
  g.connect(lp); lp.connect(sfxBus);
}
// A glass bell: a sine with a few inharmonic partials that die away faster than the fundamental.
function bell(freq, start, dur, vol) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + start, lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 5200; lp.connect(sfxBus);
  [[1, 1, 1], [2.76, 0.2, 2], [5.4, 0.07, 3.4]].forEach(([m, a, k]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq * m;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol * a, t0 + 0.008); g.gain.setTargetAtTime(0.0001, t0 + 0.008, dur / (3 * k));
    o.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + dur + 0.2);
  });
}
// A water drop: a sine that glides up quickly and fades.
function bloop(f0, f1, dur, vol, start) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + (start || 0), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.setTargetAtTime(0.0001, t0 + 0.012, dur / 3.5);
  o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + dur + 0.15);
}
// A wooden tap: a very short low thump with a breath of filtered noise on top.
function wood(vol, f, start) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + (start || 0), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f * 1.7, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.035);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.004); g.gain.setTargetAtTime(0.0001, t0 + 0.006, 0.02);
  o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.2);
  noiseBurst('bandpass', 2200, 900, 0.045, vol * 0.5, start);
}
const SFX = {
  splash: () => { noiseBurst('bandpass', 1800, 500, 0.35, 0.16); bloop(200, 120, 0.2, 0.03, 0.02); },
  plop:   () => { bloop(300 * wob(), 560, 0.12, 0.05); bloop(220, 380, 0.14, 0.03, 0.06); },
  rustle: () => { noiseBurst('bandpass', 3200, 1800, 0.45, 0.07); noiseBurst('bandpass', 2600, 1400, 0.3, 0.05, 0.12); },
  creak:  () => { pluck(150, 0, 0.3, 0.02); pluck(128, 0.14, 0.32, 0.016); },
  click:  () => wood(0.05, 330 * wob()),
  wish:   () => { bell(880, 0, 0.9, 0.035); bell(1175, 0.1, 1.1, 0.03); noiseBurst('bandpass', 1500, 600, 0.3, 0.04, 0.12); },
  step:   () => wood(0.03, 190 * wob(0.08)),
  tap:    () => wood(0.045, 300 * wob()),
  nav:    () => bloop(330 * wob(0.03), 520, 0.1, 0.045),
  play:   () => { wood(0.06, 170); pluck(262, 0.02, 0.22, 0.03); },
  flip:   () => { noiseBurst('bandpass', 3000, 1500, 0.12, 0.035); pluck(494, 0.03, 0.2, 0.028); },
  round:  () => { bell(523, 0, 0.5, 0.04); bell(659, 0.1, 0.6, 0.04); },
  tie:    () => pluck(262, 0, 0.35, 0.04),
  soft:   () => { pluck(330, 0, 0.3, 0.04); pluck(262, 0.1, 0.4, 0.035); },
  win:    () => { [523, 659, 784, 1047].forEach((f, i) => bell(f, i * 0.12, 0.9, 0.05)); },
  found:  () => { bell(659, 0, 0.6, 0.045); bell(880, 0.1, 0.8, 0.045); },
  gift:   () => { [392, 523, 659, 784, 988].forEach((f, i) => bell(f, i * 0.1, 0.7, 0.045)); },
  rare:   () => { [523, 659, 784].forEach((f, i) => bell(f, i * 0.11, 1.1, 0.05)); noiseBurst('bandpass', 5200, 3200, 0.5, 0.012, 0.3); },
  mythic: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.13, 1.4, 0.05)); noiseBurst('bandpass', 5600, 3000, 0.9, 0.016, 0.5); },
  // The everyday chime (62 call sites: building taps, claims, rewards). Kept deliberately subtle: one soft low note with a
  // barely-there second, about a third of the old volume and half the ring-out, so it never competes with the music.
  claim:  () => { bell(659, 0, 0.4, 0.02); bell(988, 0.08, 0.5, 0.012); },
  // Battle and progression sounds (build 102): a thump for a hit, a clink for a block, a rising chime for healing, a swoosh for a spell,
  // a short fanfare for ranking up and a two-note chime for a skill point. All built from the same small helpers as the rest.
  hit:    () => { wood(0.085, 120 * wob(0.05)); noiseBurst('bandpass', 1800, 900, 0.09, 0.055); },
  block:  () => { bell(1400, 0, 0.3, 0.035); wood(0.04, 260); },
  heal:   () => { bell(660, 0, 0.5, 0.028); bell(880, 0.08, 0.6, 0.028); },
  spell:  () => { noiseBurst('bandpass', 2400, 5200, 0.28, 0.05); bell(988, 0.06, 0.8, 0.04); },
  skill:  () => { bell(587, 0, 0.6, 0.045); bell(880, 0.1, 0.9, 0.045); },
  rankup: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.09, 1.2, 0.05)); noiseBurst('bandpass', 5600, 3000, 0.8, 0.014, 0.45); }
};
function sfx(name) { if (prefs.sound && SFX[name]) { try { SFX[name](); } catch (e) { /* ignore */ } } }

// Browsers ignore (and log an error for) vibrate() until the person has touched the page
// (declared near the top of the audio section: the music engine also needs it)
['pointerdown', 'touchstart', 'keydown'].forEach(evt =>
  document.addEventListener(evt, () => {
    if (userHasTouched) return;
    userHasTouched = true;
    ensureAudio();
    syncMusic();          // browsers only allow audio after a gesture, so the first touch starts the music
  }, { once: true, passive: true, capture: true }));

function buzz(pattern) {
  if (!prefs.haptics || !userHasTouched) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
}
const HAP = { tap: 8, step: 10, play: 14, round: [12, 40, 12], win: [20, 60, 20, 60, 40], soft: 18, found: [10, 30, 10], big: [20, 50, 30, 50, 60] };

const toastQueue = [];
let toastBusy = false;
let toastTimer = null;
// toast(msg, true) replaces whatever is showing right away. Battle feedback uses it so a tip about the move you just
// tried never waits behind an older message.
function toast(msg, now) {
  if (now) { toastQueue.length = 0; clearTimeout(toastTimer); toastBusy = false; }
  toastQueue.push(msg);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const el = document.getElementById('toast');
  const msg = toastQueue.shift();
  if (!msg) { toastBusy = false; return; }
  toastBusy = true;
  el.textContent = msg;
  el.classList.add('show');
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    toastTimer = setTimeout(nextToast, 350);
  }, 2000);
}

function bumpPill(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function sparkleBurst(container, icons, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sp = document.createElement('span');
    sp.className = 'spark';
    sp.textContent = icons[i % icons.length];
    sp.style.left = (8 + Math.random() * 84) + '%';
    sp.style.top = (30 + Math.random() * 55) + '%';
    sp.style.animationDelay = (Math.random() * 0.5) + 's';
    container.appendChild(sp);
  }
}

