import { ownerOf } from "@/server/links";
import { isLinked } from "@/server/verify";

export const dynamic = "force-dynamic";

/** Which dreamDEX account has linked this climbing key, if any. The page polls this after showing the key. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const key = u.get("key")?.toLowerCase();
  const since = Number(u.get("since")) || undefined;
  if (!key || !/^0x[0-9a-f]{40}$/.test(key)) return Response.json({ error: "bad key" }, { status: 400 });
  const owner = await ownerOf(key, since);
  // the chain has the final word: a grant we saw may since have been revoked
  const live = owner ? await isLinked(owner, key) : false;
  return Response.json({ owner: live ? owner : null }, { headers: { "cache-control": "no-store" } });
}
