# Card art

Drop-in art for the cards. Every card currently shows an emoji; any card that has a picture shows the picture instead,
everywhere the card appears (hand, board, packs, Index, deck builder, reveals). Cards without art keep their emoji, so
you can do this a few cards at a time.

The full to-do list, rarest first, is in [ART-LIST.md](ART-LIST.md).

## Spec

| | |
|---|---|
| Size | **512 × 512 px**, square (the game shows it at 1em, from about 16px up to 64px) |
| Format | PNG with a **transparent background** (no card frame - the game draws the rarity-coloured card around it) |
| Safe area | Keep the subject inside the central ~80%; leave a little breathing room at the edges |
| Style | Bold, simple silhouettes read best at small sizes. Test it at 32px |
| Backgrounds it sits on | Teal (common), purple (rare), blue (ultra), gold (super), pink (mythic) gradients, light *and* dark theme. Avoid pure white or very pale fringes |
| Weight | Aim for under ~60 KB each (Figma's PNG export is fine; run it through any PNG optimiser if larger) |
| File name | `<card id>.png`, exactly as listed in ART-LIST.md (e.g. `aurora-stag.png`) |

## Figma workflow

1. One 512 × 512 frame per card, named with the card id.
2. Select the frames, Export → PNG → 1x, then drop the files into this folder.
3. Add each finished id to the `CARD_ART` list in `js/data-and-engine.js` (search for `const CARD_ART`):

   ```js
   const CARD_ART = ['aurora-stag', 'deep-current', 'mountain-heart'];
   ```

   That is the only code change. Nothing else needs editing, and the emoji stays as the fallback for everything not listed.
4. Publish as usual. The service worker saves each picture the first time it is seen, so art works offline after that.

## Notes

- Opponent-only cards (in `FOE_CARDS`) and the Seedling token can have art too - they are on the list at the bottom.
- The opponent-only Ember Fox is now called **Cinder Fox** (`cinder-fox`) so it no longer clashes with the collectible
  **Ember Fox** (`ember-fox`).
- The art is also used in the small spell flash and reveal screens, so a spell card's picture should feel like an effect, not a creature.
