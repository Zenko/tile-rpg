/* ---------------- releases: "Version 1 Beta" ----------------
   Players read about BETA UPDATES, all labelled just "Beta" (n is only the internal order; the build number is the exact version). A Beta update bundles everything since the previous one into one
   note with three short sections (new / better / fixed). It is cut on purpose - when the owner asks, or a batch is worth
   announcing - not on every publish. Between releases, finished player-facing changes are logged as bullets in
   PENDING_CHANGES (below; nobody sees it in-game). To cut a release: write the polished note at the TOP of RELEASES from
   those bullets (n = previous n + 1, today's date), then empty PENDING_CHANGES. The Journal dot / ? badge fire only for a
   new release. js/build.js holds BUILD, bumped on every publish, which is what the service worker and bug reports use.
   The 90 per-change notes from before the Beta live on as CHANGELOG_ARCHIVE, shown collapsed under "Before Beta". */
function fmtChangelogDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function gameVersionLabel() {
  const latest = RELEASES[0];
  return latest ? `Beta · ${fmtChangelogDate(latest.date)}` : '';
}
// For bug reports and the Settings menu: the Beta update plus the exact build.
function gameBuildLabel() { return RELEASES[0] ? `Beta (build ${BUILD})` : `build ${BUILD}`; }

// Bullets waiting for the next Beta update. tag: 'new' | 'better' | 'fixed'.
const PENDING_CHANGES = [
  { t:'new', x: 'Make your cottage your own. Tap Decorate in your cottage, then tap any piece to pick it up and tap where it should go, the mailbox, bonsai and altar included. Buy new furniture, put pieces away, and pick colours for the floor, walls and rug.' },
  { t:'new', x: 'Your home has levels now. Spend Embers in Decorate → Room to level it up from 1 to 5: each level makes the floor bigger and reveals more colours and more furniture, from a cat and a cot to a fireplace and an indoor tree.' },
  { t:'better', x: 'The last button on a piece of furniture\'s menu in your cottage is now Close, which keeps you inside. The door is the way out.' },
  { t:'fixed', x: 'Rain puddles now stay on the ground: neighbours, items, crops, decorations and your character are drawn over a puddle instead of it covering them.' },
];

const RELEASES = [
  {
    id: 'beta-3', n: 3, date: '2026-10-10', title: 'Drawn characters, candles and a cottage you can walk around',
    intro: 'The biggest round yet: you are drawn now, your cottage is a room, the altar and the Atlas have arrived, and every card has a new look.',
    new: [
      'Your cottage is a room you can walk around. Tap the floor to move and tap the furniture to use it: the mailbox, shelves, framed cards, trophy case, altar, sand garden, bonsai, the basket for Tidy Up and the armchair for a nap. Walk out of the door on the bottom wall to head back out.',
      'Your character is drawn. In town you see her walking, turning to face the way you go. Original, Don and the new Alyn are the first choices under Avatar, and Alyn turns smoothly through every angle. One neighbour in El Umbral is drawn too, as a try-out.',
      'The altar has four candles on a full-screen altar. Drag spare cards onto them and the flames grow with each card\'s rarity. Candles can burn while you explore for Embers, and the Atlas answers at the right candle.',
      'The Atlas and the four spirit gods: two new top rarities, Divine and Atlas. Beat a district god, offer spare cards of their family at the altar and the god is summoned. The Atlas walks with you through every district once summoned.',
      'Anyone can be your companion: any card you own, any neighbour or boss you have met, and Rook. Character → Companion shows their perks and your bond, and you can walk, calm down or spar together.',
      'A new look for every card and most icons, all drawn in one clean gradient style. The rarest cards (every mythic and three of the gods) have full art: a painted scene with a subject that steps out of the frame. Ultra rare and better cards shine with a holo foil you can tilt with your finger.',
      'Wren guides your first hour. A new dreamer starts with a short, skippable drifting-off scene and wakes in El Umbral, and each early goal begins with a few words from her.',
      'Look around the town by dragging the map, and tap the goal bar at the top to have your character walk you to it, even into another district.',
      'The Old Cellar is a Descent Map of dark floors and a lantern, with a choice of doors on every floor. The Calm corner, Tarot readings, Fate and Fate Spread, Trials of the Arcana, family passives and the Weekly Rule all joined the game too.',
      'Settings has an Update game button. If your phone seems stuck on an old version, tap it: it clears the stored files and loads the newest copy without touching your save.'
    ],
    better: [
      'Cards have a new face: a bigger picture, round keyword badges, and the name and numbers on a calm panel. The card list is cut to 95 cards and the four families now play about evenly.',
      'The town draws much more smoothly on your phone, and at night it is lit from lamps, the Lantern Market and every building.',
      'Battle hits and spells have more punch, and a fainted card burns away at the edges.',
      'Dream words everywhere: Embers, Calm, Watch and Flicker, new pack and level names, and Theories in the Journal.',
      'My Cards, the Workshop, Social, Settings, the mailbox and the Town Guide have roomier, redesigned layouts, and Settings is simpler.',
      'Fishing follows the light theme, and every fish swims as a silhouette until it bites.',
      'Sitting on a bench is calmer and keeps you still while the town eases in, and rain makes uneven puddles that hold a little sky.'
    ],
    fixed: [
      'Big hands in battle stay on screen, and full art cards in a sleeve no longer slip below the card.',
      'Card art and icons stay put while an update installs, and the bottom menu no longer slides off the screen after tapping Refresh on Android.',
      'Social no longer fills with copies of the same tester, and you can only see fish in water you can reach.',
      'Water tiles fill the whole tile, and older saves load cleanly after the card cut.'
    ]
  },
  {
    id: 'beta-2', n: 2, date: '2026-10-01', title: 'Cards, Rewards and Character, redone',
    intro: 'Three tabs got a proper tidy-up, based on your feedback on the Journal.',
    new: [
      'Cards: My Cards is now a grid of tiles with family and rarity filters. Tap a card to open its sheet, where you can add it to your deck, refine it, use it as a charm or release a spare.',
      'Deck builder: a 12-slot tray at the top shows your whole deck. Tap a card below to add it, tap one in the tray to remove it, and turn on Info mode to read cards without changing anything.',
      'Rewards: Dailies and Weekly now open with a Claim all button, then Ready, In progress (closest first), a collapsed Not started group, and Claimed at the bottom.',
      'Character: pin up to three stats and they show on your stage under your name.'
    ],
    better: [
      'Character tab: Me now holds your title chips and what unlocks next. Bag is now Pantry, and Milestones live only in Rewards.',
      'Index is now Sets: tap a set to see its cards, with silhouettes for the ones you are missing. Craft is now Workshop, and the Fish log lives in the Journal Almanac.'
    ],
    fixed: [
      'Other players\' emoji and levels in Who\'s Playing can no longer inject anything odd, and a damaged save can\'t carry markup in your name.'
    ]
  },
  {
    id: 'beta-1', n: 1, date: '2026-10-01', title: 'Welcome to the Beta',
    intro: 'Tile RPG is now Version 1 Beta. Updates are bundled, so you get one note every so often instead of one for every small change. Here is everything from the first big round of playtest improvements.',
    new: [
      'Who goes first: every match starts with a coin call or a dice roll-off. The loser goes second and gets an extra card and +1 energy early.',
      'Card families (Stone, Wind, Tide, Grove, one per district) and four new keywords: Seed, Lull, Kin and Sting. Plus 28 new cards, and neighbors and bosses now build decks around their district\'s family.',
      'The world joins the fight: weather, night and each district\'s home turf now change how matches play, for both sides.',
      'Keeper\'s Knack: a free once-per-match power you pick before the match. Six of them, unlocked as you level up.',
      'Draft Runs at the fountain (level 5): build a deck from offers of three, then win four matches in a row.',
      'Ghost duels (level 8): play a match against a ghost of another tester\'s deck from Who\'s Playing.',
      'A new Journal: Today (your daily checklist with Go buttons and a "Since you were away" box), an Almanac of fish, cards, recipes and night critters, a Log grouped by day with filters, and Battles with a trend line, filters and Rematch.',
      'Fish you have not caught yet swim as silhouettes. Land one and its colours are revealed.',
      'Premium things to save for: five decorations, four shimmering avatar rings and three new backdrops.'
    ],
    better: [
      'Battles now follow the light theme and fill the whole screen.',
      'A steadier economy: fishing, crops, the Festival Cup and Draft Runs pay full Embers up to a daily amount, then less. Packs from Brook upward and some seeds cost a bit more. A Ember ledger in Settings shows where yours came from.',
      'New features unlock with your level, with a notice when they do, and a "Coming up" list on the Character tab.',
      'Notes: search, pin favourites, and swipe to delete with an Undo.',
      'The Guide and What\'s new moved behind the ? button. The Guide has search, NEW tags and a "Take me there" button.',
      'Match cards no longer have a coloured left edge.'
    ],
    fixed: [
      'The opponent-only Ember Fox clashed with your collectible Ember Fox and quietly replaced its stats in battle. It is now the Cinder Fox.'
    ]
  }
];

// Which entries are expanded, keyed by version - a compact vertical timeline of collapsed tiles reads far
// better than 40+ entries all fully expanded at once. The newest entry opens by default (that's the point
// of "What's New"); everything older starts collapsed and expands in place on tap, same idiom as the
// mailbox's mail-item/mail-body (see renderMailList in houses-and-cellar.js).
let clOpen = null;
/* ---- What's new (inside the Journal's ? sheet) ----
   The newest Beta updates are listed (open the latest to read it); older ones fold under "Earlier Beta updates", and the old
   per-change notes sit in one collapsed "Before Beta" entry. Each release has an unread dot (state.progress.clRead, keyed by
   release id), cleared by opening it or by "Mark all as read". A save that never opened Updates starts fully read. */
const CL_SHOWN = 3;
let clEarlier = false, clHistory = false;
function clReadMap() {
  const pr = state.progress;
  if (!pr.clRead || typeof pr.clRead !== 'object') {
    pr.clRead = {};
    if (!pr.lastSeenChangelog) RELEASES.forEach(r => { pr.clRead[r.id] = true; });
    saveState();
  }
  return pr.clRead;
}
function clUnreadCount() { const r = clReadMap(); return RELEASES.filter(e => !r[e.id]).length; }
function renderChangelog() {
  if (!clOpen) { clOpen = {}; if (RELEASES[0]) clOpen[RELEASES[0].id] = true; }
  const read = clReadMap(), listEl = document.getElementById('changelogList'), unread = clUnreadCount();
  const versionLine = document.getElementById('clVersionLine');
  if (versionLine) versionLine.textContent = 'You\'re on ' + gameVersionLabel();
  const sec = (label, list) => list && list.length ? `<div class="cl-sec">${label}</div><ul class="cl-list">${list.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : '';
  const release = r => {
    const open = !!clOpen[r.id];
    return `<div class="cl-entry${open ? ' open' : ''}" data-toggle-cl="${r.id}"><div class="cl-head">
        <span class="cl-dot"></span><span class="cl-v">Beta</span><span class="cl-title">${escapeHtml(r.title)}</span>
        ${read[r.id] ? '' : '<i class="jdot" title="Unread"></i>'}<span class="cl-date">${fmtChangelogDate(r.date)}</span><span class="cl-chevron">${open ? '▲' : '▼'}</span></div>
      ${open ? `<div class="cl-body">${r.intro ? `<p class="cl-intro">${escapeHtml(r.intro)}</p>` : ''}${sec('✨ New', r.new)}${sec('🌿 Better', r.better)}${sec('🔧 Fixed', r.fixed)}</div>` : ''}</div>`;
  };
  const old = e => {
    const open = !!clOpen['v' + e.version];
    return `<div class="cl-entry${open ? ' open' : ''}" data-toggle-cl="v${e.version}"><div class="cl-head"><span class="cl-dot"></span><span class="cl-v">v${e.version}</span><span class="cl-title">${escapeHtml(e.title)}</span><span class="cl-date">${fmtChangelogDate(e.date)}</span><span class="cl-chevron">${open ? '▲' : '▼'}</span></div>${open ? `<ul class="cl-list">${e.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : ''}</div>`;
  };
  const shown = RELEASES.slice(0, CL_SHOWN), earlier = RELEASES.slice(CL_SHOWN);
  listEl.innerHTML = `<div class="jgroup-h">Beta updates<small>${unread ? unread + ' unread' : 'all read'}</small></div>` + shown.map(release).join('') +
    (earlier.length ? `<button type="button" class="jchip jearlier" id="clEarlierBtn" aria-expanded="${clEarlier}">${clEarlier ? 'Hide earlier Beta updates' : `Earlier Beta updates · ${earlier.length}`}</button>${clEarlier ? earlier.map(release).join('') : ''}` : '') +
    (CHANGELOG_ARCHIVE.length ? `<button type="button" class="jchip jearlier" id="clHistoryBtn" aria-expanded="${clHistory}">${clHistory ? 'Hide history' : `Before Beta · ${CHANGELOG_ARCHIVE.length} earlier notes`}</button>${clHistory ? CHANGELOG_ARCHIVE.map(old).join('') : ''}` : '') +
    (unread ? '<div class="jmarkall"><button type="button" class="jgo" id="clMarkAll">Mark all as read</button></div>' : '');
  listEl.querySelectorAll('[data-toggle-cl]').forEach(el => el.addEventListener('click', () => {
    const v = el.dataset.toggleCl;
    sfx('flip');
    clOpen[v] = !clOpen[v];
    if (clOpen[v] && !v.startsWith('v')) { clReadMap()[v] = true; saveState(); }
    renderChangelog(); updateJournalBadge();
  }));
  const eb = document.getElementById('clEarlierBtn'); if (eb) eb.addEventListener('click', () => { sfx('nav'); clEarlier = !clEarlier; renderChangelog(); });
  const hb = document.getElementById('clHistoryBtn'); if (hb) hb.addEventListener('click', () => { sfx('nav'); clHistory = !clHistory; renderChangelog(); });
  const ma = document.getElementById('clMarkAll'); if (ma) ma.addEventListener('click', () => { markChangelogSeen(); sfx('claim'); renderChangelog(); });
}
function markChangelogSeen() {
  const pr = state.progress, r = clReadMap();
  RELEASES.forEach(e => { r[e.id] = true; });
  if (RELEASES[0]) pr.lastSeenChangelog = RELEASES[0].date;
  saveState(); updateJournalBadge();
}
// The dot on the Journal tab and the number on the ? button both mean "there are updates you have not read".
function updateJournalBadge() {
  const btn = document.getElementById('tabJournal'), n = clUnreadCount();
  let dot = btn.querySelector('.dot');
  if (n && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!n && dot) dot.remove();
  const b = document.getElementById('journalHelpBadge');
  if (b) { b.textContent = n || ''; b.classList.toggle('hidden', !n); }
}

