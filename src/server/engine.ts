/**
 * The Crag engine — one per server process.
 *
 * Holds every open perp position on dreamDEX in memory and keeps it live:
 *
 *  - bootstrap: each market's holder roster straight from the MarginBank
 *    (`getPerpSideHolders`, no indexer), then one multicall of `getPosition`;
 *  - live: a Somnia Reactivity `watch` on the MarginBank and the
 *    LiquidationEngine. Every `PositionUpdated` rewrites one row, every
 *    `PositionLiquidated` is a climber falling off the wall;
 *  - marks: one multicall of `tryGetHealthSnapshot` across all pools a second.
 *
 * Nothing here signs anything. The engine only reads, so it holds no key.
 */
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { SDK as Reactivity } from "@somnia-chain/reactivity";
import { createPublicClient, decodeEventLog, http, webSocket, type Log } from "viem";
import {
  INDEXER,
  LIQUIDATION_ENGINE,
  MARGIN_BANK,
  OPERATOR_GRANT_TOPIC,
  OPERATOR_REGISTRY,
  SEL,
  RPC,
  WS,
  bankAbi,
  hideki,
  liqAbi,
  poolAbi,
  type Mark,
  type Market,
} from "@/lib/chain";

export interface Position {
  account: `0x${string}`;
  pool: `0x${string}`;
  size: number; // signed, whole base units
  entry: number; // USDso per base
  since: number; // ms we first saw it at this sign
}

export interface FeedItem {
  id: string;
  at: number;
  kind: "fell" | "clipped" | "topped" | "bailed";
  account: string;
  base: string;
  side: "UP" | "DOWN";
  notional: number;
  /** realized PnL for a bail, liquidation size for a fall */
  pnl?: number;
  tx?: string;
}

const http_ = createPublicClient({ chain: hideki, transport: http(RPC, { batch: { batchSize: 200, wait: 4 } }) });

class Engine {
  markets: Market[] = [];
  byPool = new Map<string, Market>();
  marks = new Map<string, Mark>(); // by base
  positions = new Map<string, Position>(); // `${account}:${pool}` lowercased
  feed: FeedItem[] = [];
  /** bot key -> dreamDEX account, from every Link a bot grant seen on the stream */
  links = new Map<string, string>();
  falls24: number[] = [];
  events = 0;
  lastEventAt = 0;
  bootedAt = Date.now();
  ready = false;
  status = "booting";
  private sdk = new SomniaMarkets({ chain: hideki as any, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });

  async start() {
    await this.loadMarkets();
    this.loopMarks();
    this.watch();
    this.backfillFalls().catch((e) => console.error("[crag] backfill", e?.message));
    await this.resync();
    this.ready = true;
    this.status = "live";
    setInterval(() => this.resync().catch((e) => console.error("[crag] resync", e?.message)), 15 * 60_000);
    setInterval(() => this.loadMarkets().catch(() => {}), 30 * 60_000);
  }

  private async loadMarkets() {
    const rows = await this.sdk.client.listPerpMarkets();
    this.markets = rows
      .map((r: any) => ({
        base: String(r.baseSymbol).toUpperCase(),
        pool: r.poolAddress.toLowerCase() as `0x${string}`,
        baseDec: Number(r.baseDecimals),
        tick: String(r.tickSize),
        lot: String(r.lotSize),
        min: String(r.minQuantity),
        imfBps: Number(r.initialMarginBps),
      }))
      .sort((a, b) => a.base.localeCompare(b.base));
    this.byPool = new Map(this.markets.map((m) => [m.pool, m]));
  }

  private loopMarks() {
    const tick = async () => {
      try {
        const res = await http_.multicall({
          allowFailure: true,
          contracts: this.markets.map((m) => ({ address: m.pool, abi: poolAbi, functionName: "tryGetHealthSnapshot" }) as const),
        });
        const now = Date.now();
        res.forEach((r, i) => {
          if (r.status !== "success") return;
          const [ok, s] = r.result as readonly [boolean, { markPrice: bigint; effectiveIMFBps: bigint; maintenanceMarginBps: bigint }];
          if (!ok) return;
          this.marks.set(this.markets[i]!.base, {
            price: Number(s.markPrice) / 1e18,
            imfBps: Number(s.effectiveIMFBps),
            mmBps: Number(s.maintenanceMarginBps),
            at: now,
          });
        });
      } catch (e: any) {
        console.error("[crag] marks", e?.shortMessage ?? e?.message);
      }
      setTimeout(tick, 1000);
    };
    tick();
  }

  /** The last day of liquidations from the indexer, so the wall's memory starts before the process did. */
  private async backfillFalls() {
    const rows: any[] = await this.sdk.client.listLiquidations({ limit: 500 } as any);
    const since = Date.now() - 86_400_000;
    const old: FeedItem[] = [];
    for (const r of rows) {
      const at = Number(r.timestamp) * 1000;
      if (r.kind !== "PositionLiquidated" || at < since || !r.pool) continue;
      const m = this.byPool.get(String(r.pool).toLowerCase());
      if (!m) continue;
      const size = Number(BigInt(r.size)) / 10 ** m.baseDec;
      const px = Number(BigInt(r.price ?? 0)) / 1e18;
      this.falls24.push(at);
      old.push({ id: r.id, at, kind: "fell", account: String(r.account).toLowerCase(), base: m.base, side: size > 0 ? "DOWN" : "UP", notional: Math.abs(size) * px, tx: r.txHash });
    }
    this.falls24.sort((a, b) => a - b);
    this.feed = [...this.feed, ...old].sort((a, b) => b.at - a.at).slice(0, 60);
    console.log(`[crag] backfilled ${old.length} liquidations from the last 24h`);
  }

  /** Full roster from chain: holders per (pool, side), then positions by multicall. */
  async resync() {
    const t0 = Date.now();
    let done = 0;
    // Markets land on the wall one at a time as they finish, four in flight.
    const queue = [...this.markets];
    const worker = async () => {
      for (let m = queue.shift(); m; m = queue.shift()) {
        const found = await this.readMarket(m);
        for (const [k, p] of this.positions) if (p.pool === m.pool && !found.has(k)) this.positions.delete(k);
        for (const [k, p] of found) this.positions.set(k, p);
        this.status = `synced ${++done}/${this.markets.length} markets`;
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    console.log(`[crag] resync ${this.positions.size} positions in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  private async readMarket(m: Market) {
    const found = new Map<string, Position>();
    {
      for (const isLong of [true, false]) {
        const h = await this.sdk.client
          .getPerpSideHolders({ marginBank: MARGIN_BANK, pool: m.pool, isLong })
          .catch((e: any) => {
            console.error(`[crag] holders ${m.base}`, e?.message);
            return { holders: [] as `0x${string}`[] };
          });
        for (let i = 0; i < h.holders.length; i += 250) {
          const chunk = h.holders.slice(i, i + 250);
          const res = await http_.multicall({
            allowFailure: true,
            contracts: chunk.map((a) => ({ address: MARGIN_BANK, abi: bankAbi, functionName: "getPosition", args: [a, m.pool] }) as const),
          });
          res.forEach((r, k) => {
            if (r.status !== "success") return;
            const p = r.result as { size: bigint; avgEntryPrice: bigint };
            if (p.size === 0n) return;
            const account = chunk[k]!.toLowerCase() as `0x${string}`;
            const key = `${account}:${m.pool}`;
            const prev = this.positions.get(key);
            found.set(key, {
              account,
              pool: m.pool,
              size: Number(p.size) / 10 ** m.baseDec,
              entry: Number(p.avgEntryPrice) / 1e18,
              since: prev?.since ?? Date.now(),
            });
          });
        }
      }
    }
    return found;
  }

  /**
   * Somnia Reactivity: one `somnia_watch` stream over the MarginBank and the
   * LiquidationEngine. The SDK's own socket never reconnects, so a silent
   * stream is treated as dead after 30s and rebuilt from scratch.
   */
  private watch() {
    let stop: (() => void) | undefined;
    const open = async () => {
      try {
        stop?.();
        const pub = createPublicClient({ chain: hideki, transport: webSocket(WS, { keepAlive: true, reconnect: true }) });
        const r = new Reactivity({ public: pub } as any);
        const sub: any = await r.watch({
          eventContractSources: [MARGIN_BANK, LIQUIDATION_ENGINE, OPERATOR_REGISTRY],
          ethCalls: [],
          onData: (n: any) => this.onLog(n.result ?? n.params?.result),
          onError: (e: any) => console.error("[crag] watch", e?.message ?? e),
        } as any);
        if (sub instanceof Error) throw sub;
        stop = () => {
          sub?.unsubscribe?.().catch?.(() => {});
          (pub.transport as any).getRpcClient?.().then((c: any) => c.close?.()).catch?.(() => {});
        };
        this.lastEventAt = Date.now();
        console.log("[crag] reactivity watch open");
      } catch (e: any) {
        console.error("[crag] watch open failed", e?.message);
      }
    };
    open();
    setInterval(() => {
      if (Date.now() - this.lastEventAt > 30_000) {
        console.log("[crag] reactivity silent 30s, reopening");
        this.lastEventAt = Date.now();
        open();
      }
    }, 10_000);
  }

  private onLog(r: { address: string; topics: `0x${string}`[]; data: `0x${string}`; transactionHash?: string } | undefined) {
    if (!r) return;
    this.events++;
    this.lastEventAt = Date.now();
    const addr = r.address.toLowerCase();
    if (addr === OPERATOR_REGISTRY.toLowerCase()) {
      this.onGrant(r.topics, r.data);
      return;
    }
    try {
      if (addr === MARGIN_BANK.toLowerCase()) {
        const ev = decodeEventLog({ abi: bankAbi, topics: r.topics as any, data: r.data, strict: false }) as any;
        if (ev.eventName !== "PositionUpdated") return;
        const { account, perpPool, newSize, avgEntryPrice, realizedPnl } = ev.args;
        const m = this.byPool.get(String(perpPool).toLowerCase());
        if (!m) return;
        this.applyUpdate(m, String(account).toLowerCase() as `0x${string}`, Number(newSize) / 10 ** m.baseDec, Number(avgEntryPrice) / 1e18, Number(realizedPnl) / 1e18);
      } else if (addr === LIQUIDATION_ENGINE.toLowerCase()) {
        const ev = decodeEventLog({ abi: liqAbi, topics: r.topics as any, data: r.data, strict: false }) as any;
        if (ev.eventName !== "PositionLiquidated") return;
        const { account, perpPool, sizeDelta, markPrice } = ev.args;
        const m = this.byPool.get(String(perpPool).toLowerCase());
        if (!m) return;
        const size = Number(sizeDelta) / 10 ** m.baseDec;
        const px = Number(markPrice) / 1e18;
        const now = Date.now();
        this.falls24 = [...this.falls24.filter((t) => now - t < 86_400_000), now];
        // sizeDelta closes the position, so the side it fell from is the opposite sign
        this.push({ kind: "fell", account, base: m.base, side: size > 0 ? "DOWN" : "UP", notional: Math.abs(size) * px });
      }
    } catch {
      /* a log we don't model */
    }
  }

  /** A Link a bot grant: remember which account a key trades for (placeOrderFor, allowed). */
  onGrant(topics: `0x${string}`[], data: `0x${string}`) {
    if (topics[0]?.toLowerCase() !== OPERATOR_GRANT_TOPIC || topics.length < 4) return;
    const owner = ("0x" + topics[2]!.slice(26)).toLowerCase();
    const key = ("0x" + topics[3]!.slice(26)).toLowerCase();
    const selector = data.slice(0, 10).toLowerCase();
    const allowed = BigInt("0x" + data.slice(66, 130)) !== 0n;
    if (selector !== SEL.place) return;
    if (allowed) this.links.set(key, owner);
    else if (this.links.get(key) === owner) this.links.delete(key);
    this.onLink?.(key, owner, allowed);
  }
  onLink?: (key: string, owner: string, allowed: boolean) => void;

  /** Fallback for a link made before this process started: scan the registry backwards in 1,000-block steps. */
  async findLink(key: string, maxBlocks = 40_000, notBefore = 0n): Promise<{ owner: string | null; head: bigint }> {
    const k = key.toLowerCase();
    const head = await http_.getBlockNumber();
    if (this.links.has(k)) return { owner: this.links.get(k)!, head };
    const topic = ("0x" + k.slice(2).padStart(64, "0")) as `0x${string}`;
    const floor = head - BigInt(maxBlocks) > notBefore ? head - BigInt(maxBlocks) : notBefore;
    for (let to = head; to > floor; to -= 1000n) {
      const logs = (await (http_.request as any)({
          method: "eth_getLogs",
          params: [{ address: OPERATOR_REGISTRY, fromBlock: "0x" + (to - 999n).toString(16), toBlock: "0x" + to.toString(16), topics: [OPERATOR_GRANT_TOPIC, null, null, topic] }],
      }).catch(() => [])) as any[];
      for (const l of logs) this.onGrant(l.topics, l.data);
      if (this.links.has(k)) return { owner: this.links.get(k)!, head };
    }
    return { owner: null, head };
  }

  private applyUpdate(m: Market, account: `0x${string}`, size: number, entry: number, realized: number) {
    const key = `${account}:${m.pool}`;
    const prev = this.positions.get(key);
    const mark = this.marks.get(m.base)?.price ?? entry;
    if (size === 0) {
      if (prev) {
        this.positions.delete(key);
        if (Math.abs(prev.size) * mark >= 250) {
          this.push({ kind: "bailed", account, base: m.base, side: prev.size > 0 ? "UP" : "DOWN", notional: Math.abs(prev.size) * mark, pnl: realized });
        }
      }
      return;
    }
    const flipped = prev && Math.sign(prev.size) !== Math.sign(size);
    this.positions.set(key, { account, pool: m.pool, size, entry, since: !prev || flipped ? Date.now() : prev.since });
    const notional = Math.abs(size) * mark;
    if ((!prev || flipped) && notional >= 250) {
      this.push({ kind: "clipped", account, base: m.base, side: size > 0 ? "UP" : "DOWN", notional });
    }
  }

  private push(f: Omit<FeedItem, "id" | "at">) {
    const item = { ...f, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() } as FeedItem;
    this.feed = [item, ...this.feed].slice(0, 60);
  }

  /** ROE of a position at the live mark, against the margin the market asks for it. */
  roe(p: Position): number | null {
    const m = this.byPool.get(p.pool);
    const mk = m && this.marks.get(m.base);
    if (!m || !mk || !p.entry) return null;
    const im = Math.abs(p.size) * mk.price * (mk.imfBps / 10_000);
    if (im <= 0) return null;
    return ((mk.price - p.entry) * p.size) / im;
  }
}

const g = globalThis as unknown as { __crag?: Engine };
export function engine(): Engine {
  if (!g.__crag) {
    g.__crag = new Engine();
    g.__crag.start().catch((e) => {
      console.error("[crag] start failed", e);
      g.__crag!.status = "error: " + (e?.message ?? e);
    });
  }
  return g.__crag;
}
export type { Engine };
export type { Log };
