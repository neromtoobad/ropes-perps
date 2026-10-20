// The edit. A 7-bar motion ad on "Tech House vibes" (Mixkit 130, 122.8 bpm), then the narrated
// walkthrough in the user's cloned voice over real footage of the live site.
//   node timeline.mjs -> timeline.js (index.html) + vo.json (mix.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const J = (f) => JSON.parse(readFileSync(f, 'utf8'));
const TAKES = ['land', 'play', 'bail', 'explorer'];
const takes = Object.fromEntries(TAKES.map((k) => [k, J(`clips/${k}.json`).frames.map((x) => +x.toFixed(4))]));
const ev = Object.fromEntries(TAKES.map((k) => [k, Object.fromEntries(J(`clips/${k}.json`).events.map((e) => [e.what, e.t]))]));
const dur = (f) => { const m = spawnSync('/Users/mac/.local/bin/ffmpeg', ['-i', f], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/); return +m[2] * 60 + +m[3]; };

const BEAT = 60 / 122.8, BAR = 4 * BEAT;
const AD_END = +(7 * BAR).toFixed(3); // 13.681

// narration, 0.6 s apart
const vo = []; let at = AD_END + 0.55;
for (let i = 1; i <= 8; i++) { const d = dur(`vo/f/n${i}.wav`); vo.push({ id: `n${i}`, t: +at.toFixed(3), d }); at += d + 0.6; }
const V = Object.fromEntries(vo.map((v) => [v.id, v]));
const b = (id) => V[id].t - 0.45;

const segs = []; let shot = 0;
const S = (take, t0, t1, s0, s1, cam, newShot = false) => {
  if (newShot || !segs.length) shot++;
  const sp = (s1 - s0) / (t1 - t0);
  segs.push({ take, t0: +t0.toFixed(3), t1: +t1.toFixed(3), s0, s1, cam, shot, speed: sp >= 1.6 ? Math.round(sp * 10) / 10 : 0 });
};
const C = (z, x, y, t = 0) => ({ t, z, x, y });
const W = C(1, 800, 450);
const P = ev.play, B = ev.bail;

// n1: the problem, over the landing page
S('land', AD_END, b('n2'), 0.2, 0.2 + (b('n2') - AD_END), [C(1.08, 800, 400), C(1.0, 800, 450, 6)], true);
// n2: a free seat, a pick, the climber riding
const n2 = b('n2');
S('play', n2, n2 + 2.6, P.climber - 3.5, P.climber + 0.5, [C(1.25, 800, 700)], true);
S('play', n2 + 2.6, n2 + 6.0, P.seat - 1.5, P.pick + 1.2, [C(1.2, 600, 650), C(1.3, 520, 640, 3)]);
S('play', n2 + 6.0, b('n3'), P.riding + 2, P.riding + 2 + (b('n3') - n2 - 6), [C(1.0, 800, 450), C(1.35, 640, 330, 3.5)]);
// n3: the contract is the market maker (callout, window slides right)
S('play', b('n3'), b('n4'), P.riding + 9, P.riding + 9 + (b('n4') - b('n3')), [C(1.15, 700, 380), C(1.3, 760, 300, 9)], true);
// n4: Elysium: rounds every minute in the explorer
// the txs list is clean for 3.5 s after it loads; the contract page from ~1 s after its navigation
S('explorer', b('n4'), b('n4') + 3.8, ev.explorer.txs + 0.1, ev.explorer.txs + 3.5, [C(1.25, 520, 420), C(1.35, 560, 470, 3.8)], true);
S('explorer', b('n4') + 3.8, b('n5'), ev.explorer.code + 0.9, ev.explorer.code + 0.9 + (b('n5') - b('n4') - 3.8), [C(1.3, 640, 360), C(1.4, 640, 520, 5)]);
// n5: BAIL, then ride to the bell
const n5 = b('n5');
S('bail', n5, n5 + 3.0, B.pick - 0.6, B.pick + 2.4, [C(1.2, 600, 640)], true);
S('bail', n5 + 3.0, n5 + 7.8, B.bail - 3.0, B.bail + 1.8, [C(1.15, 700, 520), C(1.35, 480, 760, 3)]);
S('bail', n5 + 7.8, n5 + 9.6, B.bail + 1.8, B.bail + 4.6, [C(1.3, 520, 760)]);
S('play', n5 + 9.6, b('n6'), P.bell1 - 4.5, P.bell1 - 4.5 + (b('n6') - n5 - 9.6), [C(1.0, 800, 450), C(1.25, 760, 480, 4)]);
// n6: the terminal (audit) — no footage
const T0 = b('n6'), T1 = b('n7');
// n7: roadmap cards over the blurred wall
const R0 = b('n7'), R1 = b('n8');
S('play', R0, R1, P.riding + 30, P.riding + 30 + (R1 - R0), [C(1.1, 800, 450)], true);
const end = { t0: b('n8') + 0.4 };
const total = +(V.n8.t + V.n8.d + 3.0).toFixed(3);

const callouts = [
  { id: 'day', t0: V.n1.t + 0.2, t1: V.n1.t + 3.4, eyebrow: 'hyperliquid prediction markets', big: 'Shortest one:|<em>a whole day</em>' },
  { id: 'min', t0: V.n1.t + 3.6, t1: b('n2') - 0.05, eyebrow: 'ROPES', big: 'One round|every <em>minute</em>' },
  { id: 'mm', t0: V.n3.t + 0.4, t1: b('n4') - 0.1, eyebrow: 'the contract is the market maker', big: 'Priced on chain|<em>every trade</em>',
    code: 'fair(UP) = <b>Φ( ln(S/K) ÷ σ√τ )</b>\n\nS  live Hyperliquid mark    K  strike\nτ  seconds left            σ  volatility\n\nbuy at fair + 1% · sell at fair − 1%' },
  { id: 'ely', t0: V.n4.t + 0.2, t1: b('n5') - 0.1, eyebrow: 'why elysium', big: '<em>~115 ms</em> blocks|0.1 gwei gas', code: 'openRound · buy · sell · settle · redeem\n// a live minute costs ≈ 0.00003 HYPE' },
  { id: 'bell', t0: V.n5.t + 10.0, t1: b('n6') - 0.1, eyebrow: 'the bell', big: 'The close is the|<em>next strike</em>', code: 'settle(id, close)\n  → pays the winners\n  → <b>scoreboard.onRoundSettled()</b>\n// same transaction' },
];

// n6 terminal: the REAL audit + test output, captured on this machine
const lines = (f, n) => readFileSync(f, 'utf8').replace(/\r/g, '').split('\n').filter((x) => x.trim()).slice(0, n);
const audit = lines('build/audit2.txt', 30);
const forge = lines('build/forge.txt', 60).filter((x) => /Suite result|tests passed/.test(x)).map((x) => x.replace(/ finished in .*$/, ''));
const term = {
  t0: T0, t1: T1,
  blocks: [
    { t: T0 + 0.6, cmd: 'npx tsx scripts/audit.ts', lines: audit, dur: 2.4 },
    { t: T0 + 7.6, cmd: 'forge test', lines: forge, dur: 0.8 },
  ],
  chips: [
    { t: T0 + 1.4, text: 'every strike & close = Hyperliquid’s own candle open' },
    { t: T0 + 4.6, text: 'checked for exact equality, by anyone' },
    { t: T0 + 9.6, text: 'a missed bell voids → everyone refunded' },
  ],
};

const road = {
  t0: R0, t1: R1,
  cards: [
    { t: R0 + 0.5, k: 'after mainnet', h: '$ROPES on Ascend', p: 'vault income buys it back · holders pick the next rope' },
    { t: V.n7.t + 5.4, k: 'HyperCore precompile', h: 'No keeper', p: 'strikes read straight from HyperCore' },
    { t: V.n7.t + 7.8, k: 'then', h: 'Open trading', p: 'anyone trades the minute' },
  ],
};

// the ad: real cuts on the beat between the type moments
const ad = {
  beat: BEAT, bar: BAR, end: AD_END,
  cuts: [
    { t0: 2 * BAR, t1: 2 * BAR + 2 * BEAT, take: 'play', s0: P.riding + 12, s1: P.riding + 13.4, z0: 1.55, z1: 1.7, x0: 640, x1: 640, y0: 330, y1: 300, lower: 'Ride the <em>minute</em>' },
    { t0: 2 * BAR + 2 * BEAT, t1: 3 * BAR, take: 'bail', s0: B.bail - 0.3, s1: B.bail + 1.2, z0: 1.5, z1: 1.65, x0: 520, x1: 520, y0: 700, y1: 720, lower: '<em>Bail</em> any second' },
    { t0: 3 * BAR, t1: 3 * BAR + 2 * BEAT, take: 'play', s0: P.bell1 - 0.6, s1: P.bell1 + 0.9, z0: 1.15, z1: 1.3, x0: 800, x1: 800, y0: 450, y1: 450, lower: 'Beat the <em>bell</em>' },
    { t0: 3 * BAR + 2 * BEAT, t1: 4 * BAR, take: 'play', s0: P.bell1 + 4.8, s1: P.bell1 + 6.4, z0: 1.4, z1: 1.55, x0: 520, x1: 520, y0: 770, y1: 770, lower: 'Stack the <em>wins</em>' },
  ],
};

// sound effects: whooshes into cuts, a tick on each kinetic word
const sfx = [
  ...[0, 1, 2, 3].map((i) => ({ kind: 'tick', t: i * BEAT * 2 })),
  { kind: 'hit', t: 2 * BAR },
  ...ad.cuts.map((c) => ({ kind: 'whoosh', t: c.t0 - 0.18 })),
  { kind: 'hit', t: 4 * BAR }, { kind: 'hit', t: 5 * BAR }, { kind: 'hit', t: 6 * BAR, vol: 0.6 },
  ...road.cards.map((c) => ({ kind: 'whoosh', t: c.t - 0.15, vol: 0.25 })),
  { kind: 'whoosh', t: end.t0 - 0.1, vol: 0.3 },
];

const CAP = J('captions.json');
writeFileSync('timeline.js', 'window.TL = ' + JSON.stringify({ takes, segs, callouts, vo, captions: CAP, term, road, end, total, ad }) + ';\n');
writeFileSync('vo.json', JSON.stringify({ vo, sfx, total, adEnd: AD_END, bar: BAR }, null, 1));
console.log('total', total, 's  ad', AD_END);
for (const v of vo) console.log(v.id, v.t.toFixed(2), '->', (v.t + v.d).toFixed(2));
for (const s of segs) console.log(s.shot, s.take.padEnd(8), s.t0.toFixed(2), s.t1.toFixed(2), '<-', s.s0.toFixed(1), s.s1.toFixed(1), s.speed ? s.speed + 'x' : '');
