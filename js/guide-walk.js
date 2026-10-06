/* ============================================================
   GUIDE ME THERE (build 173): the goal chip and every Journal "Go →" button now take the player where the thing is, instead
   of only switching tabs or toasting "open the map". One entry point, guideTo(target), reads a small target object:
     { scene, district, name }  a building (or the fountain, the lantern): travel to its district, walk to the door, go in
     { help } / { minigame }    the nearest building that still has an undone daily task / any house mini-game
     { npc } / { rival } / { boss }  walk to the nearest neighbour (Rook, the district god) and talk to them
     { fish }                   walk to the bank beside a fish that is showing and cast
     { crop }                   walk to the ripest plot in El Umbral and look at it
     { wander }                 stroll a few loops so the step counter moves
     { travel: districtKey }    cross into a district through the map fade
   Everything reuses the real tap-to-walk (walkThen), so the walk looks and behaves exactly like tapping the spot yourself: a
   card on the path still interrupts it and the walk resumes after, and any tap on the map cancels it. A gold diamond marks
   the target building while the goal is showing (guideMarkApply, called from refreshGoalChip in js/skills-gear.js).
   ============================================================ */
let guideRun = 0;   // bumped by every new trip and by cancelWalk(), so a late travel callback from an older trip never fires
function guideCancel() { guideRun++; }
function guideHalt() { walkToken++; if (playerEl) playerEl.classList.remove('walking'); setChase(null); pendingWalk = null; }

// Gets the player into `district` on the town tab (fading across if needed), then calls then().
function guideArrive(district, then, tries) {
  if (inBattle || inScene) return;
  const run = ++guideRun; guideHalt();
  const start = () => {
    if (run !== guideRun) return;
    if (district && state.currentDistrict !== district) {
      if (!districtUnlocked(district)) { toast(`${DISTRICTS[district].name} is still closed. ${districtLockReason(district)} to open the way.`); return; }
      if ((tries || 0) >= 2) { toast('Open the map to travel there.'); return; }
      toast(`Heading to ${DISTRICTS[district].name}…`);
      travelToDistrict(district);
      setTimeout(() => { if (run === guideRun) guideArrive(district, then, (tries || 0) + 1); }, 1000);   // after the fade has swapped the map
      return;
    }
    then();
  };
  if (currentTab !== 'town') { switchTab('town'); setTimeout(start, 260); } else start();
}

const guideDist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const guideNearest = (list, from) => list.slice().sort((a, b) => guideDist(a, from) - guideDist(b, from))[0] || null;

/* ---------- places ---------- */
// How to reach `scene` on map m: a door, the fountain (the cup), Lumen's pitch, or null for something with no door on the map (the museum).
function guideSpot(m, scene) {
  const b = m.buildings.find(x => x.enter === scene);
  if (b) return { mark: b.id, goal: (x, y) => x === b.entry.x && y === b.entry.y, then: () => interactWith('building', b) };
  const fountain = scene === 'cup' ? m.props.find(p => p.type === 'fountain') : null;
  if (fountain) return { goal: adjacentTo(fountain), then: () => interactWith('prop', fountain) };
  if (scene === 'lantern' && lanternOpen()) return { goal: adjacentTo(LANTERN_TILE), then: () => { sfx('claim'); withDoorFade(() => { openScene('lantern'); showTipOnce('lantern'); }); } };
  return null;
}
// Buildings (in districts the player can enter) that have an action of `kind` still worth doing today. `skip(districtKey, building, action)` says it is done.
function guidePlacesWith(kind, skip) {
  const out = [];
  Object.keys(DISTRICTS).forEach(k => {
    if (!districtUnlocked(k)) return;
    getMap(k).buildings.forEach(b => {
      const it = b.enter && INTERIORS[b.enter];
      if (it && Array.isArray(it.actions) && it.actions.some(a => a.kind === kind && !(skip && skip(k, b, a)))) out.push({ scene: b.enter, district: k, name: it.title || b.enter, entry: b.entry });
    });
  });
  return out;
}
// The one nearest to the player: this district first (by walking distance), then the others in map order.
function guidePickPlace(list) {
  const here = list.filter(p => p.district === state.currentDistrict);
  return guideNearest(here, state.playerPos) || list[0] || null;
}
// A place-like target ({ scene } / { help } / { minigame }) as a plain { scene, district, name }, or null.
function guideResolve(t) {
  if (!t) return null;
  if (t.scene) return t;
  const today = todayKey();
  if (t.help) return guidePickPlace(guidePlacesWith('daily', (k, b, a) => { const s = ((state.districtData[k] || {}).buildings || {})[b.id]; return !!s && s[a.id] === today; }));
  if (t.minigame) return guidePickPlace(guidePlacesWith('minigame'));
  return null;
}
function guidePlace(t) {
  guideArrive(t.district, () => {
    const spot = guideSpot(getMap(state.currentDistrict), t.scene);
    if (!spot) { setTimeout(() => openSceneFx(t.scene), 120); return; }   // no door on the map for it: just open it
    if (spot.mark) guideMarkNow(spot.mark);
    if (!walkThen(spot.goal, () => { guideMarkNow(null); spot.then(); })) guideMarkNow(null);
  });
}

/* ---------- people, water, plots, strolls ---------- */
function guideNeighbour(kind) {
  let district = state.currentDistrict;
  if (kind === 'rival') {
    if (!rivalAround()) { toast('Rook only notices you after your first win.'); return; }
    district = Object.keys(state.districtData).find(k => rivalNpc(state.districtData[k])) || district;
  }
  guideArrive(district, () => {
    const data = ensureDistrictData(state.currentDistrict), p = state.playerPos;
    let who = null, act = 'talk';
    if (kind === 'rival') who = rivalNpc(data);
    else if (kind === 'boss') { who = data.boss && !data.boss.defeated && bossVisible() ? data.boss : null; act = 'fight'; }
    else who = guideNearest(data.npcs.filter(n => !n.defeated), p);
    if (!who) { toast(kind === 'boss' ? 'No district god is out here right now. They come and go on a clock.' : 'Nobody is about right now. Try again in a moment.'); return; }
    setChase(who);
    if (!walkThen(adjacentTo(who), () => { setChase(null); interactWith(act, who); })) setChase(null);
  });
}
function guideFish() {
  // Water with a fish showing, in this district if there is any, else the first open district that has some.
  const hasFish = k => { const m = getMap(k); return Object.keys(m.fishTiles).length > 0; };
  const k = hasFish(state.currentDistrict) ? state.currentDistrict : Object.keys(DISTRICTS).find(d => districtUnlocked(d) && hasFish(d));
  if (!k) { toast('No fish are showing right now. Try again in a few minutes.'); return; }
  guideArrive(k, () => {
    const m = getMap(state.currentDistrict), p = state.playerPos;
    const spots = Object.keys(m.fishTiles).map(s => { const [x, y] = s.split(',').map(Number); return { x, y, bank: bankFor(m, x, y) }; }).filter(s => s.bank);
    const pick = spots.slice().sort((a, b) => guideDist(a.bank, p) - guideDist(b.bank, p))[0];
    if (!pick) { toast('No fish are showing right now. Try again in a few minutes.'); return; }
    if (!walkThen((x, y) => x === pick.bank.x && y === pick.bank.y, () => openFishing({ x: pick.x, y: pick.y }))) townLog.textContent = "You can't get down to the water there.";
  });
}
function guideCrop() {
  guideArrive('square', () => {
    const crops = cropsIn();
    if (!crops.length) { toast('Nothing is planted yet. Fern sells seeds.'); return; }
    const c = crops.find(x => cropProgress(x) >= 1) || crops[0];
    if (!walkThen(adjacentTo(c), () => interactWith('crop', c))) townLog.textContent = "You can't get to the plot from here.";
  });
}
// A few loops of about a dozen steps each, until the step counter reaches the target (the first story ask is thirty steps).
function guideWander(want) {
  guideArrive(null, () => {
    const run = guideRun, m = getMap(state.currentDistrict);
    const leg = () => {
      if (run !== guideRun || inBattle || inScene || (state.progress.totals.steps || 0) >= want) return;
      const from = { x: state.playerPos.x, y: state.playerPos.y }, far = 9 + Math.floor(Math.random() * 5);
      walkThen((x, y) => guideDist({ x, y }, from) >= far && !m.entries[x + ',' + y] && !m.exits[x + ',' + y] && m.rows[y][x] !== 'b', leg);
    };
    leg();
  });
}

/* ---------- the one entry point ---------- */
function guideTo(t) {
  if (inBattle || !t) return;
  const place = guideResolve(t);
  if (place) { guidePlace(place); return; }
  if (t.scene || t.help || t.minigame) { toast(t.help ? 'Everything around town is done for today.' : 'No house is open for that right now.'); return; }
  if (t.npc) guideNeighbour('npc');
  else if (t.rival) guideNeighbour('rival');
  else if (t.boss) guideNeighbour('boss');
  else if (t.fish) guideFish();
  else if (t.crop) guideCrop();
  else if (t.wander) guideWander(t.wander === true ? 30 : t.wander);
  else if (t.travel) guideArrive(t.travel, () => {});
}
const GUIDE_KEYS = ['scene', 'help', 'minigame', 'npc', 'rival', 'boss', 'fish', 'crop', 'wander', 'travel'];
const guideWants = t => !!t && GUIDE_KEYS.some(k => t[k]);

/* ---------- the gold diamond ---------- */
// Marks the building a goal points at, only while the player is in its district. `.goal-target` shares the diamond CSS with the story's `.story-target`.
function guideMarkNow(id) {
  document.querySelectorAll('.bld.goal-target').forEach(el => { if (el.dataset.building !== id) el.classList.remove('goal-target'); });
  if (!id) return;
  const el = document.querySelector(`.bld[data-building="${id}"]`); if (el) el.classList.add('goal-target');
}
function guideMarkApply(go) {
  const p = !prefs.cozy ? guideResolve(go) : null;
  const b = p && p.district === state.currentDistrict ? getMap(p.district).buildings.find(x => x.enter === p.scene) : null;
  guideMarkNow(b ? b.id : null);
}
