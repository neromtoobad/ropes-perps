import * as s from "@somnia-chain/markets-sdk";
const pick = (abi: any[], n: string) => JSON.stringify(abi.find((x) => x.name === n));
console.log(pick(s.marginBankEventsAbi as any, "PositionUpdated"));
console.log(pick(s.liquidationEngineEventsAbi as any, "PositionLiquidated"));
console.log(pick(s.liquidationEngineEventsAbi as any, "AccountLiquidated"));
console.log(pick(s.orderBookEventsAbi as any, "OrderFilled"));
const all = Object.entries(s).filter(([k, v]) => /Abi$/.test(k) && Array.isArray(v));
for (const [k, v] of all) { const f = (v as any[]).find((x) => x.name === "tryGetHealthSnapshot" || x.name === "getPosition" || x.name === "getAccountEquity"); if (f) console.log(k, JSON.stringify(f)); }
console.log(Object.keys(s).filter((k) => /Abi$/.test(k)).join(" "));
console.log(SOMNIA_HIDEKI());
function SOMNIA_HIDEKI() { return JSON.stringify((s as any).SOMNIA_HIDEKI_TESTNET_ADDRESSES); }
