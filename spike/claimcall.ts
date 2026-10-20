import { createPublicClient, http } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const D = "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4";
for (const from of ["0x099e5fa390eCD369dd5dBD462589300c41C07afA", "0xea2CbF1444b0FFcC8DF2ce4275e3F6A7232Bb889", "0x000000000000000000000000000000000000dEaD", "0x48F3bF1d065B7be54c4CC4181809920eC85dd47D"]) {
  try { await c.call({ to: D, data: "0x4e71d92d", account: from as any }); console.log(from, "OK"); }
  catch (e: any) { console.log(from, (e.cause?.data ?? e.details ?? e.shortMessage)?.toString().slice(0, 80)); }
}
const code = await c.getCode({ address: D });
console.log("code len", code?.length);
const impl = await c.getStorageAt({ address: D, slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" });
console.log("eip1967 impl", impl);
const im = "0x" + impl!.slice(26);
const icode = await c.getCode({ address: im as any });
console.log("impl code len", icode?.length, "has 3e31dcc2:", icode?.includes("3e31dcc2"), code?.includes("3e31dcc2"));
const sels = new Set<string>(); const src = (icode && icode.length > 4 ? icode : code)!;
for (const m of src.matchAll(/63([0-9a-f]{8})/g)) sels.add(m[1]);
console.log([...sels].join(" "));
