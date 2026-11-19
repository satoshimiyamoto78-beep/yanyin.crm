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
}: {
  rows: T[];
  cols: RCol<T>[];
  rowKey: (r: T) => string;
  onRow?: (r: T) => void;
  initialSort?: { key: string; dir: 1 | -1 };
  dense?: boolean;
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
  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
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
