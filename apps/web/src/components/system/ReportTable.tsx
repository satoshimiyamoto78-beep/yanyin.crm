"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * A report table: dense rows, numbers right-aligned in tabular figures, the
 * first column stays put while the rest scroll sideways on a phone, every
 * column sorts, a totals row at the bottom, a row opens its breakdown.
 * Used by Reports and Finance, where the numbers are the point.
 */

export type RCol<T> = {
  key: string;
  label: string;
  value?: (r: T) => number | string;
  render?: (r: T) => ReactNode;
  total?: ReactNode;
  /** What a phone card shows instead of `render` (shorter figures). */
  mobile?: (r: T) => ReactNode;
  align?: "left" | "right";
  width?: number;
};

export function ReportTable<T>({
  rows,
  cols,
  rowKey,
  onRow,
  initialSort,
  dense,
  primary,
  mobileHide = [],
}: {
  rows: T[];
  cols: RCol<T>[];
  rowKey: (r: T) => string;
  onRow?: (r: T) => void;
  initialSort?: { key: string; dir: 1 | -1 };
  dense?: boolean;
  /** The column shown big on the right of a phone card (default: the second). */
  primary?: string;
  /** Columns left out of the phone cards. */
  mobileHide?: string[];
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const col = cols.find((c) => c.key === sort?.key);
  const list = col?.value
    ? [...rows].sort(
        (a, b) =>
          (col.value!(a) > col.value!(b)
            ? 1
            : col.value!(a) < col.value!(b)
              ? -1
              : 0) * sort!.dir,
      )
    : rows;
  const hasTotal = cols.some((c) => c.total !== undefined);
  const cell = (c: RCol<T>, i: number) =>
    `${i === 0 ? "sticky left-0 z-[1] bg-inherit pr-3 pl-4 text-left" : "px-3"} ${c.align === "left" ? "text-left" : i ? "text-right tabular-nums" : ""} whitespace-nowrap`;
  const main = cols.find((c) => c.key === primary) ?? cols[1];
  const rest = cols.filter(
    (c, i) => i > 0 && c !== main && !mobileHide.includes(c.key),
  );
  // Phones: long sums read short ("24,137,128" → "24.1M").
  const short = (v: ReactNode): ReactNode => {
    if (typeof v !== "string" && typeof v !== "number") return v;
    const raw = String(v);
    const m = /^([−-]?)([\d,]+)( ₫)?$/.exec(raw);
    if (!m) return v;
    const n = Number(m[2]!.replace(/,/g, ""));
    if (n < 100_000) return v;
    const t =
      n >= 1e9
        ? `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")}B`
        : n >= 1e6
          ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`
          : `${Math.round(n / 1000)}k`;
    return `${m[1]}${t}${m[3] ?? ""}`;
  };
  const show = (c: RCol<T>, r: T) =>
    c.mobile ? c.mobile(r) : short(c.render ? c.render(r) : c.value?.(r));
  return (
    <>
      {/* Phones: each row is a card — the name and its main figure, the rest as a small grid. */}
      <div className="grid gap-1.5 sm:hidden">
        {cols.some((c) => c.value) && (
          <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
            {cols
              .filter((c) => c.value)
              .map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={sort?.key === c.key}
                  onClick={() => (
                    haptic("tick"),
                    setSort((s) =>
                      s?.key === c.key
                        ? { key: c.key, dir: s.dir === 1 ? -1 : 1 }
                        : { key: c.key, dir: -1 },
                    )
                  )}
                  className={`press flex h-8 shrink-0 items-center gap-0.5 rounded-full px-3 text-[12.5px] font-semibold ${sort?.key === c.key ? "chip-blue" : "bg-g-fill text-g-muted"}`}
                >
                  {c.label}
                  {sort?.key === c.key &&
                    (sort.dir === 1 ? (
                      <ArrowUp size={11} strokeWidth={2.6} />
                    ) : (
                      <ArrowDown size={11} strokeWidth={2.6} />
                    ))}
                </button>
              ))}
          </div>
        )}
        {list.map((r, n) => (
          <button
            key={rowKey(r)}
            type="button"
            disabled={!onRow}
            onClick={onRow ? () => (haptic("light"), onRow(r)) : undefined}
            className="press block w-full rounded-[18px] bg-g-fill px-3.5 py-3 text-left disabled:cursor-default"
            style={{
              animation: `rise 0.35s ${Math.min(n, 14) * 22}ms both cubic-bezier(0.22,1,0.36,1)`,
            }}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="live min-w-0 text-[15px] font-semibold">
                {show(cols[0]!, r)}
              </span>
              {main && (
                <span className="live shrink-0 text-[15px] font-bold tabular-nums">
                  {show(main, r)}
                </span>
              )}
            </span>
            {rest.length > 0 && (
              <span className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {rest.map((c) => (
                  <span
                    key={c.key}
                    className="flex min-w-0 items-baseline justify-between gap-2 text-[12.5px]"
                  >
                    <span className="truncate text-g-muted">{c.label}</span>
                    <span className="live shrink-0 font-medium tabular-nums">
                      {show(c, r)}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </button>
        ))}
        {hasTotal && (
          <div className="rounded-[18px] border-2 border-g-line px-3.5 py-3">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-bold">{cols[0]!.total}</span>
              {main && (
                <span className="text-[15px] font-bold tabular-nums">
                  {main.total}
                </span>
              )}
            </span>
            {rest.some((c) => c.total !== undefined) && (
              <span className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {rest
                  .filter((c) => c.total !== undefined)
                  .map((c) => (
                    <span
                      key={c.key}
                      className="flex items-baseline justify-between gap-2 text-[12.5px]"
                    >
                      <span className="truncate text-g-muted">{c.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {c.total}
                      </span>
                    </span>
                  ))}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="no-scrollbar hidden overflow-x-auto sm:block">
        <table className="w-full min-w-max border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="bg-[var(--g-bg)]">
              {cols.map((c, i) => (
                <th
                  key={c.key}
                  style={{ minWidth: c.width }}
                  className={`${cell(c, i)} pb-2 text-[11.5px] font-semibold tracking-[0.04em] text-g-muted uppercase`}
                >
                  {c.value ? (
                    <button
                      type="button"
                      onClick={() => (
                        haptic("tick"),
                        setSort((s) =>
                          s?.key === c.key
                            ? { key: c.key, dir: s.dir === 1 ? -1 : 1 }
                            : { key: c.key, dir: -1 },
                        )
                      )}
                      className={`inline-flex items-center gap-0.5 uppercase ${sort?.key === c.key ? "text-g-blue" : ""}`}
                    >
                      {c.label}
                      {sort?.key === c.key &&
                        (sort.dir === 1 ? (
                          <ArrowUp size={11} strokeWidth={2.6} />
                        ) : (
                          <ArrowDown size={11} strokeWidth={2.6} />
                        ))}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r, n) => (
              <tr
                key={rowKey(r)}
                onClick={onRow ? () => (haptic("light"), onRow(r)) : undefined}
                className={`group bg-[var(--g-bg)] ${onRow ? "cursor-pointer" : ""}`}
                style={{
                  animation: `rise 0.35s ${Math.min(n, 14) * 22}ms both cubic-bezier(0.22,1,0.36,1)`,
                }}
              >
                {cols.map((c, i) => (
                  <td
                    key={c.key}
                    className={`${cell(c, i)} border-t border-g-line ${dense ? "py-2" : "py-2.5"} transition-colors group-hover:bg-g-fill ${i === 0 ? "font-semibold" : ""}`}
                  >
                    <span className="live">
                      {c.render ? c.render(r) : c.value?.(r)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasTotal && (
            <tfoot>
              <tr className="bg-[var(--g-bg)]">
                {cols.map((c, i) => (
                  <td
                    key={c.key}
                    className={`${cell(c, i)} border-t-2 border-g-ink/15 py-2.5 font-bold`}
                  >
                    <span className="live">{c.total}</span>
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

/** A change against the previous period: green up, red down (or the reverse for costs). */
export function Delta({
  now,
  prev,
  costs = false,
}: {
  now: number;
  prev: number;
  costs?: boolean;
}) {
  if (!prev) return <span className="text-g-faint">—</span>;
  const d = Math.round(((now - prev) / Math.abs(prev)) * 1000) / 10;
  const good = costs ? d <= 0 : d >= 0;
  return (
    <span
      className={`font-semibold tabular-nums ${d === 0 ? "text-g-muted" : good ? "text-g-green" : "text-[#e5484d]"}`}
    >
      {d > 0 ? "+" : ""}
      {d}%
    </span>
  );
}
