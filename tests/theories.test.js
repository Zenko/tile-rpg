// The Journal's Theories page keeps the Atlas hints; written notes and drawings were removed (build 237).
module.exports = async (page, assert) => {
  const r = await page.evaluate(async () => {
    const out = {};
    out.noNotesScript = ![...document.scripts].some(s => /js\/notes\.js/.test(s.src));
    out.noEditor = !document.getElementById('notesCanvas') && !document.getElementById('newNoteDrawBtn');
    state.progress.atlas = state.progress.atlas || {}; state.progress.atlas.hints = [];
    document.getElementById('segNotes').click();
    out.emptyShown = !document.getElementById('theoriesEmpty').classList.contains('hidden') && document.getElementById('atlasHints').classList.contains('hidden');
    state.progress.atlas.hints = ['The roads remember.'];
    renderJournal();
    out.hintShown = !document.getElementById('atlasHints').classList.contains('hidden') && document.getElementById('atlasHints').textContent.includes('The roads remember.') && document.getElementById('theoriesEmpty').classList.contains('hidden');
    state.progress.notesList = [{ id: 'old', type: 'write', title: 't', text: 'kept', drawing: '', updatedAt: 1 }];
    ensureJournal();
    out.oldNotesKept = state.progress.notesList.length === 1 && state.progress.notesList[0].text === 'kept';
    return out;
  });
  assert.deepStrictEqual(r, { noNotesScript: true, noEditor: true, emptyShown: true, hintShown: true, oldNotesKept: true });
};
