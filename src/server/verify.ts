import { createPublicClient, http, recoverMessageAddress, type Hex } from "viem";
import { RPC, SEL, hideki, poolAbi } from "@/lib/chain";
import { engine } from "./engine";

export const chainClient = createPublicClient({ chain: hideki, transport: http(RPC) });

import { climbMessage } from "@/lib/message";

export async function signer(body: Record<string, unknown>) {
  return (await recoverMessageAddress({ message: climbMessage(body), signature: body.sig as Hex })).toLowerCase();
}

/** Is `key` a linked bot of `owner` on dreamDEX perps? Checked on the BTC pool, which every link covers. */
export async function isLinked(owner: string, key: string) {
  const pool = engine().markets.find((m) => m.base === "BTC")?.pool;
  if (!pool) return false;
  return chainClient
    .readContract({ address: pool, abi: poolAbi, functionName: "isOperatorAuthorized", args: [owner as Hex, key as Hex, SEL.place] })
    .catch(() => false);
}

/** A transaction sent by `key`, that succeeded, to one of the perp pools. */
export async function verifyTx(hash: string, key: string) {
  const [tx, r] = await Promise.all([
    chainClient.getTransaction({ hash: hash as Hex }),
    chainClient.getTransactionReceipt({ hash: hash as Hex }),
  ]);
  const pool = engine().byPool.get(String(tx.to).toLowerCase());
  return r.status === "success" && tx.from.toLowerCase() === key && !!pool;
}
