// Raw WebSocket: subscribe to logs of 3 perp pools + newHeads, and time eth_blockNumber requests on the same socket.
import WebSocket from "ws";
const pools = ["0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0", "0xd6cb1dd58580b84d76068ac21594219ce03aeddf", "0xb483ec1fb34996638677c20ab087b16f1896fa53"];
const ws = new WebSocket("wss://api.hideki2.infra.testnet.somnia.network/ws");
await new Promise((r) => ws.once("open", r));
let id = 1; const pending = new Map<number, number>(); let logs = 0, heads = 0, bytes = 0;
ws.on("message", (d) => { bytes += d.toString().length; const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { console.log(`eth_blockNumber id ${m.id} ${Date.now() - pending.get(m.id)!} ms -> ${parseInt(m.result, 16)}`); pending.delete(m.id); } else if (m.method === "eth_subscription") { if (m.params.result?.topics) logs++; else heads++; } });
const send = (method: string, params: unknown[]) => { const i = id++; ws.send(JSON.stringify({ jsonrpc: "2.0", id: i, method, params })); return i; };
const watch = process.argv[2] !== "nowatch";
if (watch) { send("eth_subscribe", ["logs", { address: pools }]); send("eth_subscribe", ["newHeads"]); }
for (let i = 0; i < 20; i++) { pending.set(send("eth_blockNumber", []), Date.now()); await new Promise((r) => setTimeout(r, 1000)); }
await new Promise((r) => setTimeout(r, 3000));
console.log(`watch=${watch} logs=${logs} heads=${heads} kB=${(bytes / 1024).toFixed(0)} unanswered=${pending.size}`);
process.exit(0);
