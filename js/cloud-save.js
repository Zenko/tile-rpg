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

function cloudEmailPrompt(promptTitle) {
  const email = prompt(promptTitle + '\n\nEmail:');
  if (!email) return null;
  const password = prompt('Password (6+ characters):');
  if (!password) return null;
  return { email, password };
}

function cloudBackup() {
  if (!cloudAvailable() || !cloudUser) { toast('☁️ No connection right now - try again later.'); return; }
  if (!cloudUser.isAnonymous) { toast(`☁️ Already backed up to ${cloudUser.email}.`); return; }
  const cred = cloudEmailPrompt('Back up your save to an email + password.\nUse this same email to restore it on another device.');
  if (!cred) return;
  cloudUser.linkWithCredential(firebase.auth.EmailAuthProvider.credential(cred.email, cred.password))
    .then(() => { cloudSetStatus(`Backed up to ${cred.email}`); toast('☁️ Your save is backed up.'); })
    .catch(e => toast('☁️ Could not back up: ' + e.message));
}

function cloudRestore() {
  if (!cloudAvailable()) { toast('☁️ No connection right now - try again later.'); return; }
  const cred = cloudEmailPrompt('Restore a save from another device.\nEnter the email you backed it up with.');
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
