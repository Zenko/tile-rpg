/* ============================================================
   SAVE FILE (build 283)
   Settings -> Your save -> "Save to file" downloads the whole save as a small .json; "Load from file" puts one back. It is the
   no-account, no-network way to keep a copy or move to another browser. The file is wrapped as { game, format, build, savedAt,
   state }, and a file is only accepted if it looks like this game's save (see saveFileCheck). Loading asks first, keeps the save
   it replaces under STORAGE_KEY + '-before-load' in case it was a mistake, writes the new one straight to localStorage (dropping any
   save still waiting in the debounce, or pagehide would write the old one back over it) and reloads the page so every screen starts clean.
   Loads after collection-tools.js (askConfirm) and before cloud-save.js.
   ============================================================ */
const SAVE_FILE_FORMAT = 1, SAVE_FILE_MAX_BYTES = 8 * 1024 * 1024;
function saveFileBuild() { try { return flushSaveState(), JSON.stringify({ game: GAME.title, format: SAVE_FILE_FORMAT, build: BUILD, savedAt: new Date().toISOString(), state }); } catch (e) { return null; } }
function saveFileName() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${GAME.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'save'}-save-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`; }
// Returns { ok, state, why }. Only checks that the save is the right shape; loadState() fills in anything an older save lacks.
function saveFileCheck(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, why: 'That file is empty.' };
  if (text.length > SAVE_FILE_MAX_BYTES) return { ok: false, why: 'That file is too big to be a save.' };
  let data; try { data = JSON.parse(text); } catch (e) { return { ok: false, why: 'That is not a save file (it is not readable).' }; }
  const st = data && data.state && typeof data.state === 'object' ? data.state : data;   // a bare state is accepted too
  if (!st || typeof st !== 'object' || Array.isArray(st)) return { ok: false, why: 'That is not a save file.' };
  if (!st.playerPos || typeof st.playerPos !== 'object' || !Array.isArray(st.ownedCards)) return { ok: false, why: 'That file does not look like a save from this game.' };
  if (st.progress !== undefined && (typeof st.progress !== 'object' || st.progress === null || Array.isArray(st.progress))) return { ok: false, why: 'That save is damaged (its progress is missing).' };
  if (data.build && data.build > BUILD + 50) return { ok: false, why: 'That save is from a much newer version of the game. Update first.' };
  return { ok: true, state: st, when: data.savedAt || null };
}
function exportSaveFile() {
  const text = saveFileBuild(); if (!text) { toast('⚠️ Could not make a save file.'); return false; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = saveFileName();
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('⬇️ Save file downloaded'); sfx('claim'); if (typeof teleInc === 'function') { try { teleInc('save.exported'); } catch (e) { /* ignore */ } }
  return true;
}
// Writes a checked save and reloads. `reload` is a parameter so a test can run it without leaving the page.
function applySaveFile(st, reload) {
  try {
    flushSaveState(); const old = localStorage.getItem(STORAGE_KEY); if (old) localStorage.setItem(STORAGE_KEY + '-before-load', old);
    saveStatePending = false; clearTimeout(saveStateTimer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, st, { cloudSavedAt: Date.now() })));   // newer than any cloud copy, so cloud sync keeps this save instead of restoring over it
  } catch (e) { toast('⚠️ This device could not store that save (its storage may be full).'); return false; }
  if (reload !== false) location.reload();
  return true;
}
function importSaveText(text, reload) {
  const r = saveFileCheck(text); if (!r.ok) { toast('⚠️ ' + r.why); return r; }
  const owned = r.state.ownedCards.length, lvl = r.state.progress && r.state.progress.level;
  askConfirm({ title: 'Replace your game with this save?', text: `It has ${owned} cards${lvl ? ', level ' + lvl : ''}${r.when ? ', saved ' + r.when.slice(0, 10) : ''}. Your current game is replaced; a copy of it is kept on this device in case you change your mind.`, ok: 'Load it' }, () => applySaveFile(r.state, reload));
  return r;
}
document.getElementById('saveFileExportBtn').addEventListener('click', () => { sfx('tap'); exportSaveFile(); });
document.getElementById('saveFileImportBtn').addEventListener('click', () => { sfx('tap'); const i = document.getElementById('saveFileInput'); i.value = ''; i.click(); });
document.getElementById('saveFileInput').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  if (f.size > SAVE_FILE_MAX_BYTES) { toast('⚠️ That file is too big to be a save.'); return; }
  const rd = new FileReader(); rd.onload = () => importSaveText(String(rd.result)); rd.onerror = () => toast('⚠️ Could not read that file.'); rd.readAsText(f);
});
