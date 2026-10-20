// Does the dreamDEX HTTP / WebSocket API serve any perp market? (testnet base URL from the HTTP API docs)
import WebSocket from "ws";
const BASE = "https://stg.api.dreamdex.io/v0";
const show = async (path: string) => {
  const r = await fetch(BASE + path);
  const body = await r.text();
  console.log(`GET ${path} -> ${r.status} ${body.length > 400 ? body.slice(0, 400) + "…" : body}`);
  return body;
};
const mk = JSON.parse(await show("/markets"));
console.log("kinds:", JSON.stringify([...new Set(mk.markets.map((m: any) => m.kind))]), "symbols:", JSON.stringify(mk.markets.map((m: any) => m.symbol)));
await show("/orderbooks?symbols=BTC/USDso:USDso");
await show("/orderbooks?symbols=BTC:USDso");
await show("/markets/BTC:USDso/candles?interval=1m");
// WebSocket
const ws = new WebSocket("wss://stg.api.dreamdex.io/v0/ws/public");
await new Promise((res) => ws.once("open", res));
const msgs: string[] = [];
ws.on("message", (d) => msgs.push(d.toString().slice(0, 300)));
ws.send(JSON.stringify({ operation: "subscribe", channel: "orderbook", params: { symbols: ["BTC:USDso"] } }));
ws.send(JSON.stringify({ operation: "subscribe", channel: "orderbook", params: { symbols: ["BTC/USDso:USDso"] } }));
await new Promise((r) => setTimeout(r, 3000));
for (const m of msgs) console.log("WS <-", m);
ws.close();
process.exit(0);
