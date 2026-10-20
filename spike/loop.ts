// End-to-end: burner wallet -> gas drip -> voucher -> leverage -> grant keeper -> keeper opens + closes BTC.
import "dotenv/config";
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets, PLACE_ORDER_FOR_SELECTOR, CANCEL_ORDER_FOR_SELECTOR } from "@somnia-chain/markets-sdk";
import * as sdk from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, createWalletClient, http, parseEther, formatUnits } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync, existsSync, readFileSync } from "node:fs";

const IDX = "https://hideki-dev.smk.somnia.host/v1/graphql";
const rpc = http("https://api.hideki2.infra.testnet.somnia.network");
const pub = createPublicClient({ chain: hidekiTestnet, transport: rpc });
const house = privateKeyToAccount(process.env.HOUSE_PRIVATE_KEY as `0x${string}`);
const mk = (pk?: `0x${string}`) => new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: IDX, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, ...(pk ? { privateKey: pk } : {}) });
const j = (x: unknown) => JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v));
const t = () => new Date().toISOString().slice(11, 23);
const step = async <T>(name: string, f: () => Promise<T>) => { const s = Date.now(); const r = await f(); console.log(t(), name, `${Date.now() - s}ms`, j(r).slice(0, 400)); return r; };

console.log("selectors", PLACE_ORDER_FOR_SELECTOR, CANCEL_ORDER_FOR_SELECTOR, Object.keys(sdk).filter((k) => /SELECTOR/.test(k)));
const burnerPk: `0x${string}` = existsSync("spike/burner.local") ? (readFileSync("spike/burner.local", "utf8").trim() as any) : generatePrivateKey();
writeFileSync("spike/burner.local", burnerPk, { mode: 0o600 });
const burner = privateKeyToAccount(burnerPk);
console.log("burner", burner.address, "keeper/house", house.address);

const B = mk(burnerPk);
const K = mk(process.env.HOUSE_PRIVATE_KEY as `0x${string}`);
const perps = await B.client.listPerpMarkets();
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;

if ((await pub.getBalance({ address: burner.address })) < parseEther("0.12")) {
  await step("drip 0.05 STT", async () => {
    const w = createWalletClient({ account: house, chain: hidekiTestnet, transport: rpc });
    const h = await w.sendTransaction({ to: burner.address, value: parseEther("0.15") });
    return (await pub.waitForTransactionReceipt({ hash: h })).status;
  });
}
const el = await B.client.getPerpVoucherEligibility(btc.marginBank, burner.address);
if (el.eligible) await step("claim voucher", () => B.trader.claimPerpVoucher({ marginBank: btc.marginBank, gas: 1_500_000n }));
await step("equity", () => B.client.tryGetPerpAccountEquity?.(btc.marginBank as any, burner.address as any) ?? Promise.resolve("n/a"));
await step("set 20x", () => B.trader.setPerpLeverage({ pool: btc.poolAddress, leverageX: 20, gas: 1_500_000n }));
await step("grant keeper", () =>
  B.trader.setOperatorApprovalForPool({ pool: btc.poolAddress, operator: house.address, selectors: [PLACE_ORDER_FOR_SELECTOR, CANCEL_ORDER_FOR_SELECTOR], approved: true, gas: 1_500_000n }),
);
const auth = await step("isAuthorized", () => B.client.isOperatorAuthorized({ pool: btc.poolAddress, owner: burner.address, operator: house.address, selector: PLACE_ORDER_FOR_SELECTOR }));
const snap = await B.client.getPerpHealthSnapshot(btc.poolAddress);
const markPx = Number(snap.markPrice) / 1e18;
console.log("mark", markPx);
// stake 50 USDso at 20x => 1000 notional
const qty = BigInt(Math.floor((1000 / markPx) * 1e8 / 1000) * 1000); // 8 decimals, round to 1e3 raw
const lot = BigInt(btc.lotSize);
const q = (qty / lot) * lot;
const tick = BigInt(btc.tickSize);
const crossUp = (BigInt(Math.round(markPx * 1.01 * 1e6)) * 10n ** 12n / tick) * tick;
const crossDn = (BigInt(Math.round(markPx * 0.99 * 1e6)) * 10n ** 12n / tick) * tick;
console.log("qty", formatUnits(q, 8), "lot", btc.lotSize, "min", btc.minQuantity);
await step("preview liq", () => B.client.previewPerpLiquidationPrice({ pool: btc.poolAddress, marginBank: btc.marginBank, account: burner.address, isBid: true, quantity: q, price: crossUp }));
if (auth) {
  await step("keeper OPEN long (placeOrderFor IOC)", () => K.trader.placePerpOrder({ pool: btc.poolAddress, isBid: true, price: crossUp, quantity: q, orderType: 2, owner: burner.address } as any).catch((e: any) => "placePerpOrder(owner) failed: " + e.message));
}
await step("position", () => B.client.getPerpPosition({ marginBank: btc.marginBank, account: burner.address, pool: btc.poolAddress }));
process.exit(0);
