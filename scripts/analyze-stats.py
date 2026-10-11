#!/usr/bin/env python3
"""Turn an export of the Firebase 'stats' collection into a tuning report for the AI systems (js/telemetry.js).

Usage:  python3 scripts/analyze-stats.py stats-export.json [--min-cards 20]

The export may be a JSON list of documents, or an object keyed by document id (what the Firebase console / a gcloud export gives you). Only the
`ai` block of each document is read; documents without one (older builds) are counted and skipped. Everything is anonymous counters.

The report flags things to look at, it does not decide anything:
  - cards that win far more or less often than the average when they are in your deck (needs --min-cards matches, default 20),
  - play styles whose win rate against players is far from the plain AI's,
  - whether adaptive difficulty works: players should win MORE when the tilt is negative (opponent eased) and LESS when it is positive,
  - how welcome neighbour approaches are, how often the coach speaks and about what, daily event mix, stories, Rook.
"""
import json, sys, argparse
from collections import defaultdict


def load(path):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    docs = list(data.values()) if isinstance(data, dict) else list(data)
    out = []
    for d in docs:
        if isinstance(d, dict) and isinstance(d.get('fields'), dict):   # raw Firestore REST shape: not supported, say so once
            raise SystemExit('This looks like a raw Firestore REST export (a "fields" wrapper). Export plain JSON documents instead.')
        out.append(d)
    return out


def wl(d):
    d = d or {}
    return int(d.get('w', 0) or 0), int(d.get('l', 0) or 0)


def rate(w, l):
    return w / (w + l) if (w + l) else None


def pct(x):
    return 'n/a' if x is None else f'{x * 100:.0f}%'


def merge_wl(docs, group):
    total = defaultdict(lambda: [0, 0])
    for d in docs:
        for k, v in ((d.get('ai') or {}).get(group) or {}).items():
            w, l = wl(v)
            total[k][0] += w
            total[k][1] += l
    return total


def report(docs, min_cards=20, out=print):
    with_ai = [d for d in docs if isinstance(d, dict) and d.get('ai')]
    out(f'Players in export: {len(docs)}   with AI counters: {len(with_ai)}   (older builds have none)')
    if not with_ai:
        return {'flags': []}
    flags = []
    builds = defaultdict(int)
    for d in with_ai:
        builds[d.get('build', '?')] += 1
    out('Builds: ' + ', '.join(f'{b} x{n}' for b, n in sorted(builds.items(), key=lambda x: str(x[0]))))

    # --- matches by opponent kind ---
    out('\nPlayer win rate by opponent kind')
    kinds = merge_wl(with_ai, 'kinds')
    for k, (w, l) in sorted(kinds.items()):
        out(f'  {k:10} {pct(rate(w, l)):>5}   ({w + l} matches)')

    # --- play styles ---
    out('\nPlayer win rate by opponent play style (the plain AI is the baseline)')
    styles = merge_wl(with_ai, 'styles')
    base = rate(*styles['plain']) if 'plain' in styles else None
    for k, (w, l) in sorted(styles.items()):
        r = rate(w, l)
        note = ''
        if base is not None and r is not None and k != 'plain' and (w + l) >= 30 and abs(r - base) > 0.12:
            note = '   <-- far from plain'
            flags.append(f'style {k}: player win rate {pct(r)} vs plain {pct(base)}')
        out(f'  {k:10} {pct(r):>5}   ({w + l} matches){note}')

    # --- adaptive difficulty ---
    out('\nPlayer win rate by adaptive tilt (negative = opponent eased, positive = opponent pushed)')
    tilt = merge_wl(with_ai, 'tilt')
    series = []
    for k in sorted(tilt, key=lambda x: int(x)):
        w, l = tilt[k]
        series.append((int(k), rate(w, l), w + l))
        out(f'  tilt {int(k):+d}   {pct(rate(w, l)):>5}   ({w + l} matches)')
    usable = [(k, r) for k, r, n in series if r is not None and n >= 20]
    if len(usable) >= 2 and usable[0][1] is not None and usable[-1][1] is not None and usable[0][1] < usable[-1][1]:
        flags.append('adaptive tilt: players win LESS when the opponent is eased than when it is pushed (check the tilt direction)')
        out('  <-- unexpected: the eased matches are not easier')

    # --- cards ---
    cards = defaultdict(lambda: [0, 0])
    for d in with_ai:
        for cid, v in ((d['ai'].get('cards')) or {}).items():
            cards[cid][0] += int(v.get('p', 0) or 0)
            cards[cid][1] += int(v.get('w', 0) or 0)
    played = sum(p for p, w in cards.values())
    won = sum(w for p, w in cards.values())
    avg = (won / played) if played else None
    out(f'\nCards in the deck for {min_cards}+ matches ({len(cards)} cards seen). Overall win rate with a card in the deck: {pct(avg)}')
    rows = sorted(((w / p, cid, p) for cid, (p, w) in cards.items() if p >= min_cards), reverse=True)
    if rows:
        out('  Highest:')
        for r, cid, p in rows[:8]:
            out(f'    {cid:24} {pct(r):>5}  ({p} matches)')
        out('  Lowest:')
        for r, cid, p in rows[-8:][::-1]:
            out(f'    {cid:24} {pct(r):>5}  ({p} matches)')
        for r, cid, p in rows:
            if avg is not None and r > avg + 0.15:
                flags.append(f'card {cid} may be too strong: {pct(r)} vs {pct(avg)} average ({p} matches)')
            elif avg is not None and r < avg - 0.15:
                flags.append(f'card {cid} may be too weak: {pct(r)} vs {pct(avg)} average ({p} matches)')

    # --- systems ---
    def total(path):
        t = 0
        for d in with_ai:
            o = d['ai']
            for part in path.split('.'):
                o = (o or {}).get(part) if isinstance(o, dict) else None
            t += int(o or 0)
        return t

    out('\nNeighbours coming to you')
    s, a, i = total('approach.started'), total('approach.accepted'), total('approach.ignored')
    out(f'  started {s}   accepted {a} ({pct(a / s if s else None)})   ignored {i} ({pct(i / s if s else None)})')
    if s >= 20 and a / s < 0.3:
        flags.append(f'approaches: only {pct(a / s)} are accepted, consider making them rarer or more useful')
    out('  by kind accepted: ' + ', '.join(f'{k} {total("approach." + k)}' for k in ('help', 'social', 'match')))

    out('\nCoach tips shown after a loss: ' + str(total('coach.shown')) + '   (' + ', '.join(f'{k} {total("coach." + k)}' for k in ('unspent', 'firstIdle', 'idle', 'heavy', 'noSpells')) + ')')
    out('Adaptive difficulty nudges: eased ' + str(total('adapt.eased')) + ', pushed ' + str(total('adapt.pushed')))
    out('Neighbour encounters: ' + ', '.join(f'{k} {total("meet." + k)}' for k in ('chat', 'gift', 'tip', 'match')))
    out(f'Messages delivered: {total("stories.delivered")}   Rook duels studied: {total("rook.duels")}   with counters: {total("rook.counters")}')
    ev = defaultdict(int)
    for d in with_ai:
        for k, v in ((d['ai'].get('events')) or {}).items():
            ev[k] += int(v or 0)
    if ev:
        out('Daily events picked: ' + ', '.join(f'{k} {n}' for k, n in sorted(ev.items(), key=lambda x: -x[1])))

    out('\nFlags' + (':' if flags else ': none'))
    for f in flags:
        out('  - ' + f)
    return {'flags': flags}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('export')
    ap.add_argument('--min-cards', type=int, default=20)
    args = ap.parse_args()
    report(load(args.export), args.min_cards)
