// The edit. A 7-bar motion ad on "What About Action?" (Mixkit 474, 120.5 bpm), then the narrated
// walkthrough in the user's cloned voice over real footage of the live site.
//   node timeline.mjs -> timeline.js (index.html) + vo.json (mix.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const J = (f) => JSON.parse(readFileSync(f, 'utf8'));
const TAKES = ['crag', 'climb', 'leaders', 'explorer', 'feedback'];
const takes = Object.fromEntries(TAKES.map((k) => [k, J(`clips/${k}.json`).frames.map((x) => +x.toFixed(4))]));
const ev = Object.fromEntries(TAKES.map((k) => [k, Object.fromEntries(J(`clips/${k}.json`).events.map((e) => [e.what, e.t]))]));
const dur = (f) => { const m = spawnSync('/Users/mac/.local/bin/ffmpeg', ['-i', f], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/); return +m[2] * 60 + +m[3]; };

const BEAT = 60 / 120.5, BAR = 4 * BEAT;
const AD_END = +(7 * BAR).toFixed(3);

// narration, 0.55 s apart
const N = 9;
const vo = []; let at = AD_END + 0.55;
for (let i = 1; i <= N; i++) { const d = dur(`vo/f/n${i}.wav`); vo.push({ id: `n${i}`, t: +at.toFixed(3), d }); at += d + 0.55; }
const V = Object.fromEntries(vo.map((v) => [v.id, v]));
const b = (id) => V[id].t - 0.45;

const segs = []; let shot = 0;
const S = (take, t0, t1, s0, s1, cam, newShot = false) => {
  if (newShot || !segs.length) shot++;
  const sp = (s1 - s0) / (t1 - t0);
  segs.push({ take, t0: +t0.toFixed(3), t1: +t1.toFixed(3), s0, s1, cam, shot, speed: sp >= 1.6 ? Math.round(sp * 10) / 10 : 0 });
};
const C = (z, x, y, t = 0) => ({ t, z, x, y });
const G = ev.crag, P = ev.climb;

// n1 + n2: the Crag, live
S('crag', AD_END, b('n3'), 0.4, G.btc - 0.2, [C(1.0, 800, 450), C(1.15, 640, 520, 6), C(1.0, 800, 450, 14)], true);
// n3: Reactivity keeps it live; the liquidations falling (real, ~11-14 s into the take)
S('crag', b('n3'), b('n4'), G.btc + 0.4, G.btc + 0.4 + (b('n4') - b('n3')) * 0.8, [C(1.2, 640, 560), C(1.35, 600, 640, 6)], true);
// n4: tap a climber, TIE IN
S('crag', b('n4'), b('n5'), G.pick - 0.6, G.tied + 1.5, [C(1.15, 700, 600), C(1.3, 760, 640, 3), C(1.2, 1000, 520, 4.6)], true);
// n5: the climbing key, linked
S('climb', b('n5'), b('n6'), 0.2, 0.2 + Math.min(4.2, (b('n6') - b('n5')) * 0.5), [C(1.3, 800, 260), C(1.42, 800, 290, 6)], true);
// n6: pick a route, CLIMB, the climber live
const n6 = b('n6');
S('climb', n6, n6 + 4.2, P.route, P.climb + 0.6, [C(1.3, 800, 520), C(1.45, 800, 640, 3.5)], true);
S('climb', n6 + 4.2, b('n7'), P.riding + 0.5, P.riding + 0.5 + (b('n7') - n6 - 4.2), [C(1.0, 800, 450), C(1.35, 640, 380, 5)]);
// n7: BAIL, the result, the board, the explorer
const n7 = b('n7');
S('climb', n7, n7 + 4.4, P.bail - 1.8, P.result + 1.8, [C(1.4, 1300, 360), C(1.25, 800, 330, 2.2)], true);
S('leaders', n7 + 4.4, n7 + 7.6, 0.8, 4.0, [C(1.35, 760, 300), C(1.45, 760, 300, 3)], true);
S('explorer', n7 + 7.6, b('n8'), 0.5, 0.5 + (b('n8') - n7 - 7.6), [C(1.3, 640, 400), C(1.42, 600, 430, 4)], true);
// n8: the feedback folder
S('feedback', b('n8'), b('n9'), 0.2, 0.2 + (b('n9') - b('n8')), [C(1.3, 900, 420), C(1.45, 900, 520, 6)], true);
const end = { t0: b('n9') + 0.4 };
const total = +(V.n9.t + V.n9.d + 3.0).toFixed(3);

const react = readFileSync('build/react.txt', 'utf8').split('\n').filter(Boolean);
const crag = J('assets/crag.json');
const callouts = [
  { id: 'body', t0: V.n1.t + 0.1, t1: b('n2') - 0.05, eyebrow: 'perps you can see', big: 'A number|→ a <em>body</em>' },
  { id: 'crag', t0: V.n2.t + 0.3, t1: b('n3') - 0.1, eyebrow: 'the crag · live', big: `${crag.total.toLocaleString('en-US')}|open <em>perps</em>`, code: 'one position  = one climber\nheight        = return on margin\nthe floor     = margin gone (−100%)' },
  { id: 'react', t0: V.n3.t + 0.3, t1: b('n4') - 0.1, eyebrow: 'somnia reactivity · somnia_watch', big: 'Live to the|<em>block</em>', code: react.slice(0, 5).map((l) => l.replace(/^\+\S+\s+/, '')).join('\n') + '\n<b>' + react.at(-1) + '</b>' },
  { id: 'key', t0: V.n5.t + 0.3, t1: b('n6') - 0.1, eyebrow: 'link a bot · your key, your account', big: 'Trades for you|never <em>withdraws</em>', code: 'placeOrderFor    <b>✓</b>\ncancelOrderFor   <b>✓</b>\nwithdraw         ✗  owner only' },
  { id: 'fb', t0: V.n8.t + 0.2, t1: b('n9') - 0.1, eyebrow: 'feedback track', big: '16 reports|<em>reproducible</em>', code: 'voucher claim() reverts, eligibility says yes\npaper USDso allowed in "blocked" markets\nsizing helpers approve off-grid orders\nperp orders cost 6–75× the docs' },
];

const term = { t0: -10, t1: -9, blocks: [], chips: [] };
const road = { t0: -10, t1: -9, cards: [] };

// the ad: real cuts on the beat after the Crag builds itself
const ad = {
  beat: BEAT, bar: BAR, end: AD_END,
  cuts: [
    { t0: 4 * BAR, t1: 4 * BAR + 2 * BEAT, take: 'crag', s0: G.btc + 1.2, s1: G.btc + 2.6, z0: 1.3, z1: 1.45, x0: 620, x1: 620, y0: 560, y1: 600, lower: 'Watch them <em>fall</em>' },
    { t0: 4 * BAR + 2 * BEAT, t1: 5 * BAR, take: 'climb', s0: P.climb - 0.6, s1: P.climb + 0.6, z0: 1.5, z1: 1.65, x0: 800, x1: 800, y0: 700, y1: 720, lower: 'Rope <em>up</em>' },
    { t0: 5 * BAR, t1: 5 * BAR + 2 * BEAT, take: 'climb', s0: P.riding + 14, s1: P.riding + 15.6, z0: 1.4, z1: 1.6, x0: 620, x1: 620, y0: 420, y1: 400, lower: 'Climb on <em>leverage</em>' },
    { t0: 5 * BAR + 2 * BEAT, t1: 6 * BAR, take: 'climb', s0: P.bail - 0.5, s1: P.bail + 1.1, z0: 1.45, z1: 1.6, x0: 1300, x1: 1300, y0: 360, y1: 360, lower: '<em>Bail</em> in one tap' },
  ],
};

// sound effects: ticks on the table rows and kinetic words, hits on the drops, whooshes into cuts
const sfx = [
  ...[0, 1, 2, 3].map((i) => ({ kind: 'tick', t: i * BEAT * 2 })),
  { kind: 'hit', t: 2 * BAR },
  { kind: 'whoosh', t: 2 * BAR + 2 * BEAT - 0.2, vol: 0.35 },
  { kind: 'hit', t: 2 * BAR + 2 * BEAT + 1.25, vol: 0.45 },
  ...ad.cuts.map((c) => ({ kind: 'whoosh', t: c.t0 - 0.18 })),
  { kind: 'hit', t: 4 * BAR }, { kind: 'hit', t: 6 * BAR, vol: 0.6 },
  { kind: 'whoosh', t: end.t0 - 0.1, vol: 0.3 },
];

const CAP = J('captions.json');
writeFileSync('timeline.js', 'window.TL = ' + JSON.stringify({ takes, segs, callouts, vo, captions: CAP, term, road, end, total, ad, crag }) + ';\n');
writeFileSync('vo.json', JSON.stringify({ vo, sfx, total, adEnd: AD_END, bar: BAR }, null, 1));
console.log('total', total, 's  ad', AD_END);
for (const v of vo) console.log(v.id, v.t.toFixed(2), '->', (v.t + v.d).toFixed(2));
for (const s of segs) console.log(s.shot, s.take.padEnd(8), s.t0.toFixed(2), s.t1.toFixed(2), '<-', s.s0.toFixed(1), s.s1.toFixed(1), s.speed ? s.speed + 'x' : '');
