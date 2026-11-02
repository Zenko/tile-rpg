/* ============================================================
   SKIN: EXAMPLE - a worked example of a reskin (build 330)
   ============================================================
   Open the game with ?skin=example to try it, ?skin= (or the pill's Exit button) to go back. Nothing here touches saves.
   Copy this file to start a new skin: give it a new file name, add that name to SKINS in js/game-config.js, and keep only
   the parts you change. Keys (square, baker, 'bread.basketFull', ...) are ids: change the values, never the keys.
   ============================================================ */
skin({
  title: 'Example',                                     // what the "Skin" pill says

  // ---- names (merged into js/game-config.js before any sentence is built) ----
  GAME: { title: 'Lantern Lane', currency: { one: 'Shell', many: 'Shells' } },
  PLACES: { square: 'Lantern Lane' },
  CAST: {
    guide: { name: 'Hazelle' },                        // the guide keeps her pronouns...
    baker: { name: 'Bram', pronouns: 'he' },           // ...the baker becomes "he": every "her rolls" now reads "his rolls"
  },

  // ---- one-off lines, by key (content/text.js) ----
  text: {
    'town.stepOutside': 'You step back out under the lanterns.',
  },

  // ---- anything else in content/, changed after it has loaded ----
  content() {
    STORY_INTRO.cards[1].text = 'Somewhere, a lantern hums a song you almost remember.';
  },
});
