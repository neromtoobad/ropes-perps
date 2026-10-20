// Soundtrack: the motion ad on "What About Action?" (Mixkit 474; its drop at 63.470 s lands on the ad's
// "MAKE IT A BODY" slam, 2 bars in), then "Close Up" (Mixkit 1167) under the narration, ducked by it.
// Voice: no limiter. A gentle compressor, then one linear gain to about -15 LUFS with true peak <= -1.5 dBTP.
//   node mix.mjs -> out/mix.wav, and muxes out/silent.mp4 into ../ropes-demo.mp4
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const FF = '/Users/mac/.local/bin/ffmpeg';
const run = (a) => { const r = spawnSync(FF, ['-hide_banner', '-y', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status) { console.log(r.stderr.slice(-2500)); throw new Error('ffmpeg failed'); } return r.stderr; };
const { vo, sfx, total, adEnd, bar } = JSON.parse(readFileSync('vo.json', 'utf8'));
const S = 'aformat=sample_rates=48000:channel_layouts=stereo';

// UI sounds, synthesised
run(['-f', 'lavfi', '-i', 'sine=f=1800:d=0.06', '-af', `afade=t=out:st=0:d=0.06:curve=exp,volume=0.5,${S}`, 'build/tick.wav']);
run(['-f', 'lavfi', '-i', 'sine=f=55:d=0.6', '-f', 'lavfi', '-i', 'anoisesrc=d=0.25:c=white:a=0.5', '-filter_complex',
  `[0]afade=t=out:st=0:d=0.6:curve=exp,volume=1.4[a];[1]highpass=f=2500,afade=t=out:st=0:d=0.22:curve=exp,volume=0.5[b];[a][b]amix=2:normalize=0,${S}`, 'build/hit.wav']);
run(['-f', 'lavfi', '-i', 'anoisesrc=d=0.5:c=pink:a=0.5', '-af',
  `bandpass=f=1600:width_type=o:w=1.6,afade=t=in:st=0:d=0.32:curve=qsin,afade=t=out:st=0.32:d=0.18,volume=0.6,${S}`, 'build/whoosh.wav']);

// ad music: from 2 bars before the full-strength point, out at the ad's end
const adStart = 63.470 - 2 * bar;
run(['-ss', adStart.toFixed(3), '-t', String(adEnd + 0.8), '-i', 'music/474.mp3', '-af', `${S},afade=t=out:st=${adEnd - 0.3}:d=1.0,volume=0.68`, 'build/admusic.wav']);
// the bed, from its start, faded in under the first line
const bedLen = total - adEnd + 0.5;
run(['-i', 'music/1167.mp3', '-af', `atrim=0:${bedLen},asetpts=N/SR/TB,${S},afade=t=in:st=0:d=1.2,afade=t=out:st=${bedLen - 4.5}:d=4.5,adelay=${Math.round((adEnd - 0.5) * 1000)}:all=1,apad=whole_dur=${total}`, 'build/bed.wav']);

// voice
run([...vo.flatMap((v) => ['-i', `vo/f/${v.id}.wav`]), '-filter_complex',
  `${vo.map((v, i) => `[${i}]${S},adelay=${Math.round(v.t * 1000)}:all=1[v${i}]`).join(';')};${vo.map((_, i) => `[v${i}]`).join('')}amix=${vo.length}:normalize=0,acompressor=threshold=-22dB:ratio=2.5:attack=12:release=220:makeup=2,volume=1.45,apad=whole_dur=${total}`, 'build/voice.wav']);

// sfx
run([...sfx.flatMap((s) => ['-i', `build/${s.kind}.wav`]), '-filter_complex',
  `${sfx.map((s, i) => `[${i}]${S},adelay=${Math.round(Math.max(0, s.t) * 1000)}:all=1,volume=${s.vol ?? (s.kind === "whoosh" ? 0.3 : 0.5)}[s${i}]`).join(';')};${sfx.map((_, i) => `[s${i}]`).join('')}amix=${sfx.length}:normalize=0,apad=whole_dur=${total}`, 'build/sfx.wav']);

run(['-i', 'build/admusic.wav', '-i', 'build/bed.wav', '-i', 'build/voice.wav', '-i', 'build/sfx.wav', '-filter_complex',
  `[0]${S},apad=whole_dur=${total}[ad];[1]${S},volume=0.42[bed];[2]${S},asplit[vk][vm];[3]${S}[fx];` +
  `[bed][vk]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=500[bd];[ad][bd][vm][fx]amix=4:normalize=0,atrim=0:${total}`, 'build/premix.wav']);
const st = run(['-i', 'build/premix.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-']).split('Summary:').pop();
const I = Number(st.match(/I:\s+(-?[\d.]+) LUFS/)[1]), TP = Number(st.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]);
const gain = Math.min(-15 - I, -1.5 - TP);
console.log(`premix ${I} LUFS, TP ${TP} -> gain ${gain.toFixed(2)} dB`);
run(['-i', 'build/premix.wav', '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'pcm_s16le', 'out/mix.wav']);
const fin = run(['-i', 'out/mix.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-']).split('Summary:').pop();
console.log('final', fin.match(/I:\s+(-?[\d.]+) LUFS/)[0], fin.match(/Peak:\s+(-?[\d.]+) dBFS/)[0]);
for (const [a, b] of [[0, adEnd], [adEnd, total]]) { const s = run(['-ss', String(a), '-t', String(b - a), '-i', 'out/mix.wav', '-af', 'ebur128', '-f', 'null', '-']).split('Summary:').pop(); console.log(`${a.toFixed(0)}-${b.toFixed(0)}s`, s.match(/I:\s+(-?[\d.]+) LUFS/)[0]); }
if (existsSync('out/silent.mp4')) {
  const OUT = '../submission/ropes-perps-demo.mp4';
  run(['-i', 'out/silent.mp4', '-i', 'out/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
  console.log('wrote', OUT);
}
