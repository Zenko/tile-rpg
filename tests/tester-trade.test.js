// Trading cards between testers (build 336), against a pretend Firestore: an offer holds your card, arrives as a letter, a yes swaps
// both cards (only spares), a no or a cancel brings your card home, and the trade sheet opens from Who's Playing.
module.exports = async (page, assert) => {
  const r = await page.evaluate(async () => {
    const store = {}; let n = 0;
    const docRef = id => ({ id, get: async () => ({ exists: !!store[id], data: () => store[id] }), delete: async () => { delete store[id]; }, update: async d => { Object.assign(store[id], d); } });
    const coll = () => ({
      add: async d => { const id = 't' + (++n); store[id] = JSON.parse(JSON.stringify(d)); return { id }; },
      doc: docRef,
      where: (f, op, v) => ({ limit: () => ({ get: async () => ({ docs: Object.keys(store).filter(k => store[k][f] === v).map(k => ({ id: k, data: () => store[k], ref: docRef(k) })) }) }) })
    });
    cloudDb = { collection: coll, runTransaction: async fn => fn({ get: ref => ref.get(), update: (ref, d) => { Object.assign(store[ref.id], d); }, delete: ref => { delete store[ref.id]; } }) };
    cloudReady = true; prefs.sharePresence = true; ensureLevel().level = 20;
    const out = {};
    const pool = CARD_POOL.filter(c => !c.exclusive && !c.spell);
    const A = pool[0].id, B = pool[1].id;
    // "me" has three of A (one is spare beyond a deck of 12 that holds 2 of it)
    cloudUser = { uid: 'me' }; state.character.name = 'Tester A';
    state.ownedCards = []; state.deck = pool.slice(0, 6).flatMap(c => [c.id, c.id]); state.deck.forEach(id => state.ownedCards.push(id)); state.ownedCards.push(A);
    out.mySpares = ttSpareList();
    const countA0 = state.ownedCards.filter(x => x === A).length;
    out.sent = await ttSend({ id: 'them', name: 'Tester B', spares: [B] }, A, B);
    out.held = countA0 - state.ownedCards.filter(x => x === A).length;
    out.doc = JSON.parse(JSON.stringify(Object.values(store)[0]));
    out.twice = await ttSend({ id: 'them', name: 'Tester B', spares: [B] }, A, B);   // one offer per tester
    // now I am "them": the offer arrives as a letter; "them" owns a spare B
    const mine = state.ownedCards.slice(), myDeck = state.deck.slice(), myOut = JSON.parse(JSON.stringify(ttOutState()));
    cloudUser = { uid: 'them' }; state.progress.ttOut = {};
    state.ownedCards = state.deck.slice().concat([B, B, B]);
    out.got = await ttFetch(true);
    const l = mailState().list.find(x => /^tt-/.test(x.id));
    out.letter = !!l && !!l.tt; out.html = l ? ttLetterHtml(l) : '';
    const b0 = state.ownedCards.filter(x => x === B).length, a0 = state.ownedCards.filter(x => x === A).length;
    await ttAnswer(l.id, true);
    out.themGaveB = b0 - state.ownedCards.filter(x => x === B).length;
    out.themGotA = state.ownedCards.filter(x => x === A).length - a0;
    out.status = store[Object.keys(store)[0]].status;
    out.again = l.tt.done;
    // back to "me": settling brings B in and clears the offer
    cloudUser = { uid: 'me' }; state.ownedCards = mine; state.deck = myDeck; state.progress.ttOut = myOut;
    const bMe = state.ownedCards.filter(x => x === B).length;
    await ttSettle(true);
    out.meGotB = state.ownedCards.filter(x => x === B).length - bMe;
    out.outLeft = Object.keys(ttOutState()).length; out.storeLeft = Object.keys(store).length;
    // a declined offer brings the card home
    state.ownedCards.push(A);
    const aBefore = state.ownedCards.filter(x => x === A).length;
    await ttSend({ id: 'other', name: 'Tester C', spares: [B] }, A, B);
    const id2 = Object.keys(store)[0]; store[id2].status = 'declined';
    await ttSettle(true);
    out.declinedBack = state.ownedCards.filter(x => x === A).length === aBefore;
    // a cancel brings the card home and removes the offer
    await ttSend({ id: 'other', name: 'Tester C', spares: [B] }, A, B);
    const id3 = Object.keys(ttOutState())[0];
    await ttCancel(id3);
    out.cancelBack = state.ownedCards.filter(x => x === A).length === aBefore && !store[id3] && !ttOutState()[id3];
    return out;
  });
  assert.ok(Array.isArray(r.mySpares) && r.mySpares.length >= 1, 'a spare is offered: ' + JSON.stringify(r.mySpares));
  assert.strictEqual(r.sent, true); assert.strictEqual(r.held, 1, 'the offered card is held while they decide');
  assert.strictEqual(r.doc.to, 'them'); assert.strictEqual(r.doc.status, 'open');
  assert.strictEqual(r.twice, false, 'one offer per tester at a time');
  assert.strictEqual(r.got, 1); assert.ok(r.letter); assert.ok(/ttyes:/.test(r.html), 'the letter has a Yes button');
  assert.strictEqual(r.themGaveB, 1); assert.strictEqual(r.themGotA, 1); assert.strictEqual(r.status, 'accepted'); assert.strictEqual(r.again, 'yes');
  assert.strictEqual(r.meGotB, 1, 'an accepted offer delivers their card'); assert.strictEqual(r.outLeft, 0); assert.strictEqual(r.storeLeft, 0);
  assert.ok(r.declinedBack, 'a declined offer returns the card'); assert.ok(r.cancelBack, 'a cancelled offer returns the card');
  // the sheet opens and lists both sides
  const ui = await page.evaluate(() => { ttOpen({ id: 'x', name: 'Tester X', spares: [CARD_POOL[2].id, CARD_POOL[3].id] });
    const o = { shown: !document.getElementById('ttOverlay').classList.contains('hidden'), want: document.querySelectorAll('#ttCard [data-tt^="want:"]').length, send: !!document.querySelector('#ttCard [data-tt="send:"][disabled]') };
    ttClose(); return o; });
  assert.ok(ui.shown); assert.strictEqual(ui.want, 2); assert.ok(ui.send, 'Send stays off until both cards are picked');
};
