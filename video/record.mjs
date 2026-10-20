// Real footage of the LIVE site (ropesperps.nerom.site) and the Somnia explorer, recorded as raw CDP
// screencast frames with their own timestamps (page.screencast() stretches time; see Tideland notes).
//   node record.mjs land play explorer      -> clips/<take>/######.jpg + clips/<take>.json
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';

const SITE = 'https://ropesperps.nerom.site';
const EXPLORER = 'https://explorer.testnet.somnia.network/tokyo/tx/';
// the linked test climbing key + its dreamDEX account, as the site itself stores them
const KEY = readFileSync('../spike/test-key.local', 'utf8').trim();
const OWNER = '0x48F3bF1d065B7be54c4CC4181809920eC85dd47D';
const SEED = `(() => { if (location.hostname === 'ropesperps.nerom.site') { localStorage.setItem('ropes.key', '${KEY}'); localStorage.setItem('ropes.owner', '${OWNER}'); } })();`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VW = 1600, VH = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CURSOR = `(() => {
  const init = () => {
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" style="display:block;transform-origin:4px 2px;transition:transform .08s"><path d="M4 2v18l4.8-4.8 3.4 7.2 2.7-1.2-3.3-7.1H18L4 2z" fill="#0b0f14" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: 0, top: 0, zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-60px,-60px)' });
    const attach = () => { if (!c.isConnected) (document.body || document.documentElement).appendChild(c); };
    attach(); addEventListener('DOMContentLoaded', attach);
    addEventListener('mousemove', (e) => { attach(); c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
    addEventListener('mousedown', () => { c.firstChild.style.transform = 'scale(.84)'; }, true);
    addEventListener('mouseup', () => { c.firstChild.style.transform = ''; }, true);
  };
  if (document.documentElement) init();
  else new MutationObserver((m, o) => { if (document.documentElement) { o.disconnect(); init(); } }).observe(document, { childList: true });
})();`;

function rig(page) {
  const st = { mx: VW * 0.6, my: VH * 0.6 };
  const move = async (x, y, ms = 650) => {
    const steps = Math.max(8, Math.round(ms / 16)), x0 = st.mx, y0 = st.my;
    for (let i = 1; i <= steps; i++) { const k = i / steps, e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e); await sleep(ms / steps); }
    st.mx = x; st.my = y;
  };
  // the smallest visible clickable whose text matches
  const box = (re, sel = 'button, a, [role=button], input, textarea') => page.evaluate((src, s) => {
    const rx = new RegExp(src, 'i');
    const els = [...document.querySelectorAll(s)].filter((n) => {
      const t = (n.textContent || n.placeholder || n.value || '').replace(/\s+/g, ' ').trim();
      const r = n.getBoundingClientRect();
      return rx.test(t) && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
    }).sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
    const el = els[0]; if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, re.source, sel);
  const click = async (x, y, ms = 700) => { await move(x, y, ms); await sleep(140); await page.mouse.down(); await sleep(90); await page.mouse.up(); };
  const clickOn = async (re, ms = 700, sel) => { const b = await box(re, sel); if (!b) throw new Error(`not found: ${re}`); await click(b.x, b.y, ms); return b; };
  const hoverOn = async (re, ms = 700) => { const b = await box(re); if (b) await move(b.x, b.y, ms); return b; };
  const typeSlow = async (text, cps = 9) => { for (const ch of text) { await page.keyboard.type(ch); await sleep(1000 / cps); } };
  const state = () => page.evaluate(() => fetch('/api/state?n=1').then((r) => r.json()).catch(() => null));
  return { st, move, box, click, clickOn, hoverOn, typeSlow, state };
}

async function capture(page, take) {
  const FR = `clips/${take}`; rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push(f.metadata.timestamp);
    writeFileSync(`${FR}/${String(frames.length - 1).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64'));
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 });
  const t0 = Date.now(), events = [];
  const mark = (what, extra = {}) => { const t = (Date.now() - t0) / 1000; events.push({ t, what, ...extra }); console.log(take.padEnd(8), t.toFixed(1).padStart(6), what, extra.text ?? ''); };
  return {
    mark,
    async stop() { await sleep(300); await cdp.send('Page.stopScreencast'); await sleep(300); writeFileSync(`clips/${take}.json`, JSON.stringify({ events, frames: frames.map((x) => x - t0 / 1000) }, null, 1)); console.log(take, frames.length, 'frames'); },
  };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: VW, height: VH, deviceScaleFactor: 1 } });
async function freshPage() {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument(CURSOR);
  await page.evaluateOnNewDocument(SEED);
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 140)); });
  return page;
}

const TAKES = {
  // the Crag: the live wall, a market switch, a climber's card, TIE IN
  async crag() {
    const page = await freshPage(); const r = rig(page);
    await page.goto(SITE, { waitUntil: 'networkidle2' }); await sleep(7000);
    const cap = await capture(page, 'crag'); cap.mark('wall');
    await r.move(VW * 0.45, VH * 0.55, 1200); await sleep(2500);
    await r.hoverOn(/ON THE WALL/, 900); await sleep(1600);
    await r.move(VW * 0.4, VH * 0.6, 900); await sleep(1500);
    cap.mark('btc'); await r.clickOn(/^BTC/, 800); await sleep(3500);
    cap.mark('all'); await r.clickOn(/^ALL/, 700); await sleep(3000);
    // the highest tagged climber in the left two-thirds of the wall
    const b = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button[aria-label]')].map((e) => ({ e, r: e.getBoundingClientRect(), tag: e.querySelector('span:not([hidden])') }))
        .filter((x) => x.tag && x.r.left > 60 && x.r.right < innerWidth * 0.66 && x.r.top > 260 && x.r.bottom < innerHeight - 40);
      els.sort((a, b) => a.r.top - b.r.top); const x = els[Math.min(1, els.length - 1)]; if (!x) return null;
      return { x: x.r.left + x.r.width / 2, y: x.r.top + x.r.height * 0.6 };
    });
    if (b) { cap.mark('pick'); await r.click(b.x, b.y, 1000); await sleep(3200); }
    cap.mark('tie'); await r.hoverOn(/^TIE IN$/, 900); await sleep(900); await r.clickOn(/^TIE IN$/, 300);
    await sleep(4500); cap.mark('tied');
    await r.move(VW * 0.5, VH * 0.75, 900); await sleep(2500);
    await cap.stop(); await page.close();
  },

  // a real climb on the linked account: AVAX up, ride, BAIL, the result card
  async climb() {
    const page = await freshPage(); const r = rig(page);
    await page.goto(SITE + '/climb?base=AVAX&side=UP', { waitUntil: 'networkidle2' }); await sleep(6000);
    const cap = await capture(page, 'climb'); cap.mark('setup');
    await r.move(VW * 0.5, VH * 0.35, 900); await r.hoverOn(/KEY LINKED/, 900); await sleep(1800);
    await page.mouse.wheel({ deltaY: 520 }); await sleep(900);
    cap.mark('route');
    await r.clickOn(/^▲ UP/, 700); await sleep(500);
    await r.clickOn(/^10×$/, 700); await sleep(400);
    await r.clickOn(/^25$/, 700); await sleep(400);
    await r.clickOn(/^\+100%$/, 700); await sleep(900);
    cap.mark('climb'); await r.clickOn(/^CLIMB$/, 900);
    for (let i = 0; i < 40; i++) { if (await r.box(/CLOSE AT MARKET/)) break; await sleep(500); }
    await page.evaluate(() => scrollTo(0, 0)); cap.mark('riding');
    await r.move(VW * 0.35, VH * 0.45, 1400); await sleep(9000);
    await r.hoverOn(/CLOSE AT MARKET/, 1100); await sleep(9000);
    cap.mark('bail'); await r.clickOn(/CLOSE AT MARKET/, 300);
    for (let i = 0; i < 40; i++) { if (await r.box(/^CLIMB AGAIN$/)) break; await sleep(400); }
    cap.mark('result'); await sleep(2500);
    await r.hoverOn(/^SHARE CARD$/, 900); await sleep(2500);
    await cap.stop();
    const last = await page.evaluate(() => fetch('/api/climbs').then((x) => x.json()));
    writeFileSync('clips/climb.last.json', JSON.stringify(last.recent[0], null, 1));
    await page.close();
  },

  async leaders() {
    const page = await freshPage(); const r = rig(page);
    await page.goto(SITE + '/leaders', { waitUntil: 'networkidle2' }); await sleep(3500);
    const cap = await capture(page, 'leaders'); cap.mark('board');
    await r.move(VW * 0.5, VH * 0.45, 1000); await sleep(1500);
    await r.hoverOn(/^out$/, 900); await sleep(2500);
    await cap.stop(); await page.close();
  },

  async explorer() {
    const last = JSON.parse(readFileSync('clips/climb.last.json', 'utf8'));
    const page = await freshPage(); const r = rig(page);
    await page.goto(EXPLORER + last.exitTx, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(4000);
    const cap = await capture(page, 'explorer'); cap.mark('bailtx');
    await r.move(VW * 0.4, VH * 0.4, 900); await sleep(3500);
    await page.goto(EXPLORER + last.openTx, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(2500); cap.mark('opentx');
    await r.move(VW * 0.35, VH * 0.42, 900); await sleep(3500);
    await cap.stop(); await page.close();
  },

  async feedback() {
    const page = await freshPage(); const r = rig(page);
    await page.goto('https://github.com/neromtoobad/ropes-perps/tree/main/feedback', { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(3000);
    const cap = await capture(page, 'feedback'); cap.mark('list');
    await r.move(VW * 0.45, VH * 0.5, 900);
    for (let i = 0; i < 5; i++) { await page.mouse.wheel({ deltaY: 110 }); await sleep(450); }
    await sleep(2500);
    await cap.stop(); await page.close();
  },
};

for (const t of process.argv.slice(2)) await TAKES[t]();
await browser.close();
process.exit(0);
