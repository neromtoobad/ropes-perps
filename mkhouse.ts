import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync, existsSync } from "node:fs";
if (!existsSync(".env")) { const pk = generatePrivateKey(); writeFileSync(".env", `HOUSE_PRIVATE_KEY=${pk}\n`, { mode: 0o600 }); }
import("dotenv/config").then(() => console.log("house", privateKeyToAccount(process.env.HOUSE_PRIVATE_KEY as any).address));
