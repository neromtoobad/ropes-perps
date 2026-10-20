import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readFileSync, appendFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
if (!/GUARDIAN_PRIVATE_KEY=/.test(env)) appendFileSync(".env", `GUARDIAN_PRIVATE_KEY=${generatePrivateKey()}\n`);
const pk = readFileSync(".env", "utf8").match(/GUARDIAN_PRIVATE_KEY=(0x[0-9a-f]{64})/)![1];
console.log(privateKeyToAccount(pk as any).address);
