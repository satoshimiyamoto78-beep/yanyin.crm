"use client";

import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  QrCode,
  Scale,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MenuItem, Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { rnd } from "@/lib/demo-money";
import { RECIPES, STOCK } from "@/lib/demo-stock";
import { TEAM } from "@/lib/demo-team";
import {
  VENUE_STATIONS,
  type KdsLine,
  type KdsOrder,
} from "@/lib/demo-kitchen";
import { useLongPress } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { ArtTile } from "@/components/system/Art";
import { NorthSky } from "@/components/system/NorthSky";
import { PersonPic } from "@/components/system/PersonPic";
import { useDish, useTr } from "@/components/crew/prefs";

/*
 * The station screen's parts (docs/07 §87): tickets packed like Tetris with
 * no holes, a dense ticket (table, where it came from, age as a thin bar on
 * the top edge, one row per dish with a small action), holding a dish opens
 * its tech card, the pass as a slim list, and the station picker.
 */

/** Packs children into columns, each next card into the shortest one, so there are no gaps. */
export function Masonry<T>({
  items,
  keyOf,
  weight,
  render,
  min = 300,
  gap = 12,
}: {
  items: T[];
  keyOf: (t: T) => string;
  weight: (t: T) => number;
  render: (t: T) => ReactNode;
  min?: number;
  gap?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () =>
      setCols(Math.max(1, Math.floor((el.clientWidth + gap) / (min + gap))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, gap]);
  const heights = Array<number>(cols).fill(0);
  const columns: T[][] = Array.from({ length: cols }, () => []);
  items.forEach((it) => {
    const i = heights.indexOf(Math.min(...heights));
    columns[i]!.push(it);
    heights[i]! += weight(it);
  });
  return (
    <div ref={ref} className="flex min-w-0 items-start" style={{ gap }}>
      {columns.map((c, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
          {c.map((it) => (
            <div key={keyOf(it)} className="min-w-0">
              {render(it)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** How tall a ticket is, roughly, for packing. */
export const ticketWeight = (o: KdsOrder, station: Station) =>
  86 +
  o.lines.filter((l) => l.station === station).length * 50 +
  (o.lines.some((l) => l.station !== station && l.state !== "ready") ? 26 : 0);

const ageTone = (min: number) =>
  min >= 15 ? "late" : min >= 8 ? "long" : "ok";

export function Ticket({
  order: o,
  station,
  minute,
  elapsed,
  fresh,
  leaving,
  stop,
  onLine,
  onAll,
  onInfo,
}: {
  order: KdsOrder;
  station: Station;
  minute: number;
  elapsed: ReactNode;
  fresh: boolean;
  leaving?: boolean;
  stop: string[];
  onLine: (l: KdsLine) => void;
  onAll: () => void;
  onInfo: (l: KdsLine) => void;
}) {
  const tr = useTr();
  const lines = o.lines.filter((l) => l.station === station);
  const other = o.lines.filter(
    (l) => l.station !== station && l.state !== "ready",
  );
  const [h, m] = o.at.split(":").map(Number);
  const min = Math.max(0, minute - (h! * 60 + m!));
  const tone = ageTone(min);
  const left = lines.filter((l) => l.state !== "ready").length;
  const bar = { ok: "bg-g-blue", long: "bg-g-orange", late: "bg-[#e5484d]" }[
    tone
  ];
  return (
    <section
      className={`relative overflow-hidden rounded-[22px] bg-g-fill ${leaving ? "animate-leave" : fresh ? "animate-pop" : ""} ${tone === "late" ? "ring-2 ring-[#e5484d]/60" : ""}`}
    >
      {/* Age as a thin bar along the top edge: full at 15 minutes. */}
      <span className="absolute inset-x-0 top-0 h-[3px] bg-g-card" aria-hidden>
        <span
          className={`block h-full transition-[width] duration-700 ${bar}`}
          style={{ width: `${Math.min(100, Math.max(4, (min / 15) * 100))}%` }}
        />
      </span>
      <header className="flex items-center gap-2 px-3.5 pt-3.5">
        <span className="text-[21px] leading-none font-bold tracking-[-0.03em] tabular-nums">
          {tr("Table {n}", { n: o.table })}
        </span>
        {o.guest ? (
          <span className="chip-blue inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold">
            <QrCode size={12} strokeWidth={2.4} /> {tr("QR guest")}
          </span>
        ) : (
          <span className="inline-flex h-6 items-center rounded-full bg-g-card px-2 text-[11.5px] font-semibold text-g-ink-2">
            @{o.waiter}
          </span>
        )}
        <span className="ml-auto">{elapsed}</span>
      </header>
      <p className="px-3.5 pt-1 text-[12px] text-g-muted tabular-nums">
        {o.at}
        {o.guest ? ` · ${tr("brings")} @${o.waiter}` : ""}
      </p>
      <div className="mx-2 mt-2.5 overflow-hidden rounded-[16px] bg-g-card">
        {lines.map((l, i) => (
          <Line
            key={l.id}
            l={l}
            first={i === 0}
            out={stop.includes(l.itemId)}
            onTap={() => onLine(l)}
            onHold={() => onInfo(l)}
          />
        ))}
      </div>
      {(other.length > 0 || left > 1) && (
        <div className="flex items-center gap-2 px-3.5 pt-2">
          {other.length > 0 && (
            <p className="min-w-0 flex-1 truncate text-[12px] text-g-muted">
              {tr("Also")}:{" "}
              {[...new Set(other.map((l) => l.station))]
                .map(
                  (s) =>
                    `${tr(VENUE_STATIONS.find((v) => v.id === s)?.label ?? "")} ${other.filter((l) => l.station === s).reduce((n, l) => n + l.qty, 0)}`,
                )
                .join(" · ")}
            </p>
          )}
          {left > 1 && (
            <button
              type="button"
              onClick={() => (haptic("success"), onAll())}
              className="press ml-auto flex h-8 shrink-0 items-center gap-1 rounded-full bg-g-ink px-3 text-[12.5px] font-semibold text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]"
            >
              <Check size={14} strokeWidth={2.8} /> {tr("All")} · {left}
            </button>
          )}
        </div>
      )}
      <div className="h-3" />
    </section>
  );
}

/** One dish: tap moves it on (start, ready), hold opens its tech card. */
function Line({
  l,
  first,
  out,
  onTap,
  onHold,
}: {
  l: KdsLine;
  first: boolean;
  out: boolean;
  onTap: () => void;
  onHold: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const press = useLongPress(
    () => (haptic("light"), onHold()),
    () => l.state !== "ready" && onTap(),
  );
  const qtyInk = {
    new: "text-g-blue",
    making: "text-g-orange",
    ready: "text-g-green",
  }[l.state];
  return (
    <button
      type="button"
      {...press}
      className={`press flex min-h-[48px] w-full min-w-0 items-center gap-2 py-1.5 pr-1.5 pl-3 text-left ${first ? "" : "border-t border-g-line"} ${l.state === "ready" ? "opacity-55" : ""}`}
    >
      <span
        className={`w-7 shrink-0 text-[15px] font-bold tabular-nums ${qtyInk}`}
      >
        {l.qty}×
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`line-clamp-2 text-[15px] leading-[1.2] font-semibold break-words ${l.state === "ready" ? "text-g-muted line-through decoration-1" : ""}`}
        >
          {dish(l.name)}
        </span>
        {l.note && (
          <span className="block truncate text-[12px] font-semibold text-g-orange">
            {tr(l.note)}
          </span>
        )}
        {out && (
          <span className="block truncate text-[12px] font-semibold text-[#ef4444]">
            {tr("In the stop-list")}
          </span>
        )}
      </span>
      {l.state === "new" && (
        <span className="h-8 w-[66px] shrink-0 rounded-full bg-g-fill text-center text-[12.5px] leading-8 font-semibold">
          {tr("Start")}
        </span>
      )}
      {l.state === "making" && (
        <span className="blue-grad h-8 w-[66px] shrink-0 rounded-full text-center text-[12.5px] leading-8 font-semibold">
          {tr("Ready")}
        </span>
      )}
      {l.state === "ready" && (
        <span className="chip-green grid h-8 w-[66px] shrink-0 place-items-center rounded-full">
          <Check size={15} strokeWidth={2.8} />
        </span>
      )}
    </button>
  );
}

/** The pass: what is done and waits to be carried out. Slim rows, a small "Served". */
export function Pass({
  ready,
  station,
  onServed,
}: {
  ready: KdsOrder[];
  station: Station;
  onServed: (id: string) => void;
}) {
  const tr = useTr();
  return (
    <div className="rounded-[22px] bg-g-fill p-3">
      <div className="flex items-center gap-2 px-1">
        <span className="chip-green grid size-7 place-items-center rounded-full">
          <UtensilsCrossed size={14} strokeWidth={2.4} />
        </span>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          {tr("At the pass")}
        </p>
        <span
          className={`live text-[15px] font-bold tabular-nums ${ready.length ? "text-g-green" : "text-g-muted"}`}
        >
          {ready.length}
        </span>
      </div>
      {ready.length ? (
        <div className="mt-2 overflow-hidden rounded-[16px] bg-g-card">
          {ready.map((o, i) => (
            <div
              key={o.id}
              className={`animate-pop flex min-h-[46px] items-center gap-2 py-1 pr-1.5 pl-3 ${i ? "border-t border-g-line" : ""}`}
            >
              <span className="min-w-0 flex-1 truncate text-[14px]">
                <b className="font-semibold tabular-nums">
                  {tr("Table {n}", { n: o.table })}
                </b>
                <span className="text-g-muted">
                  {" "}
                  · @{o.waiter} ·{" "}
                  {o.lines
                    .filter((l) => l.station === station)
                    .reduce((n, l) => n + l.qty, 0)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => (haptic("success"), onServed(o.id))}
                className="press chip-green h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold"
              >
                {tr("Served")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 px-1 text-[13px] text-g-muted">
          {tr("Nothing waiting at the pass")}
        </p>
      )}
    </div>
  );
}

/** A tech card for the demo: the real one when the venue has it, otherwise built from the stock by station. */
function techCard(item: MenuItem | undefined, name: string, station: Station) {
  const recipe = RECIPES.find(
    (r) => r.dish.toLowerCase() === name.toLowerCase(),
  );
  if (recipe)
    return recipe.uses.map(([id, q]) => ({
      s: STOCK.find((x) => x.id === id)!,
      q,
    }));
  const pool = STOCK.filter((s) =>
    station === "bar"
      ? s.cat === "Drinks" || s.cat === "Dairy"
      : station === "cold"
        ? s.cat === "Vegetables" || s.cat === "Dairy"
        : s.cat !== "Drinks",
  );
  const key = item?.id ?? name;
  const n = 3 + Math.floor(rnd(key) * 3);
  return [...pool]
    .sort((a, b) => rnd(key + a.id) - rnd(key + b.id))
    .slice(0, n)
    .map((s, i) => ({
      s,
      q:
        s.unit === "pcs"
          ? 1
          : Math.round((0.03 + rnd(key + i) * 0.17) * 100) / 100,
    }));
}

/** Held dish: photo, portion, the tech card with grams, the steps and the target time. */
export function DishInfo({
  line,
  item,
  station,
  out,
  onStop,
  onClose,
}: {
  line: KdsLine;
  item?: MenuItem;
  station: Station;
  out: boolean;
  onStop: () => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const name = dish(line.name);
  const card = techCard(item, line.name.en ?? name, station);
  const grams = Math.round(
    card.reduce((n, c) => n + (c.s.unit === "pcs" ? 330 : c.q * 1000), 0),
  );
  const target = station === "bar" ? 4 : station === "cold" ? 7 : 12;
  return (
    <Sheet open onClose={onClose} label={name}>
      <div className="grid gap-4 px-5 pt-2 pb-10">
        {item?.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo}
            alt=""
            className="aspect-[16/9] w-full rounded-[22px] object-cover"
          />
        )}
        <div>
          <p className="text-[13px] font-semibold text-g-blue">
            {line.qty}× ·{" "}
            {tr(VENUE_STATIONS.find((v) => v.id === station)?.label ?? "")}
          </p>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {name}
          </h2>
          {line.note && (
            <p className="mt-1 text-[15px] font-semibold text-g-orange">
              {tr(line.note)}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            [
              Scale,
              tr("Portion"),
              station === "bar"
                ? `${grams} ${tr("ml")}`
                : `${grams} ${tr("g")}`,
            ],
            [Timer, tr("Target"), tr("{n} min", { n: target })],
            [Clock, tr("Total"), `${line.qty} × ${grams}`],
          ].map(([I, k, v], i) => {
            const Icon = I as typeof Scale;
            return (
              <div key={i} className="rounded-[18px] bg-g-fill p-3">
                <Icon size={16} className="text-g-blue" />
                <p className="mt-1 text-[11.5px] font-semibold text-g-muted">
                  {k as string}
                </p>
                <p className="text-[16px] font-bold tabular-nums">
                  {v as string}
                </p>
              </div>
            );
          })}
        </div>
        <div>
          <p className="px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Tech card · one portion")}
          </p>
          <div className="mt-1.5 overflow-hidden rounded-[20px] bg-g-fill">
            {card.map((c, i) => (
              <div
                key={c.s.id}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[15px] ${i ? "border-t border-g-line" : ""}`}
              >
                <span className="font-medium">{tr(c.s.name)}</span>
                <span className="font-semibold tabular-nums">
                  {c.s.unit === "kg"
                    ? `${Math.round(c.q * 1000)} ${tr("g")}`
                    : c.s.unit === "l"
                      ? `${Math.round(c.q * 1000)} ${tr("ml")}`
                      : `${c.q} ${tr("pcs")}`}
                </span>
              </div>
            ))}
          </div>
        </div>
        {item?.description && (
          <div>
            <p className="px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("What the guest reads")}
            </p>
            <p className="mt-1.5 rounded-[20px] bg-g-fill px-4 py-3 text-[14.5px] text-g-ink-2">
              {dish(item.description)}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => (haptic(out ? "light" : "success"), onStop())}
          className={`press flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold ${out ? "bg-g-fill" : "chip-red"}`}
        >
          {out ? <Check size={17} /> : <Ban size={17} />}{" "}
          {tr(out ? "Back on" : "Ran out · stop-list")}
        </button>
      </div>
    </Sheet>
  );
}

/** First run on a tablet, or switching: the stations with their load right now and who is on them. */
export function Picker({
  current,
  load,
  onPick,
  onClose,
  onUnpair,
}: {
  current: Station | null;
  load: (s: Station) => { queue: number; oldest: number; ready: number };
  onPick: (s: Station) => void;
  onClose?: () => void;
  onUnpair: () => void;
}) {
  const tr = useTr();
  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <section className="relative isolate px-5 pt-[max(20px,env(safe-area-inset-top))] pb-16 text-white sm:px-8">
        <NorthSky />
        <div className="mx-auto flex max-w-[1040px] items-center gap-2">
          {onClose && (
            <button
              type="button"
              aria-label={tr("Back")}
              onClick={onClose}
              className="press grid size-10 place-items-center rounded-full bg-white/15"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
          )}
          <span className="flex h-10 items-center gap-2 rounded-full bg-white/15 px-3.5 text-[14px] font-semibold">
            <span className="size-1.5 rounded-full bg-[#5ce0a0]" /> Samarkand ·{" "}
            {tr("Station screen")}
          </span>
          <button
            type="button"
            onClick={onUnpair}
            className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[13px] font-semibold"
          >
            <LogOut size={15} strokeWidth={2.2} /> {tr("Unpair")}
          </button>
        </div>
        <div className="mx-auto mt-8 max-w-[1040px]">
          <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
            {tr("Which station is this screen?")}
          </h1>
          <p className="mt-1 text-[15px] text-white/75">
            {tr(
              "It only shows that station's dishes. Change it any time from the top bar.",
            )}
          </p>
        </div>
      </section>
      <div className="relative z-10 -mt-10 px-5 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-[1040px] gap-3 md:grid-cols-3">
          {VENUE_STATIONS.map((s, i) => {
            const people = TEAM.filter(
              (p) =>
                p.onShift &&
                (p.stations.includes(s.id) ||
                  s.absorbs.some((a) => p.stations.includes(a))),
            );
            const l = load(s.id);
            const on = current === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(s.id)}
                className={`press relative overflow-hidden rounded-[26px] bg-g-fill p-4 text-left shadow-[0_10px_30px_-18px_rgba(11,11,15,0.35)] animate-rise ${on ? "ring-2 ring-g-blue" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="flex items-center gap-3">
                  <ArtTile name={s.art} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[21px] leading-tight font-bold tracking-[-0.02em]">
                      {tr(s.label)}
                    </span>
                    <span className="block truncate text-[13px] text-g-muted">
                      {people.length
                        ? people.map((p) => `@${p.handle}`).join(" · ")
                        : tr("Nobody on shift")}
                    </span>
                  </span>
                  {on ? (
                    <span className="blue-grad grid size-8 shrink-0 place-items-center rounded-full">
                      <Check size={16} strokeWidth={2.8} />
                    </span>
                  ) : (
                    <ChevronRight size={18} className="shrink-0 text-g-faint" />
                  )}
                </span>
                <span className="mt-4 grid grid-cols-3 gap-1.5">
                  {[
                    [tr("In the queue"), String(l.queue), ""],
                    [
                      tr("Longest"),
                      l.oldest ? tr("{n} min", { n: l.oldest }) : "—",
                      l.oldest >= 15
                        ? "text-[#e5484d]"
                        : l.oldest >= 8
                          ? "text-g-orange"
                          : "",
                    ],
                    [
                      tr("At the pass"),
                      String(l.ready),
                      l.ready ? "text-g-green" : "",
                    ],
                  ].map(([k, v, c]) => (
                    <span
                      key={k}
                      className="rounded-[14px] bg-g-card px-2.5 py-2"
                    >
                      <span className="block truncate text-[11px] font-semibold text-g-muted">
                        {k}
                      </span>
                      <span
                        className={`block text-[18px] leading-tight font-bold tabular-nums ${c}`}
                      >
                        {v}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="mt-3 flex -space-x-2">
                  {people.map((p) => (
                    <span
                      key={p.id}
                      className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-g-card text-[12px] font-bold ring-2 ring-[var(--g-fill)]"
                    >
                      <PersonPic p={p} />
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
