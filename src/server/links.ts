import { db } from "@/lib/db";
import { engine } from "./engine";

/** Persist every Link a bot grant the stream sees, so a restart keeps them. Wired once per process. */
const g = globalThis as unknown as { __linksWired?: boolean };
export function wireLinks() {
  const e = engine();
  if (g.__linksWired) return e;
  g.__linksWired = true;
  e.onLink = (key, owner, allowed) => {
    const op = allowed
      ? db.keyLink.upsert({ where: { key }, create: { key, owner }, update: { owner, at: new Date() } })
      : db.keyLink.deleteMany({ where: { key, owner } });
    op.catch(() => {});
  };
  return e;
}

/** Owner from what we already know (the stream and the table), without scanning the chain. */
export async function knownOwner(key: string): Promise<string | null> {
  const e = wireLinks();
  const k = key.toLowerCase();
  return e.links.get(k) ?? (await db.keyLink.findUnique({ where: { key: k } }).catch(() => null))?.owner ?? null;
}

const inflight = new Map<string, Promise<string | null>>();
/** how far up the chain each still-unlinked key has been scanned, so a poll only reads new blocks */
const scanned = new Map<string, bigint>();

/** The dreamDEX account a climbing key trades for: stream memory, then the table, then a chain scan. */
export async function ownerOf(key: string, sinceSec?: number): Promise<string | null> {
  const e = wireLinks();
  const k = key.toLowerCase();
  const mem = e.links.get(k);
  if (mem) return mem;
  const row = await db.keyLink.findUnique({ where: { key: k } }).catch(() => null);
  if (row) {
    e.links.set(k, row.owner);
    return row.owner;
  }
  if (inflight.has(k)) return inflight.get(k)!;
  // A key made in this browser can only have been linked after it existed (~10 blocks a second).
  const age = sinceSec ? Math.max(0, Date.now() / 1000 - sinceSec) : Infinity;
  const maxBlocks = Math.min(150_000, Number.isFinite(age) ? Math.ceil(age * 10) + 3_000 : 150_000); // ~4 hours at most
  const run = e
    .findLink(k, maxBlocks, scanned.get(k) ?? 0n)
    .then(async ({ owner, head }) => {
      if (owner) {
        scanned.delete(k);
        await db.keyLink.upsert({ where: { key: k }, create: { key: k, owner }, update: { owner } }).catch(() => {});
      } else scanned.set(k, head);
      return owner;
    })
    .catch(() => null)
    .finally(() => inflight.delete(k));
  inflight.set(k, run);
  return run;
}
