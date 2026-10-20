// Perp TP/SL through the SDK with the documented config (addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES).
// The trader uses a stub executor that refuses to send anything, so nothing can reach the chain.
import { markets, j, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "./_conn.ts";
import { parseAbi, decodeFunctionData, formatEther } from "viem";
const c = markets.client as any;
const ACTOR = "0x000000000000000000000000000000000000bEEF"; // no key exists for this; nothing is sent
const executor = { chainId: 50383, actor: ACTOR, execute: async () => { throw new Error("stub executor: refusing to send"); } };
const trader = c.createTrader({ executor });
const perps = await c.listPerpMarkets();
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;
console.log("SOMNIA_HIDEKI_TESTNET_ADDRESSES.operatorPermissionsRegistry =", (SOMNIA_HIDEKI_TESTNET_ADDRESSES as any).operatorPermissionsRegistry);
console.log("BTC row stopRegistry =", btc.stopRegistry);
const onChain = new Set<string>(); for (const m of perps) onChain.add(await c.getOperatorPermissionsRegistry(m.poolAddress));
console.log(`client.getOperatorPermissionsRegistry(pool) over all ${perps.length} perp pools ->`, [...onChain]);
const leg = { registry: btc.stopRegistry, pool: btc.poolAddress, isBid: false, quantity: 13000n, triggerPrice: 70000n * 10n ** 18n, triggerOperator: 1, stopOrderType: 1 };
const isAuth = await c.isOperatorAuthorized?.({ pool: btc.poolAddress, owner: ACTOR, operator: btc.stopRegistry, selector: "0x80054449" }).catch((e: any) => "ERR " + e.message);
console.log("pool.isOperatorAuthorized(actor, stopRegistry, placeOrderFor) =", isAuth);
for (const [label, fn] of [
  ["trader.buildPlacePerpStopOrder(leg)", () => trader.buildPlacePerpStopOrder(leg)],
  ["trader.placePerpStopOrder(leg)", () => trader.placePerpStopOrder(leg)],
] as const) {
  try { const r = await fn(); console.log(label, "->", j(r).slice(0, 300)); }
  catch (e: any) { console.log(label, "threw", e.constructor.name + ":", e.message.split("\n")[0]); }
}
// Same build with the registry passed explicitly (the address from the docs' Contracts table):
const DOCS_REG = "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a";
const built = await trader.buildPlacePerpStopOrder({ ...leg, operatorRegistry: DOCS_REG });
const reg = parseAbi(["function setOperatorApprovalGlobal(address operator, bytes4[] selectors, bool approved)"]);
const dec = decodeFunctionData({ abi: reg, data: built.operatorApproval.data });
console.log("with operatorRegistry passed explicitly:");
console.log("  operatorApproval.description =", JSON.stringify(built.operatorApproval.description));
console.log("  operatorApproval decodes to  =", dec.functionName + "(" + j(dec.args) + ")");
console.log("  stopOrder.value =", formatEther(built.stopOrder.value), "STT, description =", JSON.stringify(built.stopOrder.description));
process.exit(0);
