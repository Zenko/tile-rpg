/* ============================================================
   WHO GOES FIRST (v1.81.0)
   Before every match (puzzles excepted - their board is already mid-turn) a small overlay decides who takes the first
   turn: you call a coin (Sun or Moon) or you and the opponent each roll a die and the higher roll wins. The winner goes
   first; the other seat gets the catch-up bonus (+1 card, +1 energy early) that BattleEngine already hands to "second".
   startBattle() (js/battle-ui.js) waits on btTossFirst(), which resolves to 0 (you) or 1 (them), and passes that on as
   startBattleNow(opponent, first) -> BattleEngine.newGame(..., { first }).
   prefs.tossStyle: 'mix' (default: coin or dice at random), 'coin', 'dice' or 'skip' (no ceremony, just a random result).
   Reduced motion keeps the ceremony but drops the animation, so nothing waits on a spinning coin.
   ============================================================ */
const TOSS_STYLES = ['mix', 'coin', 'dice', 'skip'];
let tossBusy = false;
const tossEl = id => document.getElementById(id);
// Pauses shrink with Fast battles and with reduced motion, so the toss never becomes the slow part of a match.
const tossWait = ms => new Promise(r => setTimeout(r, !btMotionOk() ? Math.min(ms, 250) : prefs.fast ? ms * 0.55 : ms));
// Pip positions on a 3x3 grid for each die face.
const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function dieFaceHtml(v) {
  const on = DIE_PIPS[v] || [];
  let h = '';
  for (let i = 0; i < 9; i++) h += `<i class="${on.includes(i) ? 'pip' : ''}"></i>`;
  return h;
}

function btTossFirst(opponent) {
  const style = TOSS_STYLES.includes(prefs.tossStyle) ? prefs.tossStyle : 'mix';
  const coinFlip = () => (Math.random() < 0.5 ? 0 : 1);
  if (style === 'skip') return Promise.resolve(coinFlip());
  const kind = style === 'mix' ? (Math.random() < 0.5 ? 'coin' : 'dice') : style;
  tossBusy = true;
  return new Promise(resolve => {
    const ov = tossEl('tossOverlay'), stage = tossEl('tossStage'), btns = tossEl('tossBtns'), res = tossEl('tossResult');
    const name = opponent.name || 'They';
    const me = tossEl('tossYouAv'); applyAvatarStyle(me, state.character); setAvFace(me, state.character);
    tossEl('tossOppAv').textContent = opponentPortrait(opponent);
    tossEl('tossYouName').textContent = state.character.name || 'You';
    tossEl('tossOppName').textContent = name;
    res.textContent = ''; res.className = 'toss-result';
    let settled = false, timer = 0;
    const leave = first => {
      if (settled) return; settled = true; clearTimeout(timer);
      ov.removeEventListener('pointerdown', onTap);
      ov.classList.add('hidden'); tossBusy = false;
      resolve(first);
    };
    let outcome = null;
    const onTap = () => { if (outcome !== null) leave(outcome); };           // a tap after the result skips the wait
    // The result is shown for a beat, then the match carries on (or sooner, on a tap).
    const conclude = async (first, msg) => {
      outcome = first;
      res.textContent = msg; res.classList.add(first === 0 ? 'win' : 'lose');
      if (first === 0) { bumpStat('tossWins'); sfx('win'); buzz(HAP.win); } else { sfx('soft'); buzz(HAP.soft); }
      btns.innerHTML = '';
      ov.addEventListener('pointerdown', onTap);
      timer = setTimeout(() => leave(first), btMotionOk() ? 1700 : 900);
    };

    // A "let fate decide" link on both toss kinds, for the player who just wants to get on with it.
    const fateBtn = () => `<button class="btn btn-ghost toss-fate" data-fate="1">Let fate decide</button>`;

    if (kind === 'coin') {
      tossEl('tossTitle').textContent = 'Call the coin';
      tossEl('tossSub').textContent = 'Win the toss and you play first.';
      stage.innerHTML = `<div class="toss-coin" id="tossCoin"><div class="coin-face front">🌞</div><div class="coin-face back">🌙</div></div><div class="toss-shadow"></div>`;
      btns.innerHTML = `<button class="btn" data-call="sun">🌞 Sun</button><button class="btn" data-call="moon">🌙 Moon</button>` + fateBtn();
      const flip = async call => {
        btns.querySelectorAll('button').forEach(b => { b.disabled = true; });
        const landed = Math.random() < 0.5 ? 'sun' : 'moon', coin = tossEl('tossCoin');
        const deg = 360 * 5 + (landed === 'moon' ? 180 : 0), word = w => (w === 'sun' ? 'Sun' : 'Moon');
        sfx('flip'); buzz(HAP.tap);
        if (btMotionOk()) {
          const ms = 1500 * (prefs.fast ? 0.6 : 1);
          try {
            await coin.animate([
              { transform: 'translateY(0) rotateX(0deg)' },
              { transform: `translateY(-96px) rotateX(${deg / 2}deg)`, offset: 0.45 },
              { transform: `translateY(0) rotateX(${deg}deg)` }
            ], { duration: ms, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }).finished;
          } catch (e) { /* cancelled: fall through to the settled state */ }
        }
        coin.style.transform = `rotateX(${deg}deg)`;
        sfx('tap');
        const won = call === landed;
        conclude(won ? 0 : 1, won ? `It's ${word(landed)}! You go first.` : `It's ${word(landed)}. ${name} goes first.`);
      };
      btns.addEventListener('click', function h(e) {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        btns.removeEventListener('click', h);
        flip(b.dataset.fate ? (Math.random() < 0.5 ? 'sun' : 'moon') : b.dataset.call);
      });
    } else {
      tossEl('tossTitle').textContent = 'Roll for first turn';
      tossEl('tossSub').textContent = 'Highest roll plays first. A tie rolls again.';
      stage.innerHTML = `<div class="toss-dice"><div class="toss-die-wrap"><div class="die" id="tossDieYou">${dieFaceHtml(6)}</div><span>You</span></div>
        <div class="toss-die-wrap"><div class="die" id="tossDieOpp">${dieFaceHtml(6)}</div><span class="toss-die-name"></span></div></div>`;
      stage.querySelector('.toss-die-name').textContent = name;
      btns.innerHTML = `<button class="btn" data-roll="1">🎲 Roll!</button>` + fateBtn();
      const youDie = () => tossEl('tossDieYou'), oppDie = () => tossEl('tossDieOpp');
      const roll = async () => {
        btns.querySelectorAll('button').forEach(b => { b.disabled = true; });
        for (let round = 0; round < 6; round++) {          // ties re-roll; six is a generous cap before just picking
          const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
          buzz(HAP.tap);
          if (btMotionOk()) {
            const t0 = Date.now(), dur = 950 * (prefs.fast ? 0.6 : 1);
            youDie().classList.add('rolling'); oppDie().classList.add('rolling');
            let n = 0;
            while (Date.now() - t0 < dur) {
              youDie().innerHTML = dieFaceHtml(1 + Math.floor(Math.random() * 6)); oppDie().innerHTML = dieFaceHtml(1 + Math.floor(Math.random() * 6));
              if (n++ % 3 === 0) sfx('click');
              await new Promise(r => setTimeout(r, 85));
            }
            youDie().classList.remove('rolling'); oppDie().classList.remove('rolling');
          }
          youDie().innerHTML = dieFaceHtml(a); oppDie().innerHTML = dieFaceHtml(b);
          sfx('tap');
          if (a !== b) {
            conclude(a > b ? 0 : 1, a > b ? `${a} to ${b} - you go first!` : `${b} to ${a}. ${name} goes first.`);
            return;
          }
          res.textContent = `Both rolled ${a} - roll again!`; sfx('tie');
          await tossWait(900);
          res.textContent = '';
        }
        conclude(coinFlip(), 'A tie of ties - fate picks.');
      };
      btns.addEventListener('click', function h(e) {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        btns.removeEventListener('click', h);
        if (b.dataset.fate) { btns.querySelectorAll('button').forEach(x => { x.disabled = true; }); const w = coinFlip(); const a = w === 0 ? 5 : 2, c = w === 0 ? 2 : 5; youDie().innerHTML = dieFaceHtml(a); oppDie().innerHTML = dieFaceHtml(c); conclude(w, w === 0 ? 'Fate says you go first.' : `Fate says ${name} goes first.`); }
        else roll();
      });
    }
    ov.classList.remove('hidden');
  });
}

// Settings: how the toss is played.
function syncTossSeg() {
  document.querySelectorAll('#tossSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tossPick === (TOSS_STYLES.includes(prefs.tossStyle) ? prefs.tossStyle : 'mix')));
}
document.querySelectorAll('#tossSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  prefs.tossStyle = b.dataset.tossPick; savePrefs(); syncTossSeg(); sfx('tap');
}));
syncTossSeg();
