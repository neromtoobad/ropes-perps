"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EXPLORER } from "@/lib/chain";
import { ART } from "../Crag";
import { shareRunCard } from "../share";
import { useSound } from "../sound";
import { Footer, Header, pct, px, safeLocal, short, usd, usePoll, type CragState } from "../ui";
import { Rope } from "./Rope";
import { ArenaStrip } from "./Arena";
import {
  MIN_GAS_STT,
  climbingKey,
  exportKey,
  keyMadeAt,
  linkStatus,
  markOf,
  minQty,
  nameError,
  positionOf,
  qtyRaw,
  sendIoc,
  sign,
} from "./trade";

/** A rope the player is on, persisted so a reload picks it back up. */
interface Live {
  id?: string;
  base: string;
  side: "UP" | "DOWN";
  rope: number;
  stake: number;
  qty: number;
  entry: number;
  fees: number;
  openTx: string;
  openedAt: number;
  summit: number | null;
  tieTo: string | null;
  peak: number;
}
interface Done {
  live: Live;
  exitPx: number;
  exitTx: string | null;
  roe: number;
  status: "bailed" | "summit" | "ground" | "gone";
  why: string;
}

const ANCHOR = -0.9;
const ROPES = [2, 3, 5, 10, 15, 20];
const STAKES = [10, 25, 50, 100, 250];
const SUMMITS: (number | null)[] = [null, 0.5, 1, 2, 4];

export default function ClimbPage() {
  return (
    <Suspense>
      <Climb />
    </Suspense>
  );
}

function Climb() {
  const q = useSearchParams();
  const sound = useSound();
  const s = usePoll<CragState>("/api/state?n=1", 4000, (j) => Array.isArray(j?.markets));
  const markets = useMemo(() => (s?.markets ?? []).filter((m) => m.mark).sort((a, b) => b.oi - a.oi), [s]);

  const [key, setKey] = useState<`0x${string}` | null>(null);
  const [owner, setOwner] = useState("");
  const [link, setLink] = useState<{ linked: boolean; gas: number; equity: number } | null>(null);
  const [manual, setManual] = useState(false);
  const [drip, setDrip] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [me, setMe] = useState<{ name: string; art: string } | null>(null);
  const [name, setName] = useState("");
  const [art, setArt] = useState<string>("gold");
  const [base, setBase] = useState(q.get("base")?.toUpperCase() ?? "BTC");
  const [side, setSide] = useState<"UP" | "DOWN">(q.get("side") === "DOWN" ? "DOWN" : "UP");
  const [rope, setRope] = useState(10);
  const [stake, setStake] = useState(25);
  const [summit, setSummit] = useState<number | null>(1);
  const tieTo = q.get("tie");
  const [followBail, setFollowBail] = useState(true);
  const [live, setLive] = useState<Live | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mark, setMark] = useState<number | null>(null);
  const [leader, setLeader] = useState<number | null>(null);
  const [state, setState] = useState<"climbing" | "leap" | "fall">("climbing");

  useEffect(() => {
    setKey(climbingKey().address);
    setOwner(safeLocal.get("ropes.owner") ?? "");
    try {
      const l = JSON.parse(safeLocal.get("ropes.live") ?? "null");
      if (l?.openTx) setLive(l);
    } catch {
      /* none */
    }
  }, []);
  useEffect(() => {
    if (live) safeLocal.set("ropes.live", JSON.stringify(live));
    else safeLocal.remove("ropes.live");
  }, [live]);

  const ownerOk = /^0x[0-9a-fA-F]{40}$/.test(owner);

  // No address to paste: the server watches the registry's link events and tells us whose key this is.
  useEffect(() => {
    if (ownerOk || !key || manual) return;
    let on = true;
    const run = async () => {
      const since = keyMadeAt();
      const j = await fetch(`/api/link?key=${key}${since ? `&since=${since}` : ""}`).then((r) => r.json()).catch(() => null);
      if (on && j?.owner) setOwner(j.owner);
    };
    run();
    const id = setInterval(run, 4000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [key, ownerOk, manual]);

  // No gas to find either: the first drip comes from the ROPES house wallet.
  useEffect(() => {
    if (!key || !link?.linked || link.gas >= MIN_GAS_STT || drip !== "idle") return;
    setDrip("sending");
    fetch("/api/drip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) })
      .then((r) => r.json())
      .then((j) => setDrip(j?.ok ? "sent" : "failed"))
      .catch(() => setDrip("failed"));
  }, [key, link, drip]);
  const btc = markets.find((m) => m.base === "BTC");
  const m = markets.find((x) => x.base === (live?.base ?? base));

  // link + gas + equity, until the account is ready (and every 10s after)
  useEffect(() => {
    if (!ownerOk || !key || !btc) return;
    safeLocal.set("ropes.owner", owner);
    let on = true;
    const run = async () => {
      const r = await linkStatus(owner as `0x${string}`, key, btc.pool).catch(() => null);
      if (on && r) setLink(r);
    };
    run();
    const id = setInterval(run, 6000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [owner, ownerOk, key, btc]);
  useEffect(() => {
    if (!ownerOk) return;
    fetch(`/api/climber?owner=${owner}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.climber) {
          setMe({ name: j.climber.name, art: j.climber.art });
          setName(j.climber.name);
          setArt(j.climber.art);
        }
      })
      .catch(() => {});
  }, [owner, ownerOk]);

  // live mark for the market on screen, straight from the pool, ~3× a second while climbing
  useEffect(() => {
    if (!m) return;
    let on = true;
    let t: ReturnType<typeof setTimeout>;
    const run = async () => {
      const p = await markOf(m.pool).catch(() => null);
      if (on && p) setMark(p);
      if (on) t = setTimeout(run, live ? 350 : 1500);
    };
    run();
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [m, live]);

  const dir = (live?.side ?? side) === "UP" ? 1 : -1;
  const roe = live && mark ? ((mark - live.entry) * live.qty * dir - live.fees * 2) / live.stake : 0;

  const bail = useCallback(
    async (status: Done["status"], why: string) => {
      if (!live || !m || busy) return;
      setBusy(status === "bailed" ? "BAILING…" : why.toUpperCase());
      setErr(null);
      try {
        const pos = await positionOf(owner as `0x${string}`, m);
        const mine = Math.sign(pos.size) === dir ? Math.min(Math.abs(pos.size), live.qty) : 0;
        if (mine <= 0) {
          finish({ live, exitPx: mark ?? live.entry, exitTx: null, roe, status: "gone", why: "the position was already closed on the account" });
          return;
        }
        const cur = mark ?? (await markOf(m.pool)) ?? live.entry;
        const isBid = dir < 0;
        let fill = null;
        for (const slip of [0.015, 0.04]) {
          try {
            fill = await sendIoc({ owner: owner as `0x${string}`, m, isBid, qty: qtyRaw(mine, m), limit: cur * (isBid ? 1 + slip : 1 - slip) });
            break;
          } catch (e: any) {
            if (!/ImmediateOrCancelNoFill/.test(String(e?.message))) throw e;
          }
        }
        if (!fill || !fill.qty) throw new Error("the book had nothing to fill the BAIL — try again");
        const exitRoe = ((fill.avgPx - live.entry) * fill.qty * dir - live.fees - fill.fee) / live.stake;
        setState(status === "ground" ? "fall" : "leap");
        sound.play(status === "ground" ? "death" : "win");
        finish({ live, exitPx: fill.avgPx, exitTx: fill.hash, roe: exitRoe, status, why });
      } catch (e: any) {
        setErr(nameError(e));
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, m, busy, owner, mark, roe, dir],
  );

  function finish(d: Done) {
    setTimeout(() => {
      setDone(d);
      setLive(null);
      setState("climbing");
    }, 1100);
    if (d.live.id)
      record({ action: "close", id: d.live.id, exitTx: d.exitTx, exitPx: d.exitPx, multiple: 1 + d.roe, status: d.status, peak: d.live.peak });
  }

  // the anchor, the summit, the peak
  const firing = useRef(false);
  useEffect(() => {
    if (!live || !mark || busy || firing.current) return;
    if (roe > live.peak - 1) setLive((l) => (l ? { ...l, peak: Math.max(l.peak, 1 + roe) } : l));
    const fire = (st: Done["status"], why: string) => {
      firing.current = true;
      bail(st, why).finally(() => (firing.current = false));
    };
    if (roe <= ANCHOR) fire("ground", "caught by the anchor");
    else if (live.summit !== null && roe >= live.summit) fire("summit", "summit reached");
  }, [roe, live, mark, busy, bail]);

  // tied in: when the leader lets go, so do we
  useEffect(() => {
    if (!live?.tieTo || !m) return;
    let on = true;
    const run = async () => {
      const p = await positionOf(live.tieTo as `0x${string}`, m).catch(() => null);
      if (!on || !p) return;
      setLeader(p.size);
      if (followBail && Math.sign(p.size) !== dir && !firing.current && !busy) {
        firing.current = true;
        bail("bailed", "your leader bailed, you bailed with them").finally(() => (firing.current = false));
      }
    };
    run();
    const id = setInterval(run, 2500);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [live?.tieTo, m, followBail, dir, busy, bail]);

  async function record(body: Record<string, unknown>) {
    const full = { ...body, owner: owner.toLowerCase() };
    const { climbMessage } = await import("./message");
    const sig = await sign(climbMessage(full));
    const r = await fetch("/api/climbs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...full, sig }) });
    return r.ok ? r.json() : null;
  }

  async function register() {
    if (!key) return;
    setBusy("SIGNING…");
    setErr(null);
    try {
      const { climbMessage } = await import("./message");
      const body = { owner: owner.toLowerCase(), key: key.toLowerCase(), name, art };
      const sig = await sign(climbMessage(body));
      const r = await fetch("/api/climber", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, sig }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMe({ name: j.name, art: j.art });
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function climb() {
    if (!m || !mark || busy) return;
    setErr(null);
    setDone(null);
    const qty = qtyRaw((stake * rope) / mark, m);
    if (Number(qty) / 10 ** m.baseDec < minQty(m)) {
      setErr(`${m.base} needs at least ${minQty(m)} ${m.base} (~${usd(minQty(m) * mark)} notional). Raise the stake or the rope.`);
      return;
    }
    setBusy("ROPING UP…");
    sound.arm();
    try {
      const isBid = side === "UP";
      const quote = await fetch(`/api/quote?base=${m.base}&owner=${owner}&side=${side}&price=${BigInt(Math.round(mark * 1e9)) * 1_000_000_000n}`)
        .then((r) => r.json())
        .catch(() => null);
      if (quote && quote.placeable === false) throw new Error(`dreamDEX won't take this order: ${quote.limitedBy}`);
      if (quote?.maxQuantity && BigInt(quote.maxQuantity) < qty) throw new Error(`too big for this account right now (limited by ${quote.limitedBy}). Lower the stake or the rope.`);
      const fill = await sendIoc({ owner: owner as `0x${string}`, m, isBid, qty, limit: mark * (isBid ? 1.015 : 0.985) });
      if (!fill.qty) throw new Error("nothing filled — the book moved. Try again.");
      const realStake = (fill.qty * fill.avgPx) / rope;
      const l: Live = {
        base: m.base,
        side,
        rope,
        stake: realStake,
        qty: fill.qty,
        entry: fill.avgPx,
        fees: fill.fee,
        openTx: fill.hash,
        openedAt: Date.now(),
        summit,
        tieTo,
        peak: 1,
      };
      setLive(l);
      setState("climbing");
      sound.play("click");
      const rec = await record({ action: "open", base: l.base, side: l.side, rope, stake: l.stake, qty: l.qty, entryPx: l.entry, openTx: l.openTx, tieTo, summit });
      if (rec?.id) setLive((x) => (x && x.openTx === l.openTx ? { ...x, id: rec.id } : x));
    } catch (e: any) {
      setErr(e?.message?.startsWith?.("dreamDEX") || e?.message?.startsWith?.("too big") ? e.message : nameError(e));
    } finally {
      setBusy(null);
    }
  }

  const ready = link?.linked && (link?.gas ?? 0) >= MIN_GAS_STT && me;
  const step = !ownerOk || !link?.linked || (link?.gas ?? 0) < MIN_GAS_STT ? "link" : !me ? "name" : "route";

  return (
    <main className="min-h-dvh">
      <Header />
      <section className="mx-auto w-full max-w-[1400px] px-4">
        {live && m ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              <Rope
                roe={roe}
                art={me?.art ?? art}
                name={me?.name ?? "you"}
                base={live.base}
                side={live.side}
                mark={mark}
                entry={live.entry}
                groundPx={live.entry * (1 - (dir * -ANCHOR) / live.rope)}
                summitPx={live.summit !== null ? live.entry * (1 + (dir * live.summit) / live.rope) : null}
                summit={live.summit}
                anchor={ANCHOR}
                state={state}
              />
            </div>
            <aside className="min-w-0 space-y-3">
              <div className="chamfer border p-4" style={{ borderColor: "var(--edge)", background: "var(--panel)" }}>
                <p className="text-[9px] font-black tracking-[0.3em] text-[var(--dim)]">ON THE ROPE</p>
                <p className="display tabular text-4xl" style={{ color: roe >= 0 ? "var(--up)" : "var(--down)" }}>
                  {usd(live.stake * (1 + roe))}
                </p>
                <p className="tabular text-sm font-black" style={{ color: roe >= 0 ? "var(--up)" : "var(--down)" }}>
                  {pct(roe)} · {(1 + roe).toFixed(2)}× of {usd(live.stake)}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <KV k="ROUTE" v={`${live.base} ${live.side === "UP" ? "▲ LONG" : "▼ SHORT"}`} />
                  <KV k="ROPE" v={`${live.rope}×`} />
                  <KV k="SIZE" v={`${live.qty.toPrecision(4)} ${live.base}`} />
                  <KV k="FEES" v={usd(live.fees)} />
                  <KV k="PEAK" v={`${live.peak.toFixed(2)}×`} />
                  <KV k="OPEN TX" v={<a className="underline" href={`${EXPLORER}/tx/${live.openTx}`} target="_blank" rel="noreferrer">{live.openTx.slice(0, 10)}…</a>} />
                </dl>
                {live.tieTo && (
                  <p className="mt-2 text-[11px] text-[var(--dim)]">
                    Tied in behind <b className="text-[var(--text)]">{short(live.tieTo)}</b>:{" "}
                    {leader === null ? "…" : leader === 0 ? "they are off the wall" : `${leader > 0 ? "▲" : "▼"} ${Math.abs(leader).toPrecision(4)} ${live.base}`}
                    <label className="ml-2 inline-flex items-center gap-1">
                      <input type="checkbox" checked={followBail} onChange={(e) => setFollowBail(e.target.checked)} /> bail when they bail
                    </label>
                  </p>
                )}
              </div>
              <button
                onClick={() => bail("bailed", "you bailed")}
                disabled={!!busy}
                className="chamfer w-full py-5 text-center disabled:opacity-60"
                style={{ background: "var(--gold)", color: "#000", boxShadow: "0 0 40px var(--gold-glow)" }}
              >
                <span className="display block text-3xl">{busy ?? "BAIL"}</span>
                <span className="text-[11px] font-black tracking-[0.2em]">
                  CLOSE AT MARKET · KEEP {usd(Math.max(0, live.stake * (1 + roe)))}
                </span>
              </button>
              <p className="text-[10px] leading-relaxed text-[var(--dim)]">
                The anchor auto-BAILs at {pct(ANCHOR)}
                {live.summit !== null ? `, the summit at ${pct(live.summit)}` : ""}, while this tab is open. The position is real and lives on your dreamDEX
                account, so you can also close it in the app.
              </p>
              {err && <ErrorBox msg={err} />}
              <ArenaStrip owner={owner} compact />
            </aside>
          </div>
        ) : done ? (
          <Result d={done} name={me?.name ?? "you"} art={me?.art ?? art} owner={owner} onAgain={() => setDone(null)} />
        ) : (
          <div className="mx-auto max-w-3xl">
            <h1 className="display text-3xl sm:text-5xl">ROPE UP</h1>
            <p className="mt-1 text-sm text-[var(--dim)]">
              Climb a real perp on your own dreamDEX account. Your climber&apos;s height is the position&apos;s return, the anchor auto-BAILs before the fall, and
              every BAIL is a closed trade toward your Perps Arena minimums.
            </p>

            {ownerOk && link?.linked && (
              <div className="mt-4">
                <ArenaStrip owner={owner} bump={done ? 1 : 0} />
              </div>
            )}

            <Panel n={1} title="LINK YOUR CLIMBING KEY" done={step !== "link"}>
              <ol className="list-decimal space-y-2 pl-5 text-[13px]">
                <li>
                  This browser made you a climbing key:{" "}
                  <button className="tabular rounded border px-1.5 font-bold" style={{ borderColor: "var(--edge)" }} onClick={() => key && navigator.clipboard?.writeText(key)}>
                    {key ?? "…"} ⧉
                  </button>
                </li>
                <li>
                  In{" "}
                  <a className="underline" href="https://app.testnet.dreamdex.io" target="_blank" rel="noreferrer">
                    app.testnet.dreamdex.io
                  </a>{" "}
                  open your wallet → <b>Link a bot</b>, paste the key, keep <b>Perps</b> ticked, <b>Add bot</b>. That&apos;s it: ROPES finds your account
                  and sends the key its first gas.
                </li>
              </ol>
              {!ownerOk && (
                <div className="mt-3 flex items-center gap-2 text-[12px] font-bold text-[var(--dim)]">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--gold)" }} />
                  WATCHING THE CHAIN FOR YOUR LINK…
                  <button className="ml-auto text-[10px] underline" onClick={() => setManual((x) => !x)}>
                    {manual ? "hide" : "enter my account instead"}
                  </button>
                </div>
              )}
              {ownerOk && (
                <p className="tabular mt-3 text-[12px] font-bold text-[var(--up)]">
                  ✓ LINKED TO {short(owner)}{" "}
                  <button className="ml-2 text-[10px] font-normal text-[var(--dim)] underline" onClick={() => setManual((x) => !x)}>
                    change
                  </button>
                </p>
              )}
              {manual && (
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value.trim())}
                  placeholder="your dreamDEX account 0x… (top of the wallet panel)"
                  className="tabular mt-2 block w-full rounded border bg-transparent px-2 py-1.5 text-[13px]"
                  style={{ borderColor: ownerOk ? "var(--gold)" : "var(--edge)" }}
                />
              )}
              {ownerOk && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <Check ok={!!link?.linked} label={link ? (link.linked ? "KEY LINKED" : "NOT LINKED YET") : "CHECKING…"} />
                  <Check
                    ok={(link?.gas ?? 0) >= MIN_GAS_STT}
                    label={drip === "sending" ? "SENDING GAS…" : `GAS ${link ? link.gas.toFixed(3) : "…"} STT${drip === "sent" ? " · FROM ROPES" : ""}`}
                  />
                  <Check ok={(link?.equity ?? 0) > 1} label={`MARGIN ${link ? usd(link.equity) : "…"}`} />
                </div>
              )}
              {drip === "failed" && (link?.gas ?? 0) < MIN_GAS_STT && (
                <p className="mt-2 text-[11px] text-[var(--gold)]">
                  The ROPES gas tank couldn&apos;t top this key up. In the app, use <b>Send it … for gas</b> on the bot (0.5 STT is about ten climbs).
                </p>
              )}
              <p className="mt-2 text-[10px] text-[var(--dim)]">
                The key can only place and cancel perp orders for your account. It can never withdraw. It lives only in this browser —{" "}
                <button className="underline" onClick={() => navigator.clipboard?.writeText(exportKey() ?? "")}>
                  copy it
                </button>{" "}
                to back it up, and unlink it in the app any time.
              </p>
            </Panel>

            <Panel n={2} title="YOUR CLIMBER" done={step === "route"} off={step === "link"}>
              <div className="flex flex-wrap gap-2">
                {ART.map((a) => (
                  <button key={a} onClick={() => setArt(a)} className="rounded border p-1" style={{ borderColor: a === art ? "var(--gold)" : "var(--edge)" }}>
                    <img src={`/climbers/${a}/cheer.webp`} alt={a} className="h-14 w-auto" />
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="climber name"
                  maxLength={16}
                  className="flex-1 rounded border bg-transparent px-2 py-1.5 text-[13px]"
                  style={{ borderColor: "var(--edge)" }}
                />
                <button onClick={register} disabled={!link?.linked || !!busy} className="chamfer-sm px-4 text-[12px] font-black tracking-[0.2em] disabled:opacity-40" style={{ background: "var(--gold)", color: "#000" }}>
                  {me ? "SAVE" : "SIGN IN"}
                </button>
              </div>
            </Panel>

            <Panel n={3} title={tieTo ? `TIE IN BEHIND ${short(tieTo)}` : "PICK YOUR ROUTE"} off={!ready}>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {markets.map((x) => (
                  <button
                    key={x.base}
                    onClick={() => setBase(x.base)}
                    className="chamfer-sm shrink-0 border px-2.5 py-1 text-left"
                    style={{ borderColor: x.base === base ? "var(--gold)" : "var(--edge)", background: x.base === base ? "#ffc94d14" : "transparent" }}
                  >
                    <p className="text-[11px] font-black">{x.base}</p>
                    <p className="tabular text-[9px] text-[var(--dim)]">{px(x.mark ?? 0)}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["UP", "DOWN"] as const).map((sd) => (
                  <button
                    key={sd}
                    onClick={() => setSide(sd)}
                    className="chamfer py-3 text-center"
                    style={{
                      border: `2px solid ${sd === side ? (sd === "UP" ? "var(--up)" : "var(--down)") : "var(--edge)"}`,
                      background: sd === side ? (sd === "UP" ? "#00e58a1a" : "#ff2f521a") : "transparent",
                    }}
                  >
                    <span className="display text-2xl" style={{ color: sd === "UP" ? "var(--up)" : "var(--down)" }}>
                      {sd === "UP" ? "▲ UP" : "▼ DOWN"}
                    </span>
                    <span className="block text-[10px] font-bold text-[var(--dim)]">{sd === "UP" ? "long — climb as it rises" : "short — climb as it falls"}</span>
                  </button>
                ))}
              </div>
              <Choice label="ROPE (LEVERAGE)" opts={ROPES} v={rope} set={setRope} fmt={(x) => `${x}×`} />
              <Choice label="STAKE (USDso MARGIN)" opts={STAKES} v={stake} set={setStake} fmt={(x) => `${x}`} />
              <Choice label="SUMMIT (AUTO-BAIL IN PROFIT)" opts={SUMMITS} v={summit} set={setSummit} fmt={(x) => (x === null ? "NONE" : pct(x))} />
              {m && mark && (
                <p className="tabular mt-3 text-[11px] text-[var(--dim)]">
                  {usd(stake * rope)} of {m.base} at {px(mark)} · anchor at {px(mark * (1 - ((side === "UP" ? 1 : -1) * -ANCHOR) / rope))} (
                  {((-ANCHOR / rope) * 100).toFixed(1)}% against you)
                  {summit !== null ? ` · summit at ${px(mark * (1 + ((side === "UP" ? 1 : -1) * summit) / rope))}` : ""}
                </p>
              )}
              <button
                onClick={climb}
                disabled={!ready || !!busy || !mark}
                className="chamfer mt-3 w-full py-4 disabled:opacity-40"
                style={{ background: "var(--gold)", color: "#000", boxShadow: ready ? "0 0 40px var(--gold-glow)" : "none" }}
              >
                <span className="display text-3xl">{busy ?? "CLIMB"}</span>
              </button>
              {err && <ErrorBox msg={err} />}
            </Panel>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

function Result({ d, name, art, owner, onAgain }: { d: Done; name: string; art: string; owner: string; onAgain: () => void }) {
  const won = d.roe >= 0;
  const [shared, setShared] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-xl py-6 text-center">
      <img src={`/climbers/${art}/${d.status === "ground" ? "fall" : won ? "cheer" : "slip"}.webp`} alt="" className="mx-auto h-40 w-auto" />
      <p className="mt-2 text-[11px] font-black tracking-[0.3em] text-[var(--dim)]">{d.why.toUpperCase()}</p>
      <p className="display tabular text-6xl" style={{ color: won ? "var(--up)" : "var(--down)" }}>
        {pct(d.roe)}
      </p>
      <p className="tabular text-sm text-[var(--dim)]">
        {d.live.base} {d.live.side === "UP" ? "▲" : "▼"} {d.live.rope}× · in {px(d.live.entry)} → out {px(d.exitPx)} · banked {usd(Math.max(0, d.live.stake * (1 + d.roe)))} of{" "}
        {usd(d.live.stake)}
      </p>
      <p className="mt-1 text-[11px] text-[var(--dim)]">
        <a className="underline" href={`${EXPLORER}/tx/${d.live.openTx}`} target="_blank" rel="noreferrer">
          open tx
        </a>
        {d.exitTx && (
          <>
            {" · "}
            <a className="underline" href={`${EXPLORER}/tx/${d.exitTx}`} target="_blank" rel="noreferrer">
              bail tx
            </a>
          </>
        )}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={onAgain} className="chamfer py-3 text-[13px] font-black tracking-[0.2em]" style={{ background: "var(--gold)", color: "#000" }}>
          CLIMB AGAIN
        </button>
        <button
          onClick={async () =>
            setShared(
              await shareRunCard({ name, climber: art, multiple: 1 + d.roe, route: `${d.live.base} ${d.live.side === "UP" ? "▲" : "▼"} ${d.live.rope}× ROPE`, status: d.status === "ground" ? "eliminated" : "banked" }).catch(
                () => "failed",
              ),
            )
          }
          className="chamfer border py-3 text-[13px] font-black tracking-[0.2em]"
          style={{ borderColor: "var(--edge)" }}
        >
          {shared === "copied" ? "COPIED ✓" : shared === "downloaded" ? "SAVED ✓" : "SHARE CARD"}
        </button>
      </div>
      {d.exitTx && (
        <div className="mt-5 text-left">
          <ArenaStrip owner={owner} bump={1} />
        </div>
      )}
      <Link href="/" className="mt-3 inline-block text-[11px] font-bold tracking-[0.2em] text-[var(--dim)] underline">
        BACK TO THE CRAG
      </Link>
    </div>
  );
}

function Panel({ n, title, done, off, children }: { n: number; title: string; done?: boolean; off?: boolean; children: React.ReactNode }) {
  return (
    <div className="chamfer mt-4 border p-4" style={{ borderColor: done ? "#00e58a55" : "var(--edge)", background: "var(--panel)", opacity: off ? 0.45 : 1 }}>
      <p className="mb-2 text-[11px] font-black tracking-[0.3em]" style={{ color: done ? "var(--up)" : "var(--gold)" }}>
        {done ? "✓" : n} · {title}
      </p>
      <div className={off ? "pointer-events-none" : ""}>{children}</div>
    </div>
  );
}

function Choice<T>({ label, opts, v, set, fmt }: { label: string; opts: T[]; v: T; set: (x: T) => void; fmt: (x: T) => string }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[9px] font-black tracking-[0.3em] text-[var(--dim)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button
            key={String(o)}
            onClick={() => set(o)}
            className="chamfer-sm tabular border px-3 py-1.5 text-[12px] font-black"
            style={{ borderColor: o === v ? "var(--gold)" : "var(--edge)", color: o === v ? "var(--gold)" : "var(--text)" }}
          >
            {fmt(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="chamfer-sm border px-2 py-1.5 text-center font-black tracking-[0.15em]" style={{ borderColor: ok ? "var(--up)" : "var(--edge)", color: ok ? "var(--up)" : "var(--dim)" }}>
      {ok ? "✓ " : ""}
      {label}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[9px] font-black tracking-[0.2em] text-[var(--dim)]">{k}</dt>
      <dd className="tabular font-bold">{v}</dd>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p className="mt-2 rounded border px-3 py-2 text-[12px]" style={{ borderColor: "var(--down)", color: "var(--down)" }}>
      {msg}
    </p>
  );
}

