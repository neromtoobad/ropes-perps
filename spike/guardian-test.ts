// End-to-end guardian test on the live site: open a real AVAX climb with the test climbing key,
// record it with a summit that is already crossed (−100%), and wait for the guardian to close it.
//   npx tsx spike/guardian-test.ts
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hideki, poolAbi, ORDER_TYPE, RPC } from "../src/lib/chain";
import { decodeFill, priceOnTick, qtyOnLot } from "../src/lib/fills";
import { climbMessage } from "../src/lib/message";

const SITE = "https://ropesperps.nerom.site";
const OWNER = "0x48f3bf1d065b7be54c4cc4181809920ec85dd47d";
const key = privateKeyToAccount(readFileSync("spike/test-key.local", "utf8").trim() as `0x${string}`);
const pub = createPublicClient({ chain: hideki, transport: http(RPC) });
const wallet = createWalletClient({ account: key, chain: hideki, transport: http(RPC) });

const st = await fetch(`${SITE}/api/state?n=1`).then((r) => r.json());
const m = st.markets.find((x: any) => x.base === "AVAX");
const g = await fetch(`${SITE}/api/guardian?owner=${OWNER}&base=AVAX`).then((r) => r.json());
console.log("guardian", g.address, "armed on AVAX:", g.armed);
if (!g.armed) process.exit(1);

const mark = m.mark as number;
const qty = qtyOnLot(120 / mark, m.baseDec, BigInt(m.lot)); // ~$120 notional
const price = priceOnTick(mark * 1.015, BigInt(m.tick), true);
const expire = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;
const args = [OWNER, true, 0n, price, qty, expire, ORDER_TYPE.IOC, 0, "0x0000000000000000000000000000000000000000", 0n] as const;
const est = await pub.estimateContractGas({ address: m.pool, abi: poolAbi, functionName: "placeOrderFor", args, account: key });
const gp = await pub.getGasPrice();
const hash = await wallet.writeContract({ address: m.pool, abi: poolAbi, functionName: "placeOrderFor", args, gas: (est * 13n) / 10n, maxFeePerGas: (gp * 12n) / 10n, maxPriorityFeePerGas: 0n });
const r = await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
const f = decodeFill(r, OWNER, m.pool, m.baseDec);
console.log("opened", f.qty, "AVAX @", f.avgPx, "tx", hash);

const body = { action: "open", owner: OWNER, base: "AVAX", side: "UP", rope: 10, stake: (f.qty * f.avgPx) / 10, qty: f.qty, entryPx: f.avgPx, openTx: hash, tieTo: null, summit: -1 };
const sig = await key.signMessage({ message: climbMessage(body) });
const rec = await fetch(`${SITE}/api/climbs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, sig }) }).then((x) => x.json());
console.log("recorded climb", rec.id, "summit", rec.summit);
const t0 = Date.now();
for (;;) {
  const c = await fetch(`${SITE}/api/climbs?id=${rec.id}`).then((x) => x.json());
  if (c.status !== "open") {
    console.log(`closed by ${c.closedBy} as ${c.status} after ${((Date.now() - t0) / 1000).toFixed(1)}s, exit ${c.exitPx}, tx ${c.exitTx}`);
    break;
  }
  if (Date.now() - t0 > 60_000) { console.log("guardian did not close within 60s"); break; }
  await new Promise((res) => setTimeout(res, 1000));
}
process.exit(0);
