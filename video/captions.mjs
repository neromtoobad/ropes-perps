// Caption chunks for the narration: the SCRIPT's words (not Whisper's mishearings), timed from
// Whisper's word timestamps on the final takes.   node captions.mjs -> captions.json
import { readFileSync, writeFileSync } from 'node:fs';
export const LINES = {
  n1: 'Hyperliquid has prediction markets. The shortest one lasts a day. Nothing trades at the speed of a minute.',
  n2: 'So I built ROPES, on Elysium. Every minute, a round opens at the live HYPE price. Pick up or down, and your climber is your position, second by second.',
  n3: 'There is no order book to wait on. The contract itself is the market maker. On every trade, it prices the round from the Hyperliquid mark, the time left, and the volatility, plus a one percent spread, which the house vault keeps.',
  n4: 'That only works on Elysium. Re-pricing an option on every trade needs blocks a tenth of a second apart, that cost next to nothing.',
  n5: 'Bail any second, and the contract buys you out at the current price. Or ride to the bell: the closing price settles the round, updates the on-chain scoreboard in the same transaction, and becomes the next round’s strike.',
  n6: 'Until the HyperCore precompile ships, a keeper relays the price. So every price is on-chain, an audit checks each one against Hyperliquid’s own candles, and a missed bell refunds everyone.',
  n7: 'After mainnet, the ROPES token launches through Ascend. Vault income buys it back, and holders pick the next rope. Then the precompile replaces the keeper, and trading opens to everyone.',
  n8: 'ROPES. One minute of Hyperliquid, on a rope. Take a free seat at ropes.nerom.site',
};
const out = {};
for (const [id, text] of Object.entries(LINES)) {
  const w = JSON.parse(readFileSync(`vo/wh/${id}.json`, 'utf8')).segments.flatMap((s) => s.words || []).map((x) => ({ start: x.start, end: x.end }));
  const mine = text.split(/\s+/);
  const chunks = []; let cur = [];
  mine.forEach((x, i) => { cur.push(i); if (/[.?!:]$/.test(x) || (/,$/.test(x) && cur.length >= 4)) { chunks.push(cur); cur = []; } });
  if (cur.length) chunks.push(cur);
  for (let k = 0; k < chunks.length; k++) if (chunks[k].length > 9) { const h = Math.ceil(chunks[k].length / 2); chunks.splice(k, 1, chunks[k].slice(0, h), chunks[k].slice(h)); k--; }
  const at = (i) => w[Math.min(w.length - 1, Math.round(i * (w.length - 1) / Math.max(1, mine.length - 1)))];
  out[id] = chunks.map((c) => ({ text: c.map((i) => mine[i]).join(' ').replace(/[.]$/, ''), a: at(c[0]).start, b: at(c[c.length - 1]).end }));
}
writeFileSync('captions.json', JSON.stringify(out, null, 1));
console.log(Object.values(out).flat().length, 'chunks');
