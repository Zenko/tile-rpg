/* ============================================================
   PREFS, SOUND, HAPTICS, TOAST
   ============================================================ */
let prefs = { sound: true, haptics: true, music: true, musicVol: 0.5, sfxVol: 0.7 };   // sound = master mute for everything
try { const pr = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); if (pr) prefs = Object.assign(prefs, pr); } catch (e) { /* ignore */ }
// Repair anything a corrupted/edited save could hand us
['musicVol', 'sfxVol'].forEach(k => { const v = Number(prefs[k]); prefs[k] = (isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5); });
prefs.sound = prefs.sound !== false; prefs.music = prefs.music !== false; prefs.haptics = prefs.haptics !== false;
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }

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
      // A gentle limiter so overlapping pads + effects can never clip or get harsh
      const limiter = audioCtx.createDynamicsCompressor();
      limiter.threshold.value = -14; limiter.knee.value = 24; limiter.ratio.value = 6; limiter.attack.value = 0.01; limiter.release.value = 0.3;
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
  const reverb = makeReverb(ctx, 5.5, 2.2);

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
  fog:    { filter: 900,  wet: 0.8,  tempoMin: 12, tempoMax: 19 },
  snow:   { filter: 1150, wet: 0.75, tempoMin: 12, tempoMax: 19 },
};
// Each district leans the same in-key chords a different way, so the town has a musical identity without ever
// changing key: which of the 5 tones get picked (low/high/mixed), how much they shimmer, and how unhurried the
// changes feel. The notes themselves always come from musicChords() - only the voicing and pacing shift here.
const BIOME_MUSIC = {
  meadow:  { voicing: 'mixed', shimmer: 0.6,  tempoMul: 1 },       // Town Square: the original balanced feel
  bazaar:  { voicing: 'high',  shimmer: 0.5,  tempoMul: 0.82 },    // Market Row: brighter and a little quicker
  harbor:  { voicing: 'low',   shimmer: 0.45, tempoMul: 1.25 },    // Quiet Harbor: deep and unhurried
  orchard: { voicing: 'mixed', shimmer: 0.8,  tempoMul: 1.05 },    // Hollow Garden: more sparkle overhead
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

const WEATHER_AUDIO = { running: null, nodes: null, thunderTimer: null, gen: 0 };

function buildWeatherBed(ctx, kind) {
  const out = ctx.createGain(); out.gain.value = 0.0001;
  const src = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  // Kept well under the music's own gain - these are meant to sit under the chords as a faint
  // texture, not compete with them (a shared bus, so turning music down turns this down too).
  let targetGain = 0.07;
  if (kind === 'rain') { filter.type = 'bandpass'; filter.frequency.value = 3200; filter.Q.value = 0.5; targetGain = 0.065; }
  else if (kind === 'storm') { filter.type = 'bandpass'; filter.frequency.value = 2600; filter.Q.value = 0.45; targetGain = 0.09; }
  else if (kind === 'fog' || kind === 'cloudy') { filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 0.3; targetGain = 0.025; }
  else { filter.type = 'lowpass'; filter.frequency.value = 300; targetGain = 0.02; }
  // A slow gain wobble so the noise bed breathes instead of sitting perfectly flat
  const wobble = ctx.createOscillator(); wobble.type = 'sine'; wobble.frequency.value = 0.07 + Math.random() * 0.05;
  const wobbleDepth = ctx.createGain(); wobbleDepth.gain.value = targetGain * 0.18;
  const wobbleBase = ctx.createGain(); wobbleBase.gain.value = targetGain;
  wobble.connect(wobbleDepth); wobbleDepth.connect(wobbleBase.gain); wobble.start();

  let rumble = null, rumbleFilter = null;
  if (kind === 'storm') {
    rumble = noiseSource(ctx); rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 90; rumbleFilter.Q.value = 0.7;
    const rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0.06;
    rumble.connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(out);
    rumble.start();
  }

  src.connect(filter); filter.connect(wobbleBase); wobbleBase.connect(out);
  out.connect(musicBus);
  src.start();
  return { out, src, filter, wobble, wobbleBase, rumble, rumbleFilter };
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
      try { nodes.src.stop(); nodes.wobble.stop(); if (nodes.rumble) nodes.rumble.stop(); } catch (e) { /* already stopped */ }
    }, (fade + 0.2) * 1000);
  } catch (e) { /* ignore */ }
}
// Single place that decides which weather ambience (if any) should be playing
function syncWeatherAudio() {
  const want = prefs.sound && prefs.music && !document.hidden && userHasTouched && !inBattle && !inScene;
  // Snow stays deliberately silent (real snowfall is famously hushed); clear has no bed either
  const audible = kind => kind === 'rain' || kind === 'storm' || kind === 'fog' || kind === 'cloudy';
  const kind = state.weather.current || 'clear';
  if (!want || !audible(kind)) { if (WEATHER_AUDIO.running) stopWeatherAudio(); return; }
  if (WEATHER_AUDIO.running !== kind) startWeatherAudio(kind);
}


const SFX = {
  step:   () => tone(392, 0, 0.12, 0.05),
  tap:    () => tone(523, 0, 0.08, 0.04),
  nav:    () => tone(440, 0, 0.09, 0.035),
  play:   () => tone(330, 0, 0.14, 0.06),
  flip:   () => { tone(494, 0, 0.1, 0.05); tone(659, 0.06, 0.12, 0.04); },
  round:  () => { tone(523, 0, 0.14, 0.06); tone(659, 0.09, 0.18, 0.06); },
  tie:    () => tone(392, 0, 0.22, 0.05),
  soft:   () => { tone(330, 0, 0.16, 0.05); tone(262, 0.1, 0.22, 0.045); },
  win:    () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 0.07)); },
  found:  () => { tone(659, 0, 0.16, 0.06); tone(880, 0.1, 0.24, 0.06); },
  gift:   () => { [392, 523, 659, 784, 988].forEach((f, i) => tone(f, i * 0.09, 0.26, 0.06)); },
  rare:   () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.35, 0.065, 'triangle')); },
  mythic: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.5, 0.06, 'triangle')); },
  claim:  () => { tone(587, 0, 0.14, 0.06); tone(880, 0.1, 0.24, 0.06); }
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

