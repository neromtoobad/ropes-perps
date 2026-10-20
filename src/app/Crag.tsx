"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CragClimber, FeedRow, MarketRow } from "./ui";
import { pct, px, short, usd } from "./ui";

/**
 * The Crag: dreamDEX's open perps as climbers on fixed lines.
 *
 * One rope per lane: a market on the "all" wall, LONGS and SHORTS on a single
 * market. A climber clips onto its lane's rope at the height of its return on
 * margin; when two would collide they take opposite sides of the rope. Height
 * is asinh of the return: linear near break-even, so +5% and −5% part ways,
 * logarithmic far out, so +500% still fits. The floor is −100%: margin gone.
 * Liquidations stream in over Somnia Reactivity and fall off their lane.
 */

export interface Lane {
  key: string;
  label: string;
  base: string;
  climbers: CragClimber[];
}

const TICKS = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 5];
const K = 3;
const LO = Math.asinh(-K);
const HI = Math.asinh(5 * K);
/** % from the bottom of the plot for a return on margin. */
export const heightPct = (roe: number) => 4 + ((Math.asinh(K * Math.max(-1, Math.min(5, roe))) - LO) / (HI - LO)) * 90;

import { ART, artFor, hash01 } from "@/lib/art";
export { ART, artFor, hash01 };

const AXIS = 52; // px, the y-axis column on the right
const FOOT = 46; // px, lane footers

interface Faller {
  id: string;
  lane: number;
  label: string;
  art: string;
  at: number;
}

export function Crag({
  lanes: allLanes,
  markets,
  feed,
  selected,
  onSelect,
  height = "clamp(460px, 66vh, 740px)",
}: {
  lanes: Lane[];
  markets?: MarketRow[];
  feed: FeedRow[];
  selected: string | null;
  onSelect: (c: CragClimber | null) => void;
  height?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  // Phones get fewer, wider lanes: a 375px wall cannot hold eight ropes.
  const boxRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1200);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lanes = useMemo(() => allLanes.slice(0, w < 560 ? 4 : w < 860 ? 6 : 8), [allLanes, w]);
  const n = Math.max(1, lanes.length);

  // Place each lane's climbers on its rope; collisions alternate sides.
  const placed = useMemo(
    () =>
      lanes.map((lane) => {
        const rows = lane.climbers.map((c) => ({ c, y: heightPct(c.roe), side: 0 })).sort((a, b) => a.y - b.y);
        let last = -99;
        let flip = 1;
        for (const r of rows) {
          if (r.y - last < 8) {
            flip = -flip;
            r.side = flip;
          } else {
            flip = hash01(r.c.id) > 0.5 ? 1 : -1;
            r.side = 0;
          }
          last = r.y;
        }
        return { lane, rows, top: rows.at(-1)?.c.id };
      }),
    [lanes],
  );

  // Liquidations that arrived since the last frame fall off their lane.
  const seen = useRef<Set<string> | null>(null);
  const [fallers, setFallers] = useState<Faller[]>([]);
  useEffect(() => {
    const falls = feed.filter((f) => f.kind === "fell");
    if (!seen.current) {
      seen.current = new Set(falls.map((f) => f.id));
      return;
    }
    const fresh = falls.filter((f) => !seen.current!.has(f.id)).slice(0, 3);
    fresh.forEach((f) => seen.current!.add(f.id));
    if (!fresh.length) return;
    setFallers((xs) => [
      ...xs.filter((x) => Date.now() - x.at < 2600),
      ...fresh.map((f) => {
        const i = lanes.findIndex((l) => l.base === f.base && (l.key === f.base || l.key === f.side));
        return {
          id: f.id,
          lane: i >= 0 ? i : Math.floor(hash01(f.account) * n),
          label: `${f.ropes ?? short(f.account)} · ${f.base} ${f.side === "UP" ? "▲" : "▼"} · ${usd(f.notional)}`,
          art: artFor(f.account),
          at: Date.now(),
        };
      }),
    ]);
  }, [feed, lanes, n]);
  useEffect(() => {
    if (!fallers.length) return;
    const t = setTimeout(() => setFallers((xs) => xs.filter((x) => Date.now() - x.at < 2600)), 2700);
    return () => clearTimeout(t);
  }, [fallers]);

  const mk = (b: string) => markets?.find((m) => m.base === b);

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-2xl border"
      style={{
        height,
        borderColor: "var(--edge)",
        background: "linear-gradient(180deg, #17122f 0%, #110d24 55%, #0b0917 100%)",
        boxShadow: "inset 0 2px 24px #000000aa",
      }}
      onClick={() => onSelect(null)}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="stars-far absolute inset-0 opacity-40" />
      </div>

      {/* the plot */}
      <div className="absolute left-0 top-3" style={{ right: AXIS, bottom: FOOT }}>
        {lanes.map((l, i) => (
          <div
            key={l.key}
            className="pointer-events-none absolute inset-y-0"
            style={{
              left: `${(i / n) * 100}%`,
              width: `${100 / n}%`,
              background: i % 2 ? "#ffffff05" : "transparent",
              borderLeft: i ? "1px solid #ffffff0a" : "none",
            }}
          />
        ))}

        {TICKS.map((m) => (
          <div key={m} className="pointer-events-none absolute inset-x-0" style={{ bottom: `${heightPct(m)}%` }}>
            <div
              className="h-px w-full"
              style={{
                background: m === 0 ? "repeating-linear-gradient(90deg, var(--gold) 0 8px, transparent 8px 16px)" : "#ffffff0d",
                opacity: m === 0 ? 0.55 : 1,
              }}
            />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[4%]" style={{ background: "linear-gradient(0deg, #ff2f5233, transparent)" }}>
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: "var(--down)", boxShadow: "0 0 12px var(--down)" }} />
        </div>

        {/* the fixed lines */}
        {lanes.map((l, i) => (
          <div
            key={l.key}
            className="pointer-events-none absolute bottom-0 top-0 w-[6px] -translate-x-1/2"
            style={{
              left: `${((i + 0.5) / n) * 100}%`,
              backgroundImage: "url(/climbers/gold/rope.webp)",
              backgroundRepeat: "repeat-y",
              backgroundSize: "100% auto",
              opacity: 0.28,
              filter: "grayscale(0.6)",
            }}
          />
        ))}

        {placed.map(({ rows, top }, i) =>
          rows.map(({ c, y, side }) => {
            const mine = !!c.ropes;
            const on = selected === c.id;
            const lit = on || hover === c.id;
            const showTag = lit || mine || c.id === top;
            const art = c.ropes?.art ?? artFor(c.account);
            const pose = c.roe > 1.5 ? "cheer" : c.roe < -0.6 ? "slip" : "climb";
            const h = mine ? 64 : 52;
            return (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(on ? null : c);
                }}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover((x) => (x === c.id ? null : x))}
                className="absolute flex flex-col items-center focus:outline-none"
                style={{
                  left: `calc(${((i + 0.5) / n) * 100}% + ${side * 24}px)`,
                  bottom: `calc(${y}% - ${Math.round(h * 0.5)}px)`,
                  transform: "translateX(-50%)",
                  transition: "bottom 1.2s cubic-bezier(0.25,0.8,0.25,1), left 0.6s ease",
                  zIndex: lit ? 40 : mine ? 30 : 10 + Math.round(y / 5),
                }}
                aria-label={`${c.base} ${c.side} ${pct(c.roe)}`}
                title={`${c.ropes?.name ?? short(c.account)} · ${c.base} ${c.side === "UP" ? "LONG" : "SHORT"} · ${pct(c.roe)} · ${usd(c.notional)}`}
              >
                <span
                  className="tabular mb-0.5 whitespace-nowrap rounded px-1 py-[1px] text-[9px] font-black leading-none"
                  style={{
                    visibility: showTag ? "visible" : "hidden",
                    ...(mine
                      ? { background: "var(--gold)", color: "#000" }
                      : {
                          background: "#0b0917e6",
                          color: c.roe >= 0 ? "var(--up)" : "var(--down)",
                          border: `1px solid ${lit ? "var(--gold)" : "#ffffff14"}`,
                        }),
                  }}
                >
                  {mine ? `${c.ropes!.name} ` : ""}
                  {c.side === "UP" ? "▲" : "▼"} {pct(c.roe)}
                </span>
                <img
                  src={`/climbers/${art}/${pose}.webp`}
                  alt=""
                  className={on ? "dangling" : ""}
                  style={{
                    height: h,
                    width: "auto",
                    transform: side > 0 ? "scaleX(-1)" : undefined,
                    filter: lit || mine ? "drop-shadow(0 0 10px var(--gold-glow))" : "drop-shadow(0 2px 4px #000a)",
                    opacity: hover && !lit && !mine ? 0.55 : 1,
                    transition: "opacity 200ms",
                  }}
                />
              </button>
            );
          }),
        )}

        {fallers.map((f) => (
          <div
            key={f.id}
            className="crag-fall pointer-events-none absolute flex flex-col items-center"
            style={{ left: `${((f.lane + 0.5) / n) * 100}%`, zIndex: 50 }}
          >
            <span className="whitespace-nowrap rounded px-1.5 py-[1px] text-[9px] font-black" style={{ background: "var(--down)", color: "#000" }}>
              LIQUIDATED · {f.label}
            </span>
            <img src={`/climbers/${f.art}/fall.webp`} alt="" style={{ height: 56, width: "auto" }} />
          </div>
        ))}
      </div>

      {/* y axis */}
      <div className="pointer-events-none absolute right-0 top-3" style={{ width: AXIS, bottom: FOOT }}>
        {TICKS.map((m) => (
          <span
            key={m}
            className="tabular absolute right-2 translate-y-1/2 text-[9px] font-bold tracking-[0.12em]"
            style={{ bottom: `${heightPct(m)}%`, color: m === 0 ? "var(--gold)" : "var(--dim)" }}
          >
            {m === 0 ? "0%" : `${m > 0 ? "+" : "−"}${Math.round(Math.abs(m) * 100)}%`}
          </span>
        ))}
        <span className="tabular absolute bottom-0 right-2 text-[9px] font-black tracking-[0.12em] text-[var(--down)]">FLOOR</span>
      </div>

      {/* lane footers */}
      <div className="pointer-events-none absolute bottom-0 left-0 flex" style={{ right: AXIS, height: FOOT }}>
        {lanes.map((l) => {
          const m = mk(l.base);
          const side = l.key === "UP" || l.key === "DOWN";
          return (
            <div key={l.key} className="flex min-w-0 flex-1 flex-col items-center justify-center border-t" style={{ borderColor: "#ffffff10" }}>
              <p
                className="truncate text-[11px] font-black tracking-[0.18em]"
                style={{ color: l.key === "UP" ? "var(--up)" : l.key === "DOWN" ? "var(--down)" : "var(--text)" }}
              >
                {l.label}
              </p>
              <p className="tabular max-w-full truncate px-1 text-[9px] font-bold text-[var(--dim)]">
                {side
                  ? `${((l.key === "UP" ? m?.longs : m?.shorts) ?? 0).toLocaleString()} open`
                  : m
                    ? n > 4 ? `${px(m.mark ?? 0)} · ▲${m.longs} ▼${m.shorts}` : px(m.mark ?? 0)
                    : ""}
              </p>
            </div>
          );
        })}
      </div>

      {!lanes.some((l) => l.climbers.length) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black tracking-[0.3em] text-[var(--dim)]">ROPING UP THE WALL — READING EVERY POSITION FROM CHAIN…</span>
        </div>
      )}
    </div>
  );
}

/** Lanes for a list of climbers: one per market. */
export function lanesByMarket(climbers: CragClimber[]): Lane[] {
  const by = new Map<string, CragClimber[]>();
  for (const c of climbers) by.set(c.base, [...(by.get(c.base) ?? []), c]);
  return [...by.entries()].map(([b, cs]) => ({ key: b, label: b, base: b, climbers: cs }));
}
