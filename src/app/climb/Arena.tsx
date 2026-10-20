"use client";

import { usePoll } from "../ui";

interface ArenaState {
  weekEnds: number;
  closes: number;
  days: string[];
  today: number;
  need: { closes: number; days: number };
  qualified: boolean;
  streak: number;
}

/** Where this account stands on the Perps Arena minimums this week. Every BAIL is a close. */
export function ArenaStrip({ owner, compact = false, bump = 0 }: { owner: string; compact?: boolean; bump?: number }) {
  const a = usePoll<ArenaState>(owner ? `/api/arena?owner=${owner}&b=${bump}` : null, 20_000, (j) => typeof j?.closes === "number");
  if (!a) return null;
  const left = Math.max(0, a.weekEnds - Date.now());
  const ends = left > 86_400_000 ? `${Math.floor(left / 86_400_000)}d ${Math.floor((left % 86_400_000) / 3_600_000)}h` : `${Math.floor(left / 3_600_000)}h`;
  const tip = a.qualified
    ? "qualified for this week's board"
    : a.days.length < a.need.days && a.today > 0
      ? "come back tomorrow for another day"
      : a.closes < a.need.closes
        ? `${a.need.closes - a.closes} more ${a.need.closes - a.closes === 1 ? "BAIL" : "BAILs"} to qualify`
        : `${a.need.days - a.days.length} more ${a.need.days - a.days.length === 1 ? "day" : "days"} to qualify`;
  return (
    <div className="chamfer border px-4 py-3" style={{ borderColor: a.qualified ? "#00e58a66" : "var(--edge)", background: "var(--panel)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-black tracking-[0.3em] text-[var(--gold)]">PERPS ARENA · THIS WEEK</p>
        <p className="tabular text-[10px] font-bold text-[var(--dim)]">ends in {ends}</p>
      </div>
      <div className={`mt-2 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
        <Meter label="CLOSES" v={a.closes} of={a.need.closes} />
        <Meter label="DAYS" v={a.days.length} of={a.need.days} />
        {!compact && (
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-[var(--dim)]">STREAK</p>
            <p className="display tabular text-xl" style={{ color: a.streak ? "var(--gold)" : "var(--dim)" }}>
              {a.streak} {a.streak === 1 ? "day" : "days"}
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] font-bold" style={{ color: a.qualified ? "var(--up)" : "var(--text)" }}>
        {a.qualified ? "✓ " : ""}
        {tip}
      </p>
    </div>
  );
}

function Meter({ label, v, of }: { label: string; v: number; of: number }) {
  const k = Math.min(1, v / of);
  return (
    <div>
      <p className="text-[9px] font-black tracking-[0.25em] text-[var(--dim)]">{label}</p>
      <p className="display tabular text-xl" style={{ color: k >= 1 ? "var(--up)" : "var(--text)" }}>
        {v}
        <span className="text-sm text-[var(--dim)]">/{of}</span>
      </p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-[#ffffff10]">
        <div className="h-full rounded" style={{ width: `${k * 100}%`, background: k >= 1 ? "var(--up)" : "var(--gold)", transition: "width 600ms" }} />
      </div>
    </div>
  );
}
