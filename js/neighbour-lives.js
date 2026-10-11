/* ============================================================
   NEIGHBOUR LIVES (build 232)
   The neighbour systems (js/npc-brain.js, npc-memory.js) used to be visible only as things happening on the map. This makes them readable:
     - the talk screen says what the neighbour is doing right now ("Wren is off to sit for a while"), from the intent the brain keeps on f.intent,
     - Journal -> Neighbours is a page of everyone you have met: hearts, the score between you, their play style, favourite family and daily routine,
       who they are closest to, and (for those in the district you are in) what they are up to at this moment.
   It only reads what the other files already store; nothing new is saved.
   ============================================================ */
function npcDoingLine(f) {
  if (!f || !f.intent) return null;
  return `💭 ${f.name} is ${f.intent}.`;
}
// Everyone you have met, newest information first: [{ key, name, district, icon, hearts, mem, f (live neighbour or null) }]
function peopleList() {
  const keys = new Set([...Object.keys(friendsState()), ...Object.keys(metStore().npcs || {}), ...Object.keys(npcMemStore())]), out = [];
  keys.forEach(k => {
    const i = k.indexOf(':'), district = k.slice(0, i), name = k.slice(i + 1); if (!name) return;
    const fr = friendsState()[k], met = (metStore().npcs || {})[k], mem = npcMemStore()[k] || null;
    const data = state.districtData && state.districtData[district], live = data && (data.npcs || []).find(n => n.name === name && !n.defeated) || null;
    out.push({ key: k, name, district, icon: (fr && fr.icon) || (met && met.icon) || '🙂', hearts: fr ? heartsFor(fr.points || 0) : 0, points: fr ? fr.points || 0 : 0, mem, f: live && district === state.currentDistrict ? live : null });
  });
  return out.sort((a, b) => b.hearts - a.hearts || (b.mem ? b.mem.seen : 0) - (a.mem ? a.mem.seen : 0) || a.name.localeCompare(b.name));
}
// The neighbour this one is most bonded to (from neighbour-to-neighbour bonds), as { name, pts } or null.
function peopleClosest(name, district) {
  let best = null; const bonds = npcBonds(), pre = district + ':';
  Object.keys(bonds).forEach(k => {
    if (!k.startsWith(pre)) return;
    const pair = k.slice(pre.length).split('|'); if (pair.length !== 2 || !pair.includes(name)) return;
    const other = pair[0] === name ? pair[1] : pair[0];
    if (!best || bonds[k].pts > best.pts) best = { name: other, pts: bonds[k].pts };
  });
  return best;
}
function peopleCardHtml(p) {
  const who = { name: p.name }, taste = npcTaste(who), st = BattleEngine.AI_STYLES[npcAiStyle(who)], rt = npcRoutine(who), dist = DISTRICTS[p.district] ? DISTRICTS[p.district].name : p.district;
  const m = p.mem, close = peopleClosest(p.name, p.district), fam = FAMILIES[taste.family];
  const lines = [];
  if (m && (m.won + m.lost)) lines.push(`Matches: you ${m.won > m.lost ? 'lead' : m.won < m.lost ? 'trail' : 'are level'} ${Math.max(m.won, m.lost)}-${Math.min(m.won, m.lost)}${m.streak >= 2 ? ` · ${m.streak} wins running` : ''}`);
  if (m && (m.helped || m.gifts)) lines.push(`You have helped ${m.helped || 0}× and given ${m.gifts || 0} gift${m.gifts === 1 ? '' : 's'}`);
  lines.push(`Plays ${st.icon} ${st.name.toLowerCase()} · likes ${fam.icon} ${fam.name} cards`);
  lines.push(`Mornings ${NPC_PREF_WORDS[rt.morning]}, afternoons ${NPC_PREF_WORDS[rt.afternoon]}, evenings ${NPC_PREF_WORDS[rt.evening]}`);
  if (close) lines.push(`Closest to ${escapeHtml(close.name)}`);
  const now = p.f && p.f.intent ? `<div class="pp-now">💭 ${escapeHtml(p.name)} is ${escapeHtml(p.f.intent)}</div>` : '';
  return `<div class="pp-card"><div class="pp-head"><span class="pp-ico">${escapeHtml(p.icon)}</span><span class="pp-who"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(dist)}</small></span><span class="pp-hearts">${heartRow(Math.min(5, p.hearts))}</span></div>${now}<ul class="pp-lines">${lines.map(l => `<li>${l}</li>`).join('')}</ul></div>`;
}
function renderPeople() {
  const box = document.getElementById('peopleList'); if (!box) return;
  const list = peopleList();
  box.innerHTML = list.length ? list.map(peopleCardHtml).join('') : '<div class="notes-empty">Meet and chat with neighbours in town and they will appear here, with what they are like and how you are getting on.</div>';
}
