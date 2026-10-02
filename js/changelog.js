/* ---------------- releases: "Version 1 Beta" ----------------
   Players read about BETA UPDATES (Beta 1, Beta 2, ...). A Beta update bundles everything since the previous one into one
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
  return latest ? `Beta ${latest.n} · ${fmtChangelogDate(latest.date)}` : '';
}
// For bug reports and the Settings menu: the Beta update plus the exact build.
function gameBuildLabel() { return RELEASES[0] ? `Beta ${RELEASES[0].n} (build ${BUILD})` : `build ${BUILD}`; }

// Bullets waiting for the next Beta update. tag: 'new' | 'better' | 'fixed'.
const PENDING_CHANGES = [
  { t:'new', x: 'The Old Cellar is a Descent Map: every floor offers a choice of doors (a fight, a chest, a campfire, a shrine or a peddler). You have three hearts, boons last for the run, and every 5th floor is a guardian with a rare prize. Torches, barrels and drips make it look the part.' },
  { t:'better', x: 'Leaving the cellar no longer ends a run, and a short run costs no waiting. "Climb out" ends one on purpose.' },
  { t:'better', x: 'Every calm corner activity (breathing pond, sand garden, lanterns, wind chimes, star gazing, bonsai) now uses the same layout as the tea ritual: a stage card, one quiet line, step or progress chips and full-width buttons.' },
  { t:'better', x: 'The tea ritual now matches the other screens: a cup on a saucer with a thin stream, three step chips (Pour, Steep, Sip) and two full-width buttons. The sand garden, wind chimes and tea no longer have a double frame.' },
  { t:'new', x: 'Calm corner: quiet things that score nothing. A breathing pond (five breaths leave you Rested, +5% XP for the day), a sand garden that remembers your raking, wind chimes, a tea ritual, star gazing and lantern release after dark, a bonsai that grows on real days, and postcards of places you like. Find it in Journal → Today, at Wren\'s, your cottage and the Net Loft.' },
  { t:'better', x: 'Sitting on a bench now zooms the town out gently and lets the day drift by until you stand up.' },
  { t:'new', x: 'Wind Chime decoration: place it in town and tap it for a soft note.' },
  { t:'new', x: 'Cozy mode in Settings → Comfort hides the goal pill and day-event nudges, and stops anything pulsing for attention.' },
  { t:'better', x: 'Every set of tabs (Cards, Journal, Rewards, Character, Settings and Social, Deck) now has a pill that glides under the active tab, and the content slides in the direction you moved, like the bottom bar.' },
  { t:'better', x: 'Your Bag and Shop shortcuts are gone from Settings. Your Bag is in Character → Pantry, and the Card Shop is on Market Row.' },
  { t:'new', x: 'Three rare days now turn up about one day in twelve: Starfall (hidden cards twice as easy to spot, more foils), Friendship Fair (hearts count double) and Tournament Day (+3 Pebbles for every match you win).' },
  { t:'new', x: 'Beating a district boss leaves that district calm for the rest of the day: hidden cards and chests turn up more often there.' },
  { t:'new', x: 'The Sets tab has a Binder: nine pages (one per rarity and one per family) that pay Pebbles the first time you fill them.' },
  { t:'better', x: 'New battle and progress sounds: a thump for a hit, a clink for a block, a chime for healing, a swoosh for a spell, and a fanfare when you rank up.' },
  { t:'new', x: 'Settings has a Share anonymous play stats switch (counts only, no name) that helps tune the game.' },
  { t:'new', x: 'A small Next goal pill under the top bar in town points at the most useful thing to do (unspent skill points, bread or crops ready, then today\'s tasks). Tap it to go there.' },
  { t:'better', x: 'Opening a card pack is more of a moment: the card arrives face-down with a glow that hints at its rarity, and you tap it to flip it. New cards get a NEW tag.' },
  { t:'new', x: 'A monthly ladder (Pebble, Stone, Moss, Gem, Star) earned from ghost duels, deck challenges, the Cup, bosses and Draft Runs. You never lose points, and each rank pays Pebbles. Find it in Social.' },
  { t:'new', x: 'Deck archetypes: six cards of one family make a themed deck, and eight give +1 Spirit at the start of matches. Cards → Deck → Your deck also has a Test your deck button that plays practice matches and shows your win rate.' },
  { t:'new', x: 'Deck challenges at the fountain now include family formats (Only Grove, Stone, Tide or Wind cards) and a two-family format.' },
  { t:'new', x: 'Character → Path: a skill point every level for Angler, Gardener, Duelist and Wanderer, plus rod, watering can and lantern upgrades you buy with Pebbles. Companions now grow a bond as you win and fish, and their perk gets stronger.' },
  { t:'fixed', x: 'The bottom menu no longer slides off the screen after tapping Refresh on the update banner (Android home-screen installs): the app now measures the visible screen height itself.' },
  { t:'new', x: "Tock's Tinker Stall now has a bait counter: daisies, fresh fish and an angler's mix for Pebbles. Card sleeves are sold only at Zeph's Card Shop." },
  { t:'better', x: 'Card sleeves are a grid of big card-back previews with clear Wearing, Wear and price labels, matching the other building screens.' },
  { t:'better', x: "Social is redesigned: each tester is a card with their avatar, level, location and a green dot when they're playing, and a line at the top tells you whether you're visible." },
  { t:'better', x: 'Settings has a fresh layout: Appearance, Sound, Battles, Comfort, Notifications & privacy and Your save are each their own card, with a short hint under every option.' },
  { t:'better', x: 'The Town Guide has a roomier layout: a Today card with separate rows, section chips under the search box, and larger cards for each entry.' },
  { t:'better', x: 'The Deck tab is split in two: Your deck (a bigger tray, cost chart and keywords) and Add cards (your deck as a pinned strip above your collection).' },
  { t:'fixed', x: 'The Workshop trade-up tray now has a solid background when it sticks to the top, so cards no longer show through it.' },
  { t:'better', x: 'The tab bars on Cards, Rewards and Journal now sit a little lower, with breathing room under the top bar.' },
  { t:'fixed', x: 'Tapping Refresh on the "new version" banner no longer leaves the main menu pushed down on Android home-screen installs.' },
];

const RELEASES = [
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
      'A steadier economy: fishing, crops, the Festival Cup and Draft Runs pay full Pebbles up to a daily amount, then less. Packs from Brook upward and some seeds cost a bit more. A Pebble ledger in Settings shows where yours came from.',
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
        <span class="cl-dot"></span><span class="cl-v">Beta ${r.n}</span><span class="cl-title">${escapeHtml(r.title)}</span>
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

