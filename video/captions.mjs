// Caption chunks for the narration: the SCRIPT's words (not Whisper's mishearings), timed from
// Whisper's word timestamps on the final takes.   node captions.mjs -> captions.json
import { readFileSync, writeFileSync } from 'node:fs';
export const LINES = {
  n1: 'A perps terminal gives you a number. ROPES gives you a body.',
  n2: 'This is the Crag. Every open perp on dreamDEX, more than ten thousand of them, drawn as a climber. Height is the return on margin. The floor is where the margin runs out.',
  n3: 'One Somnia Reactivity stream on the MarginBank keeps the whole wall live. So when a trader gets liquidated, you watch them fall.',
  n4: 'Tap any climber to see their route, then tie in, to climb the same line from your own account.',
  n5: 'To climb, ROPES makes a key in your browser. You add it in dreamDEX with Link a bot. It can trade for you, but it can never withdraw.',
  n6: 'Pick a market, up or down, a rope, and a stake. Your climber is your position, live. The anchor bails you out before the fall, and the summit banks the win.',
  n7: 'BAIL closes at market, in one tap. Every climb is a real order on dreamDEX, on the board with its transactions. And every BAIL counts toward your Perps Arena trades.',
  n8: 'Along the way, we filed sixteen reproducible reports on the perps SDK, the API, and the docs.',
  n9: 'ROPES. Every perp is a climber. Rope up at ropesperps.nerom.site',
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
