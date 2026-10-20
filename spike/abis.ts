import * as s from "@somnia-chain/markets-sdk";
import { toEventSelector, toFunctionSelector, formatAbiItem } from "viem/utils";
const sigs = (abi: any[], kind: string) => abi.filter((x) => x.type === kind).map((x) => formatAbiItem(x));
console.log("MARGINBANK EVENTS\n" + sigs(s.marginBankEventsAbi as any, "event").map((e) => toEventSelector(e).slice(0, 10) + " " + e).join("\n"));
console.log("POOL EVENTS\n" + sigs(s.perpPoolEventsAbi as any, "event").map((e) => toEventSelector(e).slice(0, 10) + " " + e).join("\n"));
console.log("LIQ EVENTS\n" + sigs(s.liquidationEngineEventsAbi as any, "event").map((e) => toEventSelector(e).slice(0, 10) + " " + e).join("\n"));
console.log("ORDERBOOK EVENTS\n" + sigs(s.orderBookEventsAbi as any, "event").map((e) => toEventSelector(e).slice(0, 10) + " " + e).join("\n"));
console.log("perpPoolWrite fns\n" + sigs(s.perpPoolWriteAbi as any, "function").join("\n"));
