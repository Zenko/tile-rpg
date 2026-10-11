// Your cottage from outside (js/home-room.js hrExterior): your colours and your home's level show on the building in town.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => {
    const d = ensureDistrictData('square'); d.npcs.length = 0; d.boss = null; d.items = []; d.chest = null; d.spirits = [];
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); renderTown(); switchTab('town');
  });
  const home = () => ev(() => { const el = document.querySelector('.bld[data-building="home"]'); return el ? { roof: el.style.getPropertyValue('--roof'), wall: el.style.getPropertyValue('--wall'), door: el.style.getPropertyValue('--door'),
    smoke: !!el.querySelector('.hr-smoke'), lantern: !!el.querySelector('.hr-lantern'), pots: el.querySelectorAll('.hr-pot').length, flag: !!el.querySelector('.hr-flag') } : null; });
  const start = await home();
  assert.ok(start, 'the cottage is in town');
  assert.strictEqual(start.roof, '#9a78c9', 'a new home keeps the roof the map gave it');
  assert.ok(!start.smoke && !start.lantern && !start.pots && !start.flag && start.wall === '' && start.door === '', 'and has nothing added');

  // colours: pick them in the room, step out, and the street shows them
  await ev(() => { openScene('home'); });
  await ev(() => { const h = hrHome(); h.style.rug = 'red'; h.style.wall = 'sage'; h.style.floor = 'walnut'; });
  await ev(() => closeScene());
  const coloured = await home();
  assert.strictEqual(coloured.roof, '#8a3d36', 'the roof takes the rug colour');
  assert.ok(coloured.wall !== '' && coloured.door !== '', 'the walls and the door take the wall and floor colours');
  assert.ok(!coloured.smoke, 'level 1 has no smoke');

  // level by level
  const at = lvl => ev(l => { hrHome().level = l; hrExteriorRefresh(); }, lvl).then(home);
  let h = await at(2); assert.ok(h.smoke && !h.lantern && !h.pots && !h.flag, 'level 2: chimney smoke');
  h = await at(3); assert.ok(h.smoke && h.lantern && !h.pots && !h.flag, 'level 3: a lit lantern');
  h = await at(4); assert.ok(h.lantern && h.pots === 2 && !h.flag, 'level 4: flowers by the door');
  h = await at(5); assert.ok(h.pots === 2 && h.flag, 'level 5: a flag on the roof');

  // back to the starting colours: the original look returns
  await ev(() => { const x = hrHome(); x.style = { floor: 'oak', wall: 'plaster', rug: 'teal' }; x.level = 1; hrExteriorRefresh(); });
  const back = await home();
  assert.ok(back.roof === '#9a78c9' && back.wall === '' && back.door === '' && !back.smoke, 'starting colours bring the original look back');
};
