// Selectors quoted on the perps developer page vs keccak, and whether the docs Errors page
// (https://app.testnet.dreamdex.io/docs/developers/contracts/errors) lists them.
import { toFunctionSelector } from "viem";
import { contractErrorsAbi } from "@somnia-chain/markets-sdk";
const html = await (await fetch("https://app.testnet.dreamdex.io/docs/developers/contracts/errors")).text();
const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? html;
const errorsPage = main.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
const article = errorsPage.slice(errorsPage.indexOf("I got scammed or hacked"));
const quoted: [string, string][] = [
  ["InsufficientCollateral()", "0x3a23d825"],
  ["ImmediateOrCancelNoFill()", "0xd48c4403"],
  ["MaxPositionSizeExceeded()", "0x714b36d6"],
  ["IsolatedMarketBlocked()", ""],
];
for (const [sig, docSel] of quoted) {
  const sel = toFunctionSelector(`function ${sig}`);
  const name = sig.split("(")[0];
  const inSdk = (contractErrorsAbi as any[]).filter((e) => e.type === "error" && e.name === name).map((e) => `${e.name}(${e.inputs.map((i: any) => i.type).join(",")})`);
  console.log(`${sig.padEnd(28)} docs=${docSel || "-"} keccak=${sel} sdkAbi=${JSON.stringify(inSdk)} onErrorsPage=${errorsPage.includes(name)}`);
}
const perpish = (contractErrorsAbi as any[]).filter((e) => e.type === "error").map((e) => e.name as string);
const missing = perpish.filter((n) => !errorsPage.includes(n));
console.log(`SDK contractErrorsAbi: ${perpish.length} errors; ${missing.length} of them not on the Errors page, e.g.`, missing.filter((n) => /Collateral|Position|Margin|Voucher|Isolat|Liquidat|Funding|Leverage|Credit/.test(n)).slice(0, 25).join(", "));
console.log("Errors page body (sidebar excluded) mentions perp/MarginBank:", /perp|marginbank/i.test(article));
