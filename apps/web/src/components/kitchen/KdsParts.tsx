"use client";

import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Scale,
  Timer,
} from "lucide-react";
import type { MenuItem, Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { rnd } from "@/lib/demo-money";
import { RECIPES, STOCK } from "@/lib/demo-stock";
import { stockOf, techCardFor, techStore } from "@/lib/techcards";
import { TEAM } from "@/lib/demo-team";
import { VENUE_STATIONS, type KdsLine } from "@/lib/demo-kitchen";
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
  const saved = techStore.use();
  // The admin's tech card when it is filled in (Menu → dish → Tech card), else the demo one.
  const own = techCardFor(line.itemId, line.name.en, saved);
  const card = own.lines.length
    ? own.lines.map((l) => ({ s: stockOf(l.item), q: l.qty }))
    : techCard(item, line.name.en ?? name, station);
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
