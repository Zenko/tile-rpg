# Tile RPG handoff

For whoever picks up this project next (most likely another Claude). This covers what the game is, how it's built and published, how to change it safely, and how the owner likes to work.

Current version: **v1.14.0**. The newest entry in `CHANGELOG` inside the game file is always the source of truth.

---

## 1. What this is

Tile RPG is a calm, mobile-first card-collecting town game. You walk around a tile map, meet neighbours, battle with a 12-card deck, collect cards, fish, garden, cook, decorate, and so on. It's in a **playtesting phase** with a small group of testers.

- **Everything is one file:** `Tile RPG.html`, about 11,600 lines. HTML, CSS and JS are inline, with no build step, no dependencies and no assets. Sprites are inline SVG `<symbol>`s, and sound and music are generated live with the Web Audio API.
- `index.html` only forwards to `Tile RPG.html`, so the GitHub Pages root link opens the game.
- To run it, open `Tile RPG.html` in a browser. For a phone-sized view, use a 400×860 viewport.

## 2. Hosting and publishing

| | |
|---|---|
| Repo | https://github.com/Zenko/tile-rpg (public, branch `main`) |
| Live link for testers | **https://zenko.github.io/tile-rpg/** (GitHub Pages, built from `main` at `/`) |
| Owner's GitHub | **Zenko** is the owner's *personal* account. |

**Account warning:** the machine's `gh` CLI also holds a work account, and that one is the *active* account. **Never** create repos or push personal projects with it. This repo's local git config already handles this:
- `user.name = Zenko`, `user.email = <id>+Zenko@users.noreply.github.com`
- a repo-local credential helper that asks for `gh auth token --user Zenko`

So `git push` from this folder always goes out as Zenko, even while the work account is active. Leave the work account active for `gh`. For `gh api` calls against this repo, prefix with `GH_TOKEN=$(gh auth token --user Zenko)`.

**Standing instruction from the owner: always publish.** When a batch of changes is finished and tested:
1. Add a `CHANGELOG` entry (see §5), commit, and `git push origin main`.
2. Wait for Pages: `GH_TOKEN=$(gh auth token --user Zenko) gh api repos/Zenko/tile-rpg/pages/builds/latest --jq '.status + " " + .commit'` until it says `built` with your commit.
3. Load the live link and confirm the version label and that there are no page errors.
4. Tell the owner the link.

Don't publish broken or half-finished work.

Commit messages end with a `Co-Authored-By:` line for the Claude model doing the work.

## 3. How the owner likes to work

- They usually ask "what can we add?" and then say "**do them all**". Give a concrete, prioritised list grounded in the actual code, then build the whole batch, test it, and publish.
- **They have declined twice to hand-design the Quiet Harbor and Hollow Garden maps.** Those are still procedural placeholders (`proceduralMap()`). Don't redesign them unless asked.
- **Saves don't matter during testing.** They skipped a save export/import feature. Still, keep the existing habit of never crashing on an older save (see §6).
- They want playtesters to be able to find their way around, so every new system gets a first-time tip, a Town Guide entry and a changelog line.
- The in-game Feedback and Report-a-bug buttons open an email to the owner (the address is in the `sendFeedback` code). They chose to keep it public.

## 4. Map of the file

Search for these banner comments (the `====` blocks). Line numbers drift, but banners don't.

| Banner / anchor | What lives there |
|---|---|
| `<style>` (top) | All CSS. Colours are variables on `:root`; each biome's palette is on `.town-view[data-biome=…]`; seasonal foliage is on `[data-season=…]`. |
| Markup after `<body>` | HUD, tab panels (Town, Journal, Cards, Deck, Shop, Rewards), `#sceneView`, `#battleView`, and the overlays (`#pickupOverlay`, `#levelUpOverlay`, `#tipOverlay`, `#talkOverlay`, `#fishOverlay`, …). |
| `CARD_POOL` | Every card. **Append new cards to the end only** (deck share codes store cards by their position in this list). |
| `BEGIN BATTLE ENGINE` … `END BATTLE ENGINE` | `BattleEngine`: pure rules with no DOM access. Keywords, spells (`SPELLS`), boss twists (`TWISTS`), AI (`aiNextAction`, `spellPlan`), `suggestDeck`, `boost`. |
| `PREFS, SOUND, HAPTICS, TOAST` / `AMBIENT MUSIC` / `WEATHER AMBIENCE` | Audio. The seasonal chord sets are in `MUSIC.SEASON_CHORDS`. |
| `FIRST-TIME TIPS` | `TIPS` and `showTipOnce(id)`, which queues behind any other open overlay. |
| `PROGRESSION: DAILY GIFT, QUESTS, ACHIEVEMENTS` | `QUEST_POOL`, `WEEKLY_QUEST_POOL`, `ACHIEVEMENTS`, `XP_PER_STAT`, `bumpStat`, `addXP`, `TITLES`. |
| `TOWN MAPS` | `MAP_SQUARE` and `MAP_MARKET` (hand-built JSON), `proceduralMap`, `getMap`, `findPath`, `DISTRICT_LINKS`. |
| `DAY/NIGHT CYCLE + WEATHER` | `skyPhase(atMs)`, `WEATHER_KINDS`, `WEATHER_EFFECTS`/`weatherFx()`, and a forecast that rolls the next weather one change ahead (`state.weather.next`). `SEASONS` sits just above `weatherNow()`. |
| `HOUSES AND THE CELLAR` | `INTERIORS` (every enterable building), the scene screen (`openScene`, `renderScene`, `sceneAction`), the bakery, cooking, the spice stall, sleeves, the cottage and letters, the cellar and deep floors, and the Festival Cup. |
| `WANDERING NEIGHBORS, BOSSES AND GRAVES` | Wandering, graves, and the boss 30-minutes-on / 30-minutes-off clock. |
| `FISHING` / `VILLAGER REQUESTS` / `NEIGHBOR FRIENDSHIP` / `THE RIVAL` | Each self-contained. Favours are `makeRequest`, `requestDone` and `completeRequest`. |
| `DAILY PUZZLE` / `MEMORY MATCH` / `HOUSE MINI-GAMES` | The puzzle is generated from a seed and checked by a search-based solver. `MINIGAMES` holds 10 games on one shared framework (see §7). |
| `AFTER DARK` / `COMPANION` / `MORE USES FOR CARDS` / `GARDENING` | Night market and critters, companion perks, charms, sets, mastery, museum, expeditions, trading board, deck challenges, card gifting, seeds and crops. |
| `TURN-BASED BATTLE` | Battle UI: `startBattle`, the `btRender*` functions, input, `btAnimate` (one branch per engine event type), `btFinish`, `btShowResult` (one reward branch per opponent kind), `closeBattle`. |
| `RELEASE + PACKS` onwards | Workshop crafting, packs, the Shop, Index/collection/deck panels, filters, deck codes, deck slots, journal, battle history, `CHANGELOG`, world map, cosmetics, titles, `updateHud`, `switchTab`. |
| `DAILY TOWN EVENTS` … `FEEDBACK FOR TESTERS` | The v1.14 batch: events, getting-started story, foils, Town Guide, comfort settings, tester feedback. **This block must stay just above the start-up code** (`loadState(); … renderTown(); updateHud();`) because start-up uses those `const`s. |

## 5. Conventions to keep

- **Changelog and version.** Add a new entry at the **top** of `CHANGELOG` for every player-facing batch. Bump the minor version (`1.14.0` → `1.15.0`) and use the real date. The HUD, profile and Journal all read the version from the newest entry.
- **Comments** explain *why* in plain words, in the style of the existing ones. New systems get a banner comment with a short paragraph on how they work.
- **Card pools.** Use `cardPool(rarity, only)` and `randomCardId(rarity, only)`. They exclude `exclusive` cards (cellar and rival prizes) and apply the seasonal weighting through `seasonalPick`. Never pick straight from `CARD_POOL` for rewards.
- **Card text.** Spells have no power or health. Anywhere that prints stats or rules should use `cardStatsText`, `hasAbility` and `cardAbilityHtml`.
- **Spare copies.** Anything that consumes cards (releasing, crafting, the museum, trades, expeditions, gifts) must go through `spareCount(id)` or `spareAllocation()`, so a player can always still build a full 12-card deck.
- **Perks** are layered and read at the point of use:
  - weather: `weatherFx()`
  - daily event: `eventIs(id)`
  - companion: `hasPerk(kind)`
  - charms and sets: `cardBonus(kind)`

  The kinds are `crops`, `fish`, `finds`, `chest`, `harvestPebbles`, `startSpirit`, `startDraw`, `xp`, `bake`, `winPebbles` and `miniPebbles`. When adding a new bonus, find the existing hook for that kind and stack onto it.
- **Every new system also gets:** quests (`QUEST_POOL` / `WEEKLY_QUEST_POOL` with a stat bumped through `bumpStat`, plus an `XP_PER_STAT` value), milestones (`ACHIEVEMENTS`, optionally a `TITLES` entry), a tip (`TIPS` plus `showTipOnce`), a Town Guide entry (`GUIDE`), and a changelog line.
- **Balance** is checked by simulation, not by feel. For example, spell decks were checked to win about 50% against the same deck without spells. Boss twists were tuned against a baseline where the boss side wins about 58% with no twist (it plays second); the twists add roughly +4 to +15 points, with the Harbor Keeper's tide the strongest. Re-run a simulation (see §8) when changing combat numbers.
- **Mobile first.** Keep the 400px layout working, use tap targets of at least 44px, and use `pointerdown` for fast mini-game taps.

## 6. State and saves

- Saved in `localStorage['quiet-commons-state-v4']`, with settings in `'quiet-commons-prefs'`. Each tester has their own save in their own browser.
- **Top-level `state` keys:** `ownedCards` (array of card ids; crafted variants are `base~p.guard`-style ids), `deck` (always the *active* deck), `deckSlots` and `activeDeckSlot`, `wins`, `currentDistrict`, `playerPos`, `districtData[key]` (NPCs, boss, items, spirits, decorations, crops, bugs, buildings state), `character` (emoji, colour, accessory, name, sleeve, title and unlocks), `companion` and `companionPos`, `sky`, `weather`, `decorationInventory`, and `progress`.
- **`state.progress`** holds almost everything else, and every system creates its own slice the first time it's used through an `xxxState()` function (for example `cupState()`, `museumState()`, `expedState()`, `mailState()`, `storyState()`, `foils()`). **Follow this pattern.** Never assume a field exists, because older saves won't have it.
- `loadState()` merges the save over the defaults. The `migrate*()` functions handle one-time upgrades.

## 7. How the systems fit together

- **Scenes (inside buildings).** `INTERIORS[id]` defines `title`, `who` (a string or function), `theme` and `greet` (a string or function), plus `actions`. Each action has a `kind` (`daily`, `advice`, `chest`, `memory`, `puzzle`, `minigame`, `oven`, `cook`, `deal`, `sleeves`, `seeds`, `mail`, `wings`, `exped`, and so on) and can have a `view()` that returns `{label, disabled}` for live buttons. Sub-menus use `scene.mode`. The cellar, the Festival Cup (the fountain) and the trading board (the Market sign) are special scenes rendered directly in `renderScene`. `sceneAction` routes in this order: leave, back, mini-game, prefixed ids (`dish:`, `wing:`, `exp-…`, `trade:`, …), special scenes, then action kinds.
- **Battles.** `startBattle(opponent)` reads optional fields on the opponent: `profile`, `deck`, `isBoss`, `dungeon`, `cup`, `challenge`, `puzzle` (a saved board), `signature`, `isRival` and `startSpirit`. `btShowResult` has one branch per kind, and `closeBattle` returns you to the right scene. District bosses get a twist through `bossTwistFor()`.
- **Mini-games.** Each `MINIGAMES` entry has `{house, icon, title, how, init, begin?, tap(st, value), render(st), scoreText, tiers or tierOf, lowerBetter?, pebbles?}`. Taps come from `data-mg` attributes on `pointerdown`. Timers are created with `miniEvery`/`miniAfter` so they're cleared automatically. `miniFinish(score)` awards the medal and prize, capped at 3 paid medals per game per day.
- **Places in town.** Town Square has Wren's cottage, the Reading Nook, the cellar, Maple's bakery, Fern's cottage, the player's cottage (top right, by the Nook), the fountain (Festival Cup and challenges) and the sign (weather board). Market Row has Pip, Clover, Saffron and Tock, the Card Museum (east hedge), the sign (trading board) and Lumen's Lantern Market (night only, tile 4,5). The Harbor and the Garden have no buildings yet.

## 8. Testing (how every change so far was checked)

Every change was checked with **Playwright** driving the real page in headless Chromium: open the file, run scripted play, and fail on any `pageerror` or console error. A Chromium build is cached at `~/Library/Caches/ms-playwright`. Install the library in a scratch folder with `npm i playwright`, not in this repo. A minimal runner:

```js
// run.js - usage: node run.js test.js   (test.js exports async (page, log) => {})
const { chromium } = require('playwright'), path = require('path');
(async () => {
  const b = await chromium.launch(), page = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('dialog', d => setTimeout(() => d.accept().catch(() => {}), 50));
  await page.goto('file://' + path.resolve('Tile RPG.html')); await page.waitForTimeout(600);
  await page.evaluate(() => { Object.keys(TIPS).forEach(k => tipsSeen()[k] = true); saveState(); });   // tips would block clicks
  await require(path.resolve(process.argv[2]))(page, console.log);
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'OK'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
```

Useful habits:
- **Syntax check:** pull out the `<script>` contents and run `node --check` on them.
- **Engine simulation:** in `page.evaluate`, run thousands of `BattleEngine.newGame` → `aiTurn`/`endTurn` loops. Check that every game ends, no board holds more than 4 cards, and no card at 0 health stays on the board, and compare win rates.
- **Forcing a result:** set `battle.G.over = true; battle.G.winner = 0` (or 1), clear `G.events`, and call `btFinish()`.
- **Dismiss overlays before clicking:** the tip, pickup and level-up overlays sit above everything else.
- **Saves:** test a fresh save (`localStorage.clear()` then reload) and, when touching state, an older save.
- **Screenshots:** take them at 400×860 and look at them. Several layout bugs were only caught this way.

## 9. Gotchas learned the hard way

- **Overlay stacking order.** `#pickupOverlay` and `#levelUpOverlay` are at z-index 22 and `#tipOverlay` at 23, so reveals show above the talk card and the result screen. `closeBattle` also hides `#mulliganOverlay`.
- **The scene stage is rebuilt.** The memory game and mini-games replace `#scStage`'s contents, so `#scWho` doesn't exist while they're running. `memoryLeaveStage()`/`miniLeaveStage()` restore it. `renderHomeShelf()` runs on every scene render and removes itself outside the cottage.
- **Placement works per district.** Decoration placement and planting take `placingDecoration.district`; seeds always go to `square`.
- **Neighbours are known by district + name** (`neighborKey`), and names are unique within a district because friendship depends on them.
- **The rival lives inside a district's `npcs` list** while visiting. `syncRival()` is the single source of truth and never moves Rook mid-conversation or mid-battle.
- **Foils are detected by comparing collection snapshots** (`reconcileFoils` in `updateHud`), so every way of gaining a card counts without each one rolling separately.
- **Shared global names.** `rand(n)` and `timerBar` are defined in the mini-games section and used by later sections.

## 10. Open ideas and tuning notes

- Not done by choice: hand-designing the Harbor and Garden maps, and save export/import.
- Other ideas that came up: pass-and-play battles on one device, a longer story arc across districts, and district-specific music.
- Numbers to watch in playtesting:
  - Tidy Up's gold threshold (16 in 20 seconds) may be too generous.
  - The Harbor Keeper's tide is the strongest boss twist.
  - The Spellbook set bonus (+1 opening card) and stacked Shield charms (+Spirit at the start) are the strongest perks.
  - The bake time (6 minutes), crop times (5 to 40 minutes), Rook's 20-minute stay per district and the heart thresholds (3/7/12/18/25) are all single constants.
