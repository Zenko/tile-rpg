/* ---------------- notes: the note list ----------------
   Each note is either a written note (plain text) or a drawing (PNG data URL), created and edited
   independently. Every edit autosaves as a draft a moment after typing/drawing stops, so nothing is lost
   if the player switches tabs or closes the app mid-thought; the Save button just confirms and returns
   to the list. */
let currentNoteId = null;

function notePreview(n) {
  if (n.type === 'draw') return n.drawing ? 'Drawing' : 'Empty drawing';
  const t = (n.text || '').trim();
  return t ? t.slice(0, 80) : 'Empty note';
}
/* Notes list (v1.89.0): search, pinning, and swipe-to-delete with an Undo (no confirm box). A pinned note sorts first.
   Swipe a note left (touch or mouse drag), or focus it and press Delete. */
let notesQuery = '';
function renderNotesList() {
  const pr = ensureJournal(), listEl = document.getElementById('notesList'), q = notesQuery.trim().toLowerCase();
  listEl.innerHTML = '';
  if (!pr.notesList.length) { listEl.innerHTML = '<div class="notes-empty">No notes yet - write one down or sketch something with New Note / New Drawing above.</div>'; return; }
  const notes = [...pr.notesList].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.updatedAt - a.updatedAt)
    .filter(n => !q || ((n.title || '') + ' ' + (n.text || '')).toLowerCase().includes(q));
  if (!notes.length) { listEl.innerHTML = `<div class="jempty">No notes match “${escapeHtml(notesQuery)}”.<button class="jgo" type="button" id="notesClearQ">Clear search</button></div>`; document.getElementById('notesClearQ').addEventListener('click', () => { notesQuery = ''; document.getElementById('notesSearch').value = ''; renderNotesList(); }); return; }
  const anyPinned = notes.some(n => n.pin), anyLoose = notes.some(n => !n.pin);
  let lastPin = null;
  notes.forEach(n => {
    if (anyPinned && anyLoose && !!n.pin !== lastPin) { const h = document.createElement('div'); h.className = 'jgroup-h'; h.textContent = n.pin ? 'Pinned' : 'Notes'; listEl.appendChild(h); }
    lastPin = !!n.pin;
    const wrap = document.createElement('div'); wrap.className = 'nwrap';
    const el = document.createElement('div');
    el.className = 'panel-item note-item'; el.tabIndex = 0; el.setAttribute('role', 'button');
    const icon = n.type === 'draw' ? '🖌️' : '✏️';
    const thumb = n.type === 'draw' && n.drawing ? `<img class="note-thumb" src="${n.drawing}" alt="">` : `<div class="panel-icon">${icon}</div>`;
    const title = (n.title || '').trim() ? escapeHtml(n.title.trim()) : (n.type === 'draw' ? 'Untitled drawing' : 'Untitled note');
    el.innerHTML = `${thumb}<div class="panel-text"><div class="panel-name">${title}</div><div class="panel-desc">${escapeHtml(notePreview(n))} · ${fmtLogTime(n.updatedAt)}</div></div><button class="note-pin-btn" type="button" aria-pressed="${!!n.pin}" aria-label="${n.pin ? 'Unpin' : 'Pin'} this note" title="${n.pin ? 'Unpin' : 'Pin'}">📌</button>`;
    wrap.innerHTML = '<div class="ndel" aria-hidden="true">Delete</div>'; wrap.appendChild(el);
    el.addEventListener('click', ev => { if (ev.target.closest('.note-pin-btn') || el.dataset.swiped) return; sfx('nav'); buzz(HAP.tap); openNoteEditor(n.id); });
    el.querySelector('.note-pin-btn').addEventListener('click', ev => { ev.stopPropagation(); sfx('tap'); buzz(HAP.tap); n.pin = !n.pin; saveState(); renderNotesList(); });
    el.addEventListener('keydown', ev => { if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteNoteWithUndo(n.id); } });
    // swipe left to delete (pointer events: touch and mouse)
    let sx = 0, dx = 0, on = false;
    el.addEventListener('pointerdown', ev => { if (ev.target.closest('.note-pin-btn')) return; on = true; sx = ev.clientX; dx = 0; delete el.dataset.swiped; el.classList.add('drag'); el.setPointerCapture(ev.pointerId); });
    el.addEventListener('pointermove', ev => { if (!on) return; dx = Math.min(0, ev.clientX - sx); if (dx < -6) el.dataset.swiped = '1'; el.style.transform = `translateX(${dx}px)`; });
    const end = () => {
      if (!on) return; on = false; el.classList.remove('drag');
      if (dx < -90) deleteNoteWithUndo(n.id); else { el.style.transform = ''; setTimeout(() => delete el.dataset.swiped, 50); }
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    listEl.appendChild(wrap);
  });
}
function deleteNoteWithUndo(id) {
  const pr = ensureJournal(), at = pr.notesList.findIndex(x => x.id === id); if (at < 0) return;
  const gone = pr.notesList.splice(at, 1)[0];
  saveState(); sfx('nav'); buzz(HAP.tap); renderNotesList();
  showUndoBar('Note deleted', () => { const p2 = ensureJournal(); p2.notesList.splice(Math.min(at, p2.notesList.length), 0, gone); saveState(); renderNotesList(); });
}
document.getElementById('notesSearch').addEventListener('input', e => { notesQuery = e.target.value; renderNotesList(); });

function openNoteEditor(id) {
  const n = findNote(id);
  if (!n) return;
  currentNoteId = id;
  document.getElementById('notesListView').classList.add('hidden');
  document.getElementById('notesEditorView').classList.remove('hidden');
  document.getElementById('noteTitleInput').value = n.title || '';
  setNotesDraftStatus('');
  drawState.undoStack.length = 0;
  drawCanvasReady = false;
  if (n.type === 'draw') {
    document.getElementById('notesWriteView').classList.add('hidden');
    document.getElementById('notesDrawView').classList.remove('hidden');
    document.getElementById('drawCanvasWrap').className = 'draw-canvas-wrap paper-' + (n.paper || 'blank');
    requestAnimationFrame(notesCanvasResize);
  } else {
    document.getElementById('notesDrawView').classList.add('hidden');
    document.getElementById('notesWriteView').classList.remove('hidden');
    document.getElementById('notesArea').value = n.text || '';
  }
  renderDrawToolbar();
}
function closeNoteEditor() {
  if (currentNoteId) pruneNoteIfEmpty(currentNoteId);
  currentNoteId = null;
  document.getElementById('notesEditorView').classList.add('hidden');
  document.getElementById('notesListView').classList.remove('hidden');
  renderNotesList();
}
// An untouched note (created but left blank) is quietly discarded on the way out, rather than cluttering
// the list with "Untitled note" placeholders.
function pruneNoteIfEmpty(id) {
  const pr = ensureJournal();
  const n = pr.notesList.find(x => x.id === id);
  if (!n) return;
  const blank = !n.title.trim() && (n.type === 'draw' ? !n.drawing : !n.text.trim());
  if (blank) { pr.notesList = pr.notesList.filter(x => x.id !== id); saveState(); }
}
function setNotesDraftStatus(msg) {
  document.getElementById('notesDraftStatus').textContent = msg;
}
let notesSaveTimer = null;
function scheduleNoteSave() {
  setNotesDraftStatus('Saving draft…');
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    saveState();
    setNotesDraftStatus('Draft saved');
  }, 500);
}
function newNote(type) {
  sfx('nav'); buzz(HAP.tap);
  const pr = ensureJournal();
  const n = { id: genNoteId(), type, title: '', text: '', drawing: '', paper: 'blank', updatedAt: Date.now() };
  pr.notesList.push(n);
  saveState();
  openNoteEditor(n.id);
}
document.getElementById('newNoteWriteBtn').addEventListener('click', () => newNote('write'));
document.getElementById('newNoteDrawBtn').addEventListener('click', () => newNote('draw'));
document.getElementById('notesBackBtn').addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); closeNoteEditor(); });
document.getElementById('notesSaveBtn').addEventListener('click', () => {
  sfx('nav'); buzz(HAP.tap);
  if (currentNoteId) {
    const n = findNote(currentNoteId);
    if (n) n.updatedAt = Date.now();
    saveState();
  }
  closeNoteEditor();
});

/* ---------------- notes: export the open note as a PNG image ----------------
   A written note is rendered onto an offscreen canvas that mimics the lined-paper look so the saved
   image matches what's on screen; a drawing note composites its paper background with the live canvas
   (rather than the last-saved data URL) so an export always reflects whatever's drawn right now. */
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function noteExportFilename(n) {
  const base = (n.title || '').trim() || (n.type === 'draw' ? 'drawing' : 'note');
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.png';
}
function drawPaperBackground(ctx, w, h, paper, ruleSpacing) {
  ruleSpacing = ruleSpacing || 26;
  ctx.fillStyle = '#ece2cc';
  ctx.fillRect(0, 0, w, h);
  if (paper === 'lined') {
    ctx.strokeStyle = 'rgba(90,70,40,0.28)'; ctx.lineWidth = 1;
    for (let y = ruleSpacing; y < h; y += ruleSpacing) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  } else if (paper === 'grid') {
    ctx.strokeStyle = 'rgba(90,70,40,0.22)'; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
  } else if (paper === 'dotted') {
    ctx.fillStyle = 'rgba(90,70,40,0.4)';
    for (let y = 9; y < h; y += 18) for (let x = 9; x < w; x += 18) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill(); }
  }
}
function wrapNoteText(ctx, text, maxWidth) {
  const out = [];
  text.split('\n').forEach(para => {
    if (!para) { out.push(''); return; }
    const words = para.split(' ');
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (line && ctx.measureText(test).width > maxWidth) { out.push(line); line = word; }
      else line = test;
    });
    out.push(line);
  });
  return out;
}
function exportWrittenNote(n, filename) {
  const width = 900, padding = 44, marginX = 74, lineHeight = 34;
  const bodyFont = '28px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
  const titleFont = 'bold 34px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
  const measure = document.createElement('canvas').getContext('2d');
  const maxTextWidth = width - marginX - padding + 30;
  measure.font = bodyFont;
  const bodyLines = wrapNoteText(measure, n.text || '', maxTextWidth);
  let titleLines = [];
  if ((n.title || '').trim()) { measure.font = titleFont; titleLines = wrapNoteText(measure, n.title.trim(), maxTextWidth); }
  const titleHeight = titleLines.length ? titleLines.length * 40 + 16 : 0;
  const bodyHeight = Math.max(bodyLines.length, 1) * lineHeight;
  const height = Math.max(500, padding * 2 + titleHeight + bodyHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawPaperBackground(ctx, width, height, 'lined', lineHeight);
  ctx.strokeStyle = 'rgba(196, 76, 60, 0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(marginX - 14, 0); ctx.lineTo(marginX - 14, height); ctx.stroke();
  ctx.fillStyle = '#3a3226';
  ctx.textBaseline = 'alphabetic';
  let y = padding + 20;
  if (titleLines.length) {
    ctx.font = titleFont;
    titleLines.forEach(line => { ctx.fillText(line, marginX, y); y += 40; });
    y += 16;
  }
  ctx.font = bodyFont;
  bodyLines.forEach(line => { ctx.fillText(line, marginX, y); y += lineHeight; });
  downloadDataUrl(canvas.toDataURL('image/png'), filename);
}
function exportDrawingNote(n, filename) {
  const src = notesCanvas();
  const dpr = window.devicePixelRatio || 1;
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const ctx = out.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  drawPaperBackground(ctx, src.width / dpr, src.height / dpr, n.paper || 'blank');
  ctx.restore();
  ctx.drawImage(src, 0, 0, out.width, out.height);
  downloadDataUrl(out.toDataURL('image/png'), filename);
}
document.getElementById('notesExportBtn').addEventListener('click', () => {
  if (!currentNoteId) return;
  const n = findNote(currentNoteId);
  if (!n) return;
  sfx('nav'); buzz(HAP.tap);
  const filename = noteExportFilename(n);
  try {
    if (n.type === 'draw') exportDrawingNote(n, filename);
    else exportWrittenNote(n, filename);
    toast('Saved as image');
  } catch (e) { toast('Could not save image'); }
});
document.getElementById('noteTitleInput').addEventListener('input', (e) => {
  if (!currentNoteId) return;
  const n = findNote(currentNoteId);
  if (!n) return;
  n.title = e.target.value;
  n.updatedAt = Date.now();
  scheduleNoteSave();
});
document.getElementById('notesArea').addEventListener('input', (e) => {
  if (!currentNoteId) return;
  const n = findNote(currentNoteId);
  if (!n) return;
  n.text = e.target.value;
  n.updatedAt = Date.now();
  scheduleNoteSave();
});

/* ---------------- notes: drawing canvas ----------------
   A transparent canvas over the panel's own background, so pen colors are the only pixels it ever needs
   to store. Saved as a PNG data URL on the open note (lazily, the first time a drawing note is opened, so
   a fresh save never pays for a canvas nobody's looked at). */
const DRAW_COLORS = [
  '#2b2b2b', '#1d3557', '#3a86ff', '#118ab2', '#06d6a0', '#2a9d8f', '#8d5524', '#e76f51',
  '#e63946', '#c9184a', '#ef476f', '#7209b7', '#6a4c93', '#ffb703', '#e9c46a', '#ffffff'
];
const PAPER_TYPES = ['blank', 'lined', 'grid', 'dotted'];
const DRAW_SIZES = [3, 6, 11, 18];
const drawState = { color: DRAW_COLORS[0], size: DRAW_SIZES[1], erasing: false, drawing: false, lastX: 0, lastY: 0, undoStack: [] };
let drawCanvasReady = false;
const notesCanvas = () => document.getElementById('notesCanvas');
const notesCtx = () => notesCanvas().getContext('2d');

function renderDrawToolbar() {
  const colorBox = document.getElementById('drawColors'); colorBox.innerHTML = '';
  DRAW_COLORS.forEach(c => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'draw-color' + (!drawState.erasing && drawState.color === c ? ' active' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => { drawState.color = c; drawState.erasing = false; renderDrawToolbar(); });
    colorBox.appendChild(sw);
  });
  const customBtn = document.getElementById('drawCustomColorBtn');
  const customInput = document.getElementById('drawCustomColorInput');
  const isCustom = !drawState.erasing && !DRAW_COLORS.includes(drawState.color);
  customBtn.classList.toggle('active', isCustom);
  customInput.value = /^#[0-9a-f]{6}$/i.test(drawState.color) ? drawState.color : '#e4ece8';
  const paperBox = document.getElementById('paperToolbar');
  if (paperBox) {
    const n = currentNoteId && findNote(currentNoteId);
    const activePaper = (n && n.paper) || 'blank';
    paperBox.querySelectorAll('.paper-btn').forEach(b => b.classList.toggle('active', b.dataset.paper === activePaper));
  }
  const sizeBox = document.getElementById('drawSizes'); sizeBox.innerHTML = '';
  DRAW_SIZES.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'draw-size' + (drawState.size === s ? ' active' : '');
    const dot = Math.max(4, Math.min(16, s));
    b.innerHTML = `<span class="ds-dot" style="width:${dot}px;height:${dot}px"></span>`;
    b.addEventListener('click', () => { drawState.size = s; renderDrawToolbar(); });
    sizeBox.appendChild(b);
  });
  document.getElementById('drawEraseBtn').classList.toggle('active', drawState.erasing);
  document.getElementById('drawUndoBtn').disabled = !drawState.undoStack.length;
}

// Resizes the backing store to match the element's real (device-pixel) size, preserving whatever is
// already drawn - needed once when Draw is first opened (the canvas starts at the default 300x150) and
// again on any later resize (e.g. rotating the phone).
function notesCanvasResize() {
  const canvas = notesCanvas();
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
  if (canvas.width === w && canvas.height === h && drawCanvasReady) return;
  let prev = null;
  if (drawCanvasReady) { try { prev = canvas.toDataURL('image/png'); } catch (e) { /* ignore */ } }
  canvas.width = w; canvas.height = h;
  const ctx = notesCtx();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCanvasReady = true;
  if (prev) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height); img.src = prev; }
  else loadDrawingFromState();
}

function loadDrawingFromState() {
  const n = currentNoteId && findNote(currentNoteId);
  const data = n && n.drawing;
  if (!data) return;
  const canvas = notesCanvas(), rect = canvas.getBoundingClientRect(), ctx = notesCtx();
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
  img.src = data;
}

function applyStrokeStyle(ctx) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = drawState.size;
  if (drawState.erasing) { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,1)'; }
  else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = drawState.color; }
}
function drawSegment(x0, y0, x1, y1) {
  const ctx = notesCtx();
  applyStrokeStyle(ctx);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function pointFromEvent(e) {
  const rect = notesCanvas().getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function pushUndoSnapshot() {
  try { drawState.undoStack.push(notesCanvas().toDataURL('image/png')); } catch (e) { return; }
  if (drawState.undoStack.length > 20) drawState.undoStack.shift();
  document.getElementById('drawUndoBtn').disabled = false;
}
let drawSaveTimer = null;
function scheduleDrawingSave() {
  if (!currentNoteId) return;
  setNotesDraftStatus('Saving draft…');
  clearTimeout(drawSaveTimer);
  drawSaveTimer = setTimeout(() => {
    try {
      const n = findNote(currentNoteId);
      if (n) { n.drawing = notesCanvas().toDataURL('image/png'); n.updatedAt = Date.now(); saveState(); setNotesDraftStatus('Draft saved'); }
    } catch (e) { /* ignore */ }
  }, 400);
}

function notesPointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  try { notesCanvas().setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  pushUndoSnapshot();
  drawState.drawing = true;
  const p = pointFromEvent(e);
  drawState.lastX = p.x; drawState.lastY = p.y;
  drawSegment(p.x, p.y, p.x + 0.01, p.y);   // so a single tap still leaves a dot
}
function notesPointerMove(e) {
  if (!drawState.drawing) return;
  const p = pointFromEvent(e);
  drawSegment(drawState.lastX, drawState.lastY, p.x, p.y);
  drawState.lastX = p.x; drawState.lastY = p.y;
}
function notesPointerUp() {
  if (!drawState.drawing) return;
  drawState.drawing = false;
  scheduleDrawingSave();
}

function initNotesCanvas() {
  const canvas = notesCanvas();
  canvas.addEventListener('pointerdown', notesPointerDown);
  canvas.addEventListener('pointermove', notesPointerMove);
  canvas.addEventListener('pointerup', notesPointerUp);
  canvas.addEventListener('pointercancel', notesPointerUp);
  canvas.addEventListener('pointerleave', notesPointerUp);
  document.getElementById('drawEraseBtn').addEventListener('click', () => { drawState.erasing = !drawState.erasing; renderDrawToolbar(); });
  document.getElementById('drawCustomColorBtn').addEventListener('click', () => { document.getElementById('drawCustomColorInput').click(); });
  document.getElementById('drawCustomColorInput').addEventListener('input', (e) => {
    drawState.color = e.target.value; drawState.erasing = false; renderDrawToolbar();
  });
  document.getElementById('paperToolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('.paper-btn');
    if (!btn || !currentNoteId) return;
    const n = findNote(currentNoteId);
    if (!n) return;
    sfx('nav'); buzz(HAP.tap);
    n.paper = btn.dataset.paper;
    n.updatedAt = Date.now();
    document.getElementById('drawCanvasWrap').className = 'draw-canvas-wrap paper-' + n.paper;
    renderDrawToolbar();
    scheduleNoteSave();
  });
  document.getElementById('drawUndoBtn').addEventListener('click', () => {
    if (!drawState.undoStack.length) return;
    const data = drawState.undoStack.pop();
    const rect = canvas.getBoundingClientRect(), ctx = notesCtx();
    ctx.clearRect(0, 0, rect.width, rect.height);
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, rect.width, rect.height); scheduleDrawingSave(); };
    img.src = data;
    renderDrawToolbar();
  });
  document.getElementById('drawClearBtn').addEventListener('click', () => {
    pushUndoSnapshot();
    const rect = canvas.getBoundingClientRect(), ctx = notesCtx();
    ctx.clearRect(0, 0, rect.width, rect.height);
    scheduleDrawingSave();
  });
  window.addEventListener('resize', () => { if (!document.getElementById('notesDrawView').classList.contains('hidden')) notesCanvasResize(); });
  renderDrawToolbar();
}
initNotesCanvas();

