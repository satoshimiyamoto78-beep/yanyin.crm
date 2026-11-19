"use client";

import {
  Check,
  ChefHat,
  ConciergeBell,
  Flame,
  Inbox,
  Circle,
  Clock,
  Loader,
  MoreHorizontal,
  Printer,
  QrCode,
  Send,
  Utensils,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Person, Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { TEAM } from "@/lib/demo-team";
import {
  VENUE_STATIONS,
  type KdsLine,
  type KdsOrder,
} from "@/lib/demo-kitchen";
import { PeekCard, useLongPress } from "@/components/guest/motion";
import { PeekActions, PeekHeader } from "@/components/system/PeekParts";
import { PersonPic } from "@/components/system/PersonPic";
import { useDish, useTr } from "@/components/crew/prefs";

/*
 * The station screen as a board (docs/07 §92, after the founder's kanban
 * references, in our colours): three columns — New, Cooking, Ready to serve.
 * A ticket is a soft tinted card (blue fresh, orange waiting long, red late):
 * tags (QR guest or the waiter), the table, a progress pill "2 of 3",
 * the dishes as a checklist on a thread (tap moves a dish on, hold opens its
 * tech card), and a footer with who and how long. Ready tickets fold into
 * slim rows with a full green bar and "Served".
 */

type Col = "new" | "making" | "ready";
const TONE = {
  ok: { card: "bg-g-tint-blue", ink: "text-g-blue", bar: "bg-g-blue" },
  long: {
    card: "bg-g-tint-orange",
    ink: "text-[#d9600f] [[data-scheme=dark]_&]:text-[#ff9a55]",
    bar: "bg-g-orange",
  },
  late: {
    card: "bg-[#fdeced] [[data-scheme=dark]_&]:bg-[#2c1517]",
    ink: "text-[#d23a41] [[data-scheme=dark]_&]:text-[#ff7b80]",
    bar: "bg-[#e5484d]",
  },
} as const;
const glass = "bg-white/70 [[data-scheme=dark]_&]:bg-white/8";
const ageTone = (min: number) =>
  min >= 15 ? "late" : min >= 8 ? "long" : "ok";
const minsOf = (at: string, minute: number) =>
  Math.max(0, minute - (Number(at.slice(0, 2)) * 60 + Number(at.slice(3))));

export function columnOf(o: KdsOrder, station: Station): Col {
  const ls = o.lines.filter((l) => l.station === station);
  if (ls.every((l) => l.state === "ready")) return "ready";
  if (ls.some((l) => l.state !== "new")) return "making";
  return "new";
}

function Face({ p, size = 28 }: { p?: Person; size?: number }) {
  if (!p) return null;
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-g-card font-bold ring-2 ring-[var(--g-bg)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      <PersonPic p={p} />
    </span>
  );
}

export function Board({
  orders,
  station,
  minute,
  fresh,
  leaving,
  stop,
  elapsed,
  onLine,
  onAll,
  onInfo,
  onServed,
  notify,
  empty,
}: {
  orders: KdsOrder[];
  station: Station;
  minute: number;
  fresh: string | null;
  leaving: string[];
  stop: string[];
  elapsed: (o: KdsOrder) => ReactNode;
  onLine: (o: KdsOrder, l: KdsLine) => void;
  onAll: (o: KdsOrder) => void;
  onInfo: (l: KdsLine) => void;
  onServed: (id: string) => void;
  notify: (t: string) => void;
  empty: ReactNode;
}) {
  const tr = useTr();
  const [col, setCol] = useState<Col | "all">("all");
  const by = (c: Col) =>
    orders
      .filter((o) => columnOf(o, station) === c)
      .sort((a, b) => a.at.localeCompare(b.at));
  const cols: {
    id: Col;
    label: string;
    short: string;
    dot: string;
    solid: string;
    soft: string;
    icon: typeof Circle;
  }[] = [
    {
      id: "new",
      label: tr("New"),
      short: tr("New"),
      dot: "bg-g-blue",
      solid: "bg-g-blue",
      soft: "bg-g-tint-blue text-g-blue",
      icon: Inbox,
    },
    {
      id: "making",
      label: tr("Cooking"),
      short: tr("Cooking"),
      dot: "bg-g-orange",
      solid: "bg-g-orange",
      soft: "bg-g-tint-orange text-[#d9600f] [[data-scheme=dark]_&]:text-[#ff9a55]",
      icon: Flame,
    },
    {
      id: "ready",
      label: tr("Ready to serve"),
      short: tr("Ready"),
      dot: "bg-g-green",
      solid: "bg-g-green",
      soft: "bg-g-tint-green text-g-green",
      icon: ConciergeBell,
    },
  ];
  const cardOf = (o: KdsOrder) =>
    columnOf(o, station) === "ready" ? (
      <ReadyRow
        key={o.id}
        o={o}
        station={station}
        onServed={() => onServed(o.id)}
      />
    ) : (
      <Card
        key={o.id}
        o={o}
        station={station}
        minute={minute}
        fresh={fresh === o.id}
        leaving={leaving.includes(o.id)}
        stop={stop}
        elapsed={elapsed(o)}
        onLine={(l) => onLine(o, l)}
        onAll={() => onAll(o)}
        onInfo={onInfo}
        notify={notify}
      />
    );
  const column = (c: (typeof cols)[number]) => {
    const list = by(c.id);
    return (
      <section
        key={c.id}
        className="min-w-0 rounded-[28px] border border-g-line bg-g-fill/60 p-2.5"
      >
        <header className="flex items-center gap-2 px-2 pt-1 pb-2.5">
          <span className={`size-2 rounded-full ${c.dot}`} />
          <h2 className="text-[16px] font-bold">{c.label}</h2>
          <span className="live grid h-6 min-w-6 place-items-center rounded-full bg-g-card px-2 text-[12.5px] font-bold tabular-nums">
            {list.length}
          </span>
        </header>
        <div className="grid gap-2.5">
          {list.length ? (
            list.map((o) =>
              c.id === "ready" ? (
                <ReadyRow
                  key={o.id}
                  o={o}
                  station={station}
                  onServed={() => onServed(o.id)}
                />
              ) : (
                <Card
                  key={o.id}
                  o={o}
                  station={station}
                  minute={minute}
                  fresh={fresh === o.id}
                  leaving={leaving.includes(o.id)}
                  stop={stop}
                  elapsed={elapsed(o)}
                  onLine={(l) => onLine(o, l)}
                  onAll={() => onAll(o)}
                  onInfo={onInfo}
                  notify={notify}
                />
              ),
            )
          ) : (
            <p className="rounded-[20px] border-2 border-dashed border-g-line px-3 py-6 text-center text-[13.5px] text-g-muted">
              {c.id === "ready"
                ? tr("Nothing waiting at the pass")
                : c.id === "new"
                  ? tr("New orders appear here with a chime")
                  : tr("Start a dish and it moves here")}
            </p>
          )}
        </div>
      </section>
    );
  };
  if (
    !orders.some((o) => columnOf(o, station) !== "ready") &&
    !by("ready").length
  )
    return <>{empty}</>;
  return (
    <>
      {/* All, then one capsule per state with its icon and count: pick one to see only it. */}
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <button
          type="button"
          aria-pressed={col === "all"}
          onClick={() => (haptic("tick"), setCol("all"))}
          className={`press flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${col === "all" ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill"}`}
        >
          {tr("All")}
          <span className="tabular-nums opacity-60">{orders.length}</span>
        </button>
        {cols.map((c) => {
          const on = col === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => (haptic("tick"), setCol(on ? "all" : c.id))}
              className={`press flex h-11 shrink-0 items-center gap-2 rounded-full pr-4 pl-1.5 text-[14px] font-semibold transition-all ${on ? `${c.solid} text-white` : c.soft}`}
            >
              <span
                className={`grid size-8 place-items-center rounded-full ${on ? "bg-white/20" : c.solid + " text-white"}`}
              >
                <c.icon size={16} strokeWidth={2.4} />
              </span>
              {c.short}
              <span className="tabular-nums opacity-70">{by(c.id).length}</span>
            </button>
          );
        })}
      </div>
      {col === "all" ? (
        <>
          {/* Computers and tablets: the three columns. Phones: everything in one list, oldest first. */}
          <div className="hidden items-start gap-3 md:grid md:grid-cols-3">
            {cols.map(column)}
          </div>
          <div className="grid gap-2.5 md:hidden">
            {[...by("making"), ...by("new"), ...by("ready")].map((o) =>
              cardOf(o),
            )}
          </div>
        </>
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {by(col).length ? (
            by(col).map((o) => cardOf(o))
          ) : (
            <p className="rounded-[20px] border-2 border-dashed border-g-line px-3 py-6 text-center text-[13.5px] text-g-muted sm:col-span-2 lg:col-span-3">
              {tr("Nothing here right now")}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Card({
  o,
  station,
  minute,
  fresh,
  leaving,
  stop,
  elapsed,
  onLine,
  onAll,
  onInfo,
  notify,
}: {
  o: KdsOrder;
  station: Station;
  minute: number;
  fresh: boolean;
  leaving: boolean;
  stop: string[];
  elapsed: ReactNode;
  onLine: (l: KdsLine) => void;
  onAll: () => void;
  onInfo: (l: KdsLine) => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const [menu, setMenu] = useState(false);
  const lines = o.lines.filter((l) => l.station === station);
  const other = o.lines.filter(
    (l) => l.station !== station && l.state !== "ready",
  );
  const done = lines.filter((l) => l.state === "ready").length;
  const left = lines.length - done;
  const t = TONE[ageTone(minsOf(o.at, minute))];
  const waiter = TEAM.find((p) => p.handle === o.waiter);
  const pct = Math.round((done / lines.length) * 100);
  return (
    <article
      className={`relative rounded-[22px] p-3.5 ${t.card} ${leaving ? "animate-leave" : fresh ? "animate-pop" : ""}`}
    >
      {/* The table first, the menu beside it; the tags under it. */}
      <div className="flex items-start gap-2">
        <h3
          className={`min-w-0 flex-1 text-[22px] leading-tight font-bold tracking-[-0.02em] tabular-nums ${t.ink}`}
        >
          {tr("Table {n}", { n: o.table })}
        </h3>
        <span
          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] px-2 ${glass}`}
        >
          <Clock size={12} className="text-g-muted" /> {elapsed}
        </span>
        <button
          type="button"
          aria-label={tr("More")}
          onClick={() => (haptic("light"), setMenu(true))}
          className={`press grid size-8 shrink-0 place-items-center rounded-[10px] ${glass}`}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {o.guest ? (
          <span
            className={`inline-flex h-6 items-center gap-1 rounded-[9px] px-2 text-[11.5px] font-semibold ${glass} ${t.ink}`}
          >
            <QrCode size={12} strokeWidth={2.4} /> {tr("QR guest")}
          </span>
        ) : (
          <span
            className={`inline-flex h-6 items-center rounded-[9px] px-2 text-[11.5px] font-semibold ${glass} ${t.ink}`}
          >
            #{tr("Hall").toLowerCase()}
          </span>
        )}
        {other.length > 0 && (
          <span
            className={`inline-flex h-6 items-center rounded-[9px] px-2 text-[11.5px] font-semibold text-g-ink-2 ${glass}`}
          >
            +
            {[...new Set(other.map((l) => l.station))]
              .map((s) =>
                tr(VENUE_STATIONS.find((v) => v.id === s)?.label ?? ""),
              )
              .join(", ")}
          </span>
        )}
      </div>

      {/* Progress across the whole card: how many of this station's dishes are done. */}
      <div className="mt-3 flex items-center gap-2.5">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/70 [[data-scheme=dark]_&]:bg-white/10">
          <span
            className="block h-full rounded-full bg-g-green transition-[width] duration-500"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </span>
        <span className="shrink-0 text-[12.5px] font-semibold tabular-nums">
          {tr("{a} of {b}", { a: done, b: lines.length })} · {pct}%
        </span>
      </div>

      {/* The dishes on a thread: tap moves one on, hold opens its tech card. */}
      <div className="relative mt-2.5 grid gap-0.5 pl-1">
        {lines.length > 1 && (
          <span
            aria-hidden
            className="absolute top-4 bottom-4 left-[15px] w-px bg-g-line"
          />
        )}
        {lines.map((l) => (
          <Dish
            key={l.id}
            l={l}
            out={stop.includes(l.itemId)}
            onTap={() => onLine(l)}
            onHold={() => onInfo(l)}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex -space-x-1.5">
          <Face p={waiter} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-g-muted">
          @{o.waiter} · {o.at}
        </span>
      </div>
      {left > 1 && (
        <button
          type="button"
          onClick={() => (haptic("success"), onAll())}
          className={`press mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[13.5px] font-semibold ${glass}`}
        >
          <Check size={15} strokeWidth={2.6} className="text-g-green" />{" "}
          {tr("All ready")} · {left}
        </button>
      )}

      {menu && (
        <PeekCard
          label={tr("Table {n}", { n: o.table })}
          onClose={() => setMenu(false)}
        >
          <PeekHeader
            kicker={`@${o.waiter} · ${o.at}`}
            title={tr("Table {n}", { n: o.table })}
            facts={[
              {
                icon: Utensils,
                text: tr("{a} of {b}", { a: done, b: lines.length }),
              },
            ]}
          />
          <PeekActions
            items={[
              {
                icon: Check,
                label: tr("All ready"),
                tone: "good",
                onClick: () => (setMenu(false), onAll()),
              },
              {
                icon: Printer,
                label: tr("Print the ticket"),
                onClick: () => (
                  setMenu(false),
                  notify(tr("Sent to the kitchen printer"))
                ),
              },
              {
                icon: Send,
                label: tr("Call @{h}", { h: o.waiter }),
                onClick: () => (
                  setMenu(false),
                  notify(tr("@{h} is called to the pass", { h: o.waiter }))
                ),
              },
            ]}
          />
        </PeekCard>
      )}
    </article>
  );
}

function Dish({
  l,
  out,
  onTap,
  onHold,
}: {
  l: KdsLine;
  out: boolean;
  onTap: () => void;
  onHold: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const press = useLongPress(
    () => (haptic("light"), onHold()),
    () => l.state !== "ready" && (haptic("tick"), onTap()),
  );
  return (
    <button
      type="button"
      {...press}
      className="press relative flex min-h-[44px] w-full items-center gap-2.5 rounded-[14px] py-1.5 pr-1.5 text-left"
    >
      <span className="relative z-[1] grid size-[22px] shrink-0 place-items-center rounded-full bg-[var(--g-bg)]">
        {l.state === "ready" ? (
          <span className="grid size-[22px] place-items-center rounded-full bg-g-green text-white">
            <Check size={13} strokeWidth={3} />
          </span>
        ) : l.state === "making" ? (
          <Loader
            size={18}
            strokeWidth={2.4}
            className="animate-[spin_2.4s_linear_infinite] text-g-orange"
          />
        ) : (
          <Circle size={20} strokeWidth={2} className="text-g-faint" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[15px] leading-tight font-semibold break-words ${l.state === "ready" ? "text-g-muted line-through decoration-1" : ""}`}
        >
          <span className="text-g-blue tabular-nums">{l.qty}×</span>{" "}
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
      {l.state !== "ready" && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${l.state === "new" ? `${glass} text-g-ink-2` : "bg-g-blue text-white"}`}
        >
          {tr(l.state === "new" ? "Start" : "Ready")}
        </span>
      )}
    </button>
  );
}

/** A finished ticket folded into one slim card: table, a full bar, the waiter, "Served". */
function ReadyRow({
  o,
  station,
  onServed,
}: {
  o: KdsOrder;
  station: Station;
  onServed: () => void;
}) {
  const tr = useTr();
  const waiter = TEAM.find((p) => p.handle === o.waiter);
  const n = o.lines
    .filter((l) => l.station === station)
    .reduce((s, l) => s + l.qty, 0);
  return (
    <article className="animate-pop rounded-[20px] bg-g-tint-green p-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[14px] font-bold ${glass}`}
        >
          <ChefHat size={14} className="text-g-green" />{" "}
          {tr("Table {n}", { n: o.table })}
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-g-line">
          <span className="block h-full w-full rounded-full bg-g-green" />
        </span>
        <span className="text-[12.5px] font-semibold text-g-muted tabular-nums">
          100%
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Face p={waiter} size={26} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-g-muted">
          @{o.waiter} · {tr("{n} item|{n} items", { n })}
        </span>
        <button
          type="button"
          onClick={() => (haptic("success"), onServed())}
          className="press h-8 shrink-0 rounded-full bg-g-green px-3.5 text-[12.5px] font-semibold text-white"
        >
          {tr("Served")}
        </button>
      </div>
    </article>
  );
}
