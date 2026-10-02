/* ============================================================
   CLOUD SAVE: an optional Firestore backup layered on top of the local save.
   localStorage stays the fast, always-available, offline-first copy - nothing about loadState()/saveState()
   changes for a player with no network. This file only adds a background sync on top: a hidden anonymous
   account is created the first time anyone plays (no login screen), state is pushed to Firestore a little
   while after each local save, and on the very next launch (any device, once linked - see below) whichever
   copy is newer wins. If the Firebase CDN or APIs are unreachable for any reason, everything in this file
   quietly no-ops and the game behaves exactly as it did before this file existed.

   To recover a save on a new device/browser, the player needs a way to prove it's "them": that's the
   "Back up your save" / "Restore a save" buttons in Settings, which link (or sign into) an email + password
   on top of the same hidden anonymous account. Nothing here ever requires an account to just play.
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDsPMGgvGCG2InOpXYqjPbrrsdS4MO7l6U",
  authDomain: "suneater-93196.firebaseapp.com",
  projectId: "suneater-93196",
  storageBucket: "suneater-93196.firebasestorage.app",
  messagingSenderId: "1025455101787",
  appId: "1:1025455101787:web:2a997b8229123354072c7e"
};
const CLOUD_SAVE_DEBOUNCE_MS = 8000;   // saveState() fires very often; coalesce into at most one write this often
const CLOUD_COLLECTION = 'saves';

let cloudDb = null, cloudUser = null, cloudReady = false, cloudSaveTimer = null, cloudSyncing = false;

function cloudAvailable() { return typeof firebase !== 'undefined'; }

// Called once from the game's own start-up sequence (js/events-story-foils-guide.js), after loadState() has
// already populated `state` from localStorage and the town has already rendered - cloud sync only ever
// improves on that, never blocks or delays the first paint.
function cloudInit() {
  if (!cloudAvailable()) { cloudSetStatus('Offline (no connection)'); return; }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    cloudDb = firebase.firestore();
    cloudDb.enablePersistence({ synchronizeTabs: true }).catch(() => { /* already enabled in another tab, or unsupported - fine either way */ });
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        cloudUser = user; cloudReady = true;
        cloudSetStatus(user.isAnonymous ? 'Backed up automatically' : `Backed up to ${user.email}`);
        cloudPullThenReconcile(false);
      } else {
        cloudReady = false;
        firebase.auth().signInAnonymously().catch(e => cloudSetStatus('Offline (' + e.code + ')'));
      }
    });
  } catch (e) { cloudSetStatus('Offline (setup failed)'); }
}

function cloudSetStatus(text) { const el = document.getElementById('cloudStatus'); if (el) el.textContent = text; }
function cloudDocRef() { return (cloudReady && cloudDb && cloudUser) ? cloudDb.collection(CLOUD_COLLECTION).doc(cloudUser.uid) : null; }

// Hooked into saveState() itself (see progression.js) so every existing call site keeps working unchanged.
function cloudSaveDebounced() {
  if (!cloudReady) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(cloudPush, CLOUD_SAVE_DEBOUNCE_MS);
}

function cloudPush() {
  const ref = cloudDocRef();
  if (!ref || cloudSyncing) return;
  state.cloudSavedAt = Date.now();
  ref.set({ json: JSON.stringify(state), savedAt: state.cloudSavedAt }).catch(() => { /* offline - Firestore queues this and retries automatically */ });
  pushPresence();   // piggybacks on the same debounce - see WHO'S PLAYING below, no extra write-quota pressure
  pushStats();      // same debounce again
}

/* ============================================================
   PLAYTEST STATS (build 102): one anonymous summary document per tester at stats/{uid}, so the owner can see from the Firebase
   console which features get used and how the economy and balance feel. No name, no avatar, no free text: the build, level,
   play time, wins, every counter in state.progress.totals, skill ranks, gear tiers, ladder points, the deck's family mix and
   the Pebble ledger totals. On by default with a switch in Settings (prefs.shareStats === false turns it off). Needs the
   write-only rule in HANDOFF §1a; until that is pasted in, this fails silently like every other unreachable-Firestore case.
   ============================================================ */
function statsSharingOn() { return prefs.shareStats !== false; }
function statsSummary() {
  const p = state.progress, fam = {};
  (state.deck || []).forEach(id => { const f = CARD_FAMILY[BattleEngine.baseIdOf(id)] || 'none'; fam[f] = (fam[f] || 0) + 1; });
  let econ = null; try { const r = econReport(); econ = { hours: r.hours, earned: r.earned, spent: r.spent, earn: Object.fromEntries(r.earn.map(x => [x.src, x.total])), spend: Object.fromEntries(r.spend.map(x => [x.src, x.total])) }; } catch (e) { /* no ledger yet */ }
  return { build: typeof BUILD === 'number' ? BUILD : 0, at: Date.now(), level: (p.level || 1), wins: state.wins || 0, cards: (state.ownedCards || []).length, totals: Object.assign({}, p.totals || {}),
    skills: Object.assign({}, p.skills || {}), gear: Object.assign({}, p.gear || {}), ladder: (p.ladder && p.ladder.pts) || 0, deckFamilies: fam, binderPages: Object.keys(p.binderDone || {}).length, econ };
}
function pushStats() {
  if (!statsSharingOn() || !cloudReady || !cloudDb || !cloudUser) return;
  try { cloudDb.collection('stats').doc(cloudUser.uid).set(statsSummary()).catch(() => {}); } catch (e) { /* summary failed: not worth surfacing */ }
}

/* ============================================================
   WHO'S PLAYING: an opt-in, low-pressure glance at the other testers - not a leaderboard, just name, level,
   current district and when they last played. Uses the same anonymous-auth Firestore project as saves, but
   a separate collection ('players') since this is genuinely different data: visible to every signed-in
   tester, not just its owner. That needs its own security rule added in the Firebase console alongside the
   existing 'saves' rule (see HANDOFF.md §1a for the exact rule to paste in) - until that's done, every
   read/write here just fails silently, same as any other offline/unreachable case in this file.
   On by default (until the player switches it off) and a separate toggle from cloud save itself (prefs.sharePresence) - sharing your name and
   activity with the other testers is a different call than just backing up your own save privately.
   ============================================================ */
const PRESENCE_COLLECTION = 'players';
const PRESENCE_STALE_MS = 14 * 24 * 60 * 60 * 1000;   // don't show someone who hasn't played in two weeks
function presenceSharingOn() { return !!prefs.sharePresence; }
function pushPresence() {
  if (!presenceSharingOn() || !cloudReady || !cloudDb || !cloudUser) return;
  cloudDb.collection(PRESENCE_COLLECTION).doc(cloudUser.uid).set({
    name: (state.character && state.character.name) || 'A player',
    emoji: (state.character && state.character.emoji) || '🙂',
    level: ensureLevel().level,
    district: (DISTRICTS[state.currentDistrict] && DISTRICTS[state.currentDistrict].name) || '',
    lastSeen: Date.now(),
    deck: ghostDeckCode(),
  }).catch(() => { /* offline - this is just a nice-to-have glance, not core save data */ });
}
// Removes you from the list right away when you opt out, rather than lingering until PRESENCE_STALE_MS.
function removePresence() {
  if (!cloudReady || !cloudDb || !cloudUser) return;
  cloudDb.collection(PRESENCE_COLLECTION).doc(cloudUser.uid).delete().catch(() => {});
}

/* ============================================================
   FEEDBACK: sendFeedback() (js/events-story-foils-guide.js) used to hand the typed message to a mailto:
   link, which just opens the player's email app - not everyone has one set up on the device they're
   testing on, and it leaves the game the moment they hit send. This writes straight to Firestore instead,
   in a `feedback` collection separate from `saves`/`players` since it's write-only: the player never
   reads it back, only the owner does, from the Firebase console. Needs its own security rule (see
   HANDOFF.md §1a) - until that's pasted in, this fails silently like any other unreachable-Firestore
   case here, and sendFeedback() falls back to the old mailto: link so a message is never just lost.
   ============================================================ */
const FEEDBACK_COLLECTION = 'feedback';
async function pushFeedback(kind, text, info, player) {
  if (!cloudAvailable() || !cloudDb) return false;
  try {
    await cloudDb.collection(FEEDBACK_COLLECTION).add({ kind, text, info, player: player || null, uid: cloudUser ? cloudUser.uid : null, at: Date.now() });
    return true;
  } catch (e) { return false; }
}
/* ============================================================
   GHOST DUELS (v1.86.0): your current deck rides along with your presence entry (as a deck code, the same TRPG1 string the
   Deck screen shares), so another tester can fight a "ghost" of it - the AI piloting your 12 cards - from Who's Playing.
   No new Firestore rule: it is one more field on the `players/{uid}` document that everyone signed in can already read.
   Nothing is written about the duel itself, so nobody is notified and nothing of yours changes. Wins pay a few Pebbles
   (once per ghost per day, five a day) and count for their own stat, never for district wins.
   ============================================================ */
let ghostRows = [];
function ghostDeckCode() {
  if (prefs.shareDeck === false) return null;
  const ids = (state.deck || []).filter(id => !!cardDef(id));
  return ids.length === DECK_SIZE ? deckCode(ids) : null;
}
// A shared deck as a list of 12 valid card ids, plus its main family for the label - or null when it can't be used.
function ghostDeckOf(p) {
  if (!p || typeof p.deck !== 'string') return null;
  const ids = parseDeckCode(p.deck);
  if (!ids || ids.length !== DECK_SIZE) return null;
  const tally = {}; ids.forEach(id => { const f = CARD_FAMILY[BattleEngine.baseIdOf(id)]; if (f) tally[f] = (tally[f] || 0) + 1; });
  const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  return { ids, fam: top && tally[top] >= 4 ? FAMILIES[top] : null };
}
function ghostState() {
  const p = state.progress, t = todayKey();
  if (!p.ghost || p.ghost.day !== t) p.ghost = { day: t, beaten: {}, paid: 0 };
  return p.ghost;
}
function startGhostDuel(p) {
  if (featureLocked('ghost')) { toast(featureLockText('ghost')); return; }
  const g = ghostDeckOf(p); if (!g) { toast("That deck can't be loaded"); return; }
  if (state.deck.length < DECK_SIZE) { toast(`Fill your ${DECK_SIZE}-card deck first`); return; }
  closePlayerMenu && closePlayerMenu();
  startBattle({ id: 'ghost-' + p.id, name: `${String(p.name || 'A player').slice(0, 16)}'s ghost`, icon: '👻', deck: g.ids, profile: { level: 'smart', spirit: 20 },
                isBoss: false, rewardCard: null, ghost: { uid: p.id, name: String(p.name || 'A player').slice(0, 16) } });
}
function ghostWin() {
  const gs = ghostState(), id = battle.npc.ghost.uid;
  battle.rewarded = true;
  bumpStat('ghostWins', 1);
  let extra = 'A fine duel.';
  if (!gs.beaten[id] && gs.paid < 5) { gs.beaten[id] = true; gs.paid++; addPebbles(8, 'ghost'); extra = '<b>+8 🫧</b> for beating this ghost today.'; }
  saveState();
  const icon = btGet('battleEndIcon'); icon.textContent = '👻'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = `You beat ${battle.npc.ghost.name}'s ghost!`;
  battleEndStats.innerHTML = extra;
  btGet('battleRetryBtn').classList.remove('hidden');
  sparkleBurst(btGet('battleSparkles'), ['👻', '✨'], 10);
  sfx('win'); buzz(HAP.win);
}
function ghostLoss() {
  const icon = btGet('battleEndIcon'); icon.textContent = '👻'; icon.className = 'big-icon';
  btGet('battleSparkles').innerHTML = '';
  battleEndTitle.textContent = `${battle.npc.ghost.name}'s ghost wins this one.`;
  battleEndStats.textContent = 'Their deck is waiting for a rematch whenever you like.';
  btGet('battleRetryBtn').classList.remove('hidden');
  sfx('soft');
}
// Social view (build 95): a "you" line that says whether you are visible, then one card per tester (avatar tile, name and
// level, where they are and when, a green dot if seen in the last 10 minutes) with the Duel button at the right.
function renderSocialYou() {
  const el = document.getElementById('socialYou'); if (!el) return;
  const on = presenceSharingOn();
  el.className = 'so-you' + (on ? ' on' : '');
  el.innerHTML = `<span class="so-you-ico">${on ? '👋' : '🙈'}</span><span class="so-you-text"><b>${on ? "You're visible to other testers" : "You're hidden"}</b><small>${on ? 'They see your name, level and district.' : 'Turn on "Share that I\'m playing" in Settings to appear here.'}</small></span><button type="button" class="btn btn-ghost st-small" id="socialToSettings">Settings</button>`;
  document.getElementById('socialToSettings').addEventListener('click', () => document.getElementById('segPmSettings').click());
}
async function fetchWhosPlaying() {
  const box = document.getElementById('whosPlayingList');
  if (!box) return;
  renderSocialYou();
  if (typeof renderLadderCard === 'function') renderLadderCard();
  const note = (icon, title, text) => `<div class="so-empty"><span>${icon}</span><b>${title}</b><small>${text}</small></div>`;
  if (!cloudAvailable() || !cloudReady) { box.innerHTML = note('📡', 'Not connected right now', 'Testers show up here when you are online.'); return; }
  box.innerHTML = note('⏳', 'Loading…', '');
  try {
    const snap = await cloudDb.collection(PRESENCE_COLLECTION).orderBy('lastSeen', 'desc').limit(20).get();
    const now = Date.now();
    const rows = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(p => now - (p.lastSeen || 0) < PRESENCE_STALE_MS);
    ghostRows = rows;
    box.innerHTML = rows.length ? rows.map((p, i) => {
      const me = p.id === (cloudUser && cloudUser.uid), g = !me ? ghostDeckOf(p) : null, live = now - (p.lastSeen || 0) < 10 * 60 * 1000;
      return `<div class="so-card${me ? ' me' : ''}"><span class="so-av">${escapeHtml(String(p.emoji || '🙂').slice(0, 8))}${live ? '<i class="so-live" title="Playing now"></i>' : ''}</span>
        <span class="so-text"><b>${escapeHtml(String(p.name || 'A player').slice(0, 16))}${me ? ' <em>you</em>' : ''}<span class="so-lv">Lv ${Math.max(1, Math.floor(Number(p.level)) || 1)}</span></b>
        <small>${escapeHtml(p.district || '')}${p.district ? ' · ' : ''}${live ? 'Playing now' : fmtLogTime(p.lastSeen)}</small></span>
        ${g ? (featureLocked('ghost') ? `<span class="ghost-lock" title="${featureLockText('ghost')}">🔒 Lv ${FEATURE_LEVELS.ghost.level}</span>` : `<button class="btn ghost-btn so-duel" type="button" data-ghost="${i}" title="Duel a ghost of their deck">👻 ${g.fam ? g.fam.icon + ' ' : ''}Duel</button>`) : ''}</div>`;
    }).join('')
      : note('🌱', 'Nobody sharing yet', 'Turn it on in Settings and be the first.');
    box.querySelectorAll('[data-ghost]').forEach(b => b.addEventListener('click', () => startGhostDuel(ghostRows[+b.dataset.ghost])));
  } catch (e) { box.innerHTML = note('📡', "Couldn't load right now", 'Try again in a moment.'); }
}

// force=true (from the explicit "Restore a save" button) always takes the cloud copy, since the player just
// told us in plain terms which save they want. Otherwise (a normal sign-in / app launch) whichever copy was
// saved more recently wins, so nothing is silently lost if someone played a little on two devices.
function cloudPullThenReconcile(force) {
  const ref = cloudDocRef();
  if (!ref) return;
  cloudSyncing = true;
  ref.get().then(doc => {
    cloudSyncing = false;
    if (!doc.exists) { cloudPush(); return; }   // nothing up there yet - this device's save becomes the first copy
    const cloud = doc.data();
    if (force || (cloud.savedAt || 0) > (state.cloudSavedAt || 0)) {
      const parsed = JSON.parse(cloud.json);
      if (parsed && parsed.playerPos) {
        state = Object.assign(state, parsed);
        saveState();
        if (typeof renderTown === 'function') renderTown();
        if (typeof updateHud === 'function') updateHud();
        toast('☁️ Restored your save.');
      }
    } else {
      cloudPush();   // this device's copy is newer (or the same) - make sure the cloud has it too
    }
  }).catch(() => { cloudSyncing = false; });
}

// The email+password modal (#cloudOverlay in index.html) - a real overlay in the game's own style rather
// than prompt(), partly for the look, partly because prompt() shows a password in plain text with no masking.
let cloudModalResolve = null;
function cloudOpenModal(title, desc, submitLabel) {
  document.getElementById('cloudModalTitle').textContent = title;
  document.getElementById('cloudModalDesc').textContent = desc;
  document.getElementById('cloudModalSubmit').textContent = submitLabel;
  const emailEl = document.getElementById('cloudEmailInput'), passEl = document.getElementById('cloudPasswordInput');
  emailEl.value = ''; passEl.value = '';
  document.getElementById('cloudOverlay').classList.remove('hidden');
  setTimeout(() => emailEl.focus(), 50);
  return new Promise(resolve => { cloudModalResolve = resolve; });
}
function cloudCloseModal(result) {
  document.getElementById('cloudOverlay').classList.add('hidden');
  if (cloudModalResolve) { const r = cloudModalResolve; cloudModalResolve = null; r(result); }
}
document.getElementById('cloudModalCancel').addEventListener('click', () => { sfx('nav'); cloudCloseModal(null); });
document.getElementById('cloudModalSubmit').addEventListener('click', () => {
  const email = document.getElementById('cloudEmailInput').value.trim();
  const password = document.getElementById('cloudPasswordInput').value;
  if (!email || !email.includes('@')) { toast('Enter a valid email.'); sfx('tie'); return; }
  if (password.length < 6) { toast('Password needs to be at least 6 characters.'); sfx('tie'); return; }
  sfx('claim'); cloudCloseModal({ email, password });
});

async function cloudBackup() {
  if (!cloudAvailable() || !cloudUser) { toast('☁️ No connection right now - try again later.'); return; }
  if (!cloudUser.isAnonymous) { toast(`☁️ Already backed up to ${cloudUser.email}.`); return; }
  const cred = await cloudOpenModal('Back up your save', 'Choose an email and password. Use the same ones to restore this save on another device.', 'Back up');
  if (!cred) return;
  cloudUser.linkWithCredential(firebase.auth.EmailAuthProvider.credential(cred.email, cred.password))
    .then(() => { cloudSetStatus(`Backed up to ${cred.email}`); toast('☁️ Your save is backed up.'); })
    .catch(e => toast('☁️ Could not back up: ' + e.message));
}

async function cloudRestore() {
  if (!cloudAvailable()) { toast('☁️ No connection right now - try again later.'); return; }
  const cred = await cloudOpenModal('Restore a save', 'Enter the email and password you backed this save up with.', 'Restore');
  if (!cred) return;
  firebase.auth().signInWithEmailAndPassword(cred.email, cred.password)
    .then(() => cloudPullThenReconcile(true))
    .catch(e => toast('☁️ Could not restore: ' + e.message));
}

document.getElementById('cloudBackupBtn').addEventListener('click', () => { sfx('tap'); cloudBackup(); });
document.getElementById('cloudRestoreBtn').addEventListener('click', () => { sfx('tap'); cloudRestore(); });

// This file loads last (see index.html) - by now loadState()/renderTown()/updateHud() have already run, so
// starting the cloud sync here (rather than from the game's own start-up sequence) can never delay the
// first paint, no matter how slow or unreachable the Firebase CDN or APIs are.
cloudInit();
