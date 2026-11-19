"use client";

import {
  Archive,
  Copy,
  Flame,
  GripVertical,
  History,
  Leaf,
  Plus,
  Printer,
  Sparkles,
  Star,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ModifierGroup, Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import type {
  Channels,
  ItemEdit,
  PriceChange,
  Schedule,
  VariantEdit,
} from "@/lib/menu-edits";
import { Switch } from "@/components/system/Kit";
import { compactMoney } from "@/components/crew/CrewApp";
import { useDish, useTr } from "@/components/crew/prefs";

/*
 * The deeper parts of a dish (docs/11, docs/07 §89): sizes with their own
 * prices, modifier groups from the library, where it is cooked and how long,
 * what the guest sees (tags, allergens, weight, calories, spiciness), where
 * and when it is sold (QR menu, waiter, delivery; days and hours; VAT), its
 * price history, and duplicate / archive.
 */

export type DishExtra = Pick<
  ItemEdit,
  | "variants"
  | "modIds"
  | "station"
  | "cookMin"
  | "tags"
  | "allergens"
  | "weight"
  | "kcal"
  | "spicy"
  | "channels"
  | "schedule"
  | "vat"
>;

export const TAGS: { id: string; label: string; icon: typeof Star }[] = [
  { id: "hit", label: "Best seller", icon: Star },
  { id: "new", label: "New", icon: Sparkles },
  { id: "spicy", label: "Spicy", icon: Flame },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "halal", label: "Halal", icon: Star },
  { id: "kids", label: "For kids", icon: Star },
  { id: "chef", label: "Chef's pick", icon: Star },
];
export const ALLERGENS = [
  "Gluten",
  "Milk",
  "Eggs",
  "Nuts",
  "Peanuts",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
  "Celery",
  "Mustard",
  "Sulphites",
];
const STATIONS: { id: Station; label: string }[] = [
  { id: "hot", label: "Hot kitchen" },
  { id: "cold", label: "Cold kitchen" },
  { id: "bar", label: "Bar" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];

function Card({
  id,
  title,
  sub,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-[24px] bg-g-fill p-4">
      <p className="text-[16px] font-bold">{title}</p>
      {sub && <p className="mt-0.5 text-[12.5px] text-g-muted">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const pill = (on: boolean) =>
  `press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${on ? "chip-blue" : "bg-g-card text-g-ink-2"}`;
const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;

export function DishSections({
  value: x,
  onChange,
  basePrice,
  library,
  defaultStation,
  history,
  isNew,
  archived,
  onDuplicate,
  onArchive,
  onNewGroup,
}: {
  value: DishExtra;
  onChange: (v: DishExtra) => void;
  basePrice: number;
  library: ModifierGroup[];
  defaultStation: Station;
  history: PriceChange[];
  isNew: boolean;
  archived: boolean;
  onDuplicate: () => void;
  onArchive: () => void;
  onNewGroup: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const set = (p: Partial<DishExtra>) => onChange({ ...x, ...p });
  const variants = x.variants ?? [];
  const mods = x.modIds ?? [];
  const channels: Channels = x.channels ?? {
    qr: true,
    waiter: true,
    delivery: false,
  };
  const schedule = x.schedule ?? null;
  const [adding, setAdding] = useState(false);
  const setVariant = (i: number, v: Partial<VariantEdit>) =>
    set({ variants: variants.map((o, k) => (k === i ? { ...o, ...v } : o)) });

  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      {/* Sizes: each with its own price; the menu shows "from" the cheapest. */}
      <Card
        id="d-variants"
        title={tr("Sizes and portions")}
        sub={tr(
          "For example 0.3 / 0.5 l or 1 / 2 portions. Each has its own price.",
        )}
      >
        {variants.length > 0 && (
          <div className="mb-2 overflow-hidden rounded-[16px] bg-g-card">
            {variants.map((v, i) => (
              <div
                key={v.id}
                className={`flex items-center gap-2 px-2 py-1.5 ${i ? "border-t border-g-line" : ""}`}
              >
                <GripVertical size={15} className="shrink-0 text-g-faint" />
                <input
                  value={v.name}
                  onChange={(e) => setVariant(i, { name: e.target.value })}
                  placeholder={tr("0.5 l")}
                  className="h-10 min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
                />
                <span className="flex h-10 w-[120px] items-center gap-1 rounded-full bg-g-fill px-3">
                  <input
                    inputMode="numeric"
                    value={v.price ? v.price.toLocaleString("en-US") : ""}
                    onChange={(e) =>
                      setVariant(i, { price: num(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full min-w-0 bg-transparent text-right text-[14px] font-bold outline-none tabular-nums"
                  />
                  <span className="text-[12px] text-g-muted">₫</span>
                </span>
                <button
                  type="button"
                  aria-label={tr("Remove")}
                  onClick={() => (
                    haptic("light"),
                    set({ variants: variants.filter((_, k) => k !== i) })
                  )}
                  className="press grid size-8 place-items-center rounded-full text-g-muted"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => (
            haptic("light"),
            set({
              variants: [
                ...variants,
                {
                  id: `v${Date.now()}`,
                  name: variants.length ? "" : tr("Regular"),
                  price: basePrice,
                },
              ],
            })
          )}
          className="press flex h-10 items-center gap-1.5 rounded-full bg-g-card px-3.5 text-[13.5px] font-semibold"
        >
          <Plus size={15} className="text-g-blue" /> {tr("Add a size")}
        </button>
      </Card>

      {/* Modifier groups from the library: doneness, sauces, extras. */}
      <Card
        id="d-mods"
        title={tr("Modifiers")}
        sub={tr(
          "Groups from the library: the guest and the waiter pick from them.",
        )}
      >
        {mods.length > 0 && (
          <div className="mb-2 overflow-hidden rounded-[16px] bg-g-card">
            {mods.map((id, i) => {
              const g = library.find((l) => l.id === id);
              if (!g) return null;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-2 px-3 py-2.5 ${i ? "border-t border-g-line" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">
                      {dish(g.name)}
                    </span>
                    <span className="block truncate text-[12px] text-g-muted">
                      {g.required ? tr("required") : tr("optional")} ·{" "}
                      {g.max === 1
                        ? tr("one choice")
                        : tr("up to {n}", { n: g.max })}{" "}
                      ·{" "}
                      {g.options
                        .map((o) => dish(o.name))
                        .slice(0, 3)
                        .join(", ")}
                      {g.options.length > 3 ? "…" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={tr("Remove")}
                    onClick={() => (
                      haptic("light"),
                      set({ modIds: mods.filter((m) => m !== id) })
                    )}
                    className="press grid size-8 place-items-center rounded-full text-g-muted"
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {adding ? (
          <div className="animate-rise grid gap-1.5">
            {library
              .filter((g) => !mods.includes(g.id))
              .map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => (
                    haptic("tick"),
                    set({ modIds: [...mods, g.id] }),
                    setAdding(false)
                  )}
                  className="press flex items-center justify-between gap-2 rounded-[14px] bg-g-card px-3 py-2.5 text-left"
                >
                  <span className="truncate text-[14px] font-semibold">
                    {dish(g.name)}
                  </span>
                  <span className="shrink-0 text-[12px] text-g-muted">
                    {tr("{n} options", { n: g.options.length })}
                  </span>
                </button>
              ))}
            <button
              type="button"
              onClick={() => (haptic("light"), onNewGroup())}
              className="press flex h-10 items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-g-line text-[13.5px] font-semibold text-g-blue"
            >
              <Plus size={15} /> {tr("New group in the library")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (haptic("light"), setAdding(true))}
            className="press flex h-10 items-center gap-1.5 rounded-full bg-g-card px-3.5 text-[13.5px] font-semibold"
          >
            <Plus size={15} className="text-g-blue" /> {tr("Attach a group")}
          </button>
        )}
      </Card>

      {/* Where it is cooked and how long: the ticket goes to that station and its printer. */}
      <Card
        id="d-kitchen"
        title={tr("Kitchen")}
        sub={tr("The ticket goes to this station's screen and printer.")}
      >
        <div className="flex flex-wrap gap-1.5">
          {STATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={(x.station ?? defaultStation) === s.id}
              onClick={() => (haptic("tick"), set({ station: s.id }))}
              className={pill((x.station ?? defaultStation) === s.id)}
            >
              {tr(s.label)}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-[16px] bg-g-card p-3">
            <span className="flex items-center gap-1 text-[11.5px] font-semibold text-g-muted">
              <Timer size={12} /> {tr("Cooking time")}
            </span>
            <span className="mt-1 flex items-center gap-1">
              <input
                inputMode="numeric"
                value={x.cookMin ?? ""}
                onChange={(e) => set({ cookMin: num(e.target.value) })}
                placeholder="12"
                className="w-full min-w-0 bg-transparent text-[18px] font-bold outline-none tabular-nums"
              />
              <span className="text-[13px] text-g-muted">{tr("min")}</span>
            </span>
          </label>
          <span className="rounded-[16px] bg-g-card p-3">
            <span className="flex items-center gap-1 text-[11.5px] font-semibold text-g-muted">
              <Printer size={12} /> {tr("Prints on")}
            </span>
            <span className="mt-1 block truncate text-[14.5px] font-bold">
              {tr(
                (x.station ?? defaultStation) === "bar"
                  ? "Bar printer"
                  : "Kitchen printer",
              )}
            </span>
          </span>
        </div>
      </Card>

      {/* What the guest sees on the card and filters by. */}
      <Card
        id="d-guest"
        title={tr("For the guest")}
        sub={tr("Shown on the dish card; guests can filter by them.")}
      >
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => {
            const on = (x.tags ?? []).includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => (
                  haptic("tick"),
                  set({
                    tags: on
                      ? (x.tags ?? []).filter((v) => v !== t.id)
                      : [...(x.tags ?? []), t.id],
                  })
                )}
                className={`${pill(on)} flex items-center gap-1`}
              >
                <t.icon size={13} /> {tr(t.label)}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] font-semibold text-g-ink-2">
          {tr("Allergens")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ALLERGENS.map((a) => {
            const on = (x.allergens ?? []).includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => (
                  haptic("tick"),
                  set({
                    allergens: on
                      ? (x.allergens ?? []).filter((v) => v !== a)
                      : [...(x.allergens ?? []), a],
                  })
                )}
                className={`press h-8 rounded-full px-3 text-[12.5px] font-semibold ${on ? "chip-orange" : "bg-g-card text-g-ink-2"}`}
              >
                {tr(a)}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ["weight", tr("Weight"), tr("g")],
              ["kcal", tr("Calories"), tr("kcal")],
            ] as const
          ).map(([k, label, unit]) => (
            <label key={k} className="rounded-[16px] bg-g-card p-3">
              <span className="text-[11.5px] font-semibold text-g-muted">
                {label}
              </span>
              <span className="mt-1 flex items-center gap-1">
                <input
                  inputMode="numeric"
                  value={x[k] ?? ""}
                  onChange={(e) => set({ [k]: num(e.target.value) })}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-[17px] font-bold outline-none tabular-nums"
                />
                <span className="text-[12px] text-g-muted">{unit}</span>
              </span>
            </label>
          ))}
          <div className="rounded-[16px] bg-g-card p-3">
            <span className="text-[11.5px] font-semibold text-g-muted">
              {tr("Heat")}
            </span>
            <span className="mt-1.5 flex gap-1">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n}`}
                  onClick={() => (
                    haptic("tick"),
                    set({ spicy: (x.spicy === n ? n - 1 : n) as 0 | 1 | 2 | 3 })
                  )}
                  className="press"
                >
                  <Flame
                    size={18}
                    className={
                      (x.spicy ?? 0) >= n
                        ? "fill-g-orange text-g-orange"
                        : "text-g-faint"
                    }
                  />
                </button>
              ))}
            </span>
          </div>
        </div>
      </Card>

      {/* Where and when it is sold, and its tax. */}
      <Card id="d-sale" title={tr("Where and when it is sold")}>
        <div className="overflow-hidden rounded-[16px] bg-g-card">
          {(
            [
              ["qr", tr("QR menu for guests")],
              ["waiter", tr("Waiter's app")],
              ["delivery", tr("Delivery app")],
            ] as const
          ).map(([k, label], i) => (
            <div
              key={k}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${i ? "border-t border-g-line" : ""}`}
            >
              <span className="text-[14.5px] font-semibold">{label}</span>
              <Switch
                on={channels[k]}
                onChange={(v) => set({ channels: { ...channels, [k]: v } })}
                label={label}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[14.5px] font-semibold">
            {tr("Only on some days and hours")}
          </span>
          <Switch
            on={!!schedule}
            onChange={(v) =>
              set({
                schedule: v
                  ? { days: ALL_DAYS, from: "07:00", to: "12:00" }
                  : null,
              })
            }
            label={tr("Only on some days and hours")}
          />
        </div>
        {schedule && (
          <div className="animate-rise mt-2.5 grid gap-2">
            <div className="grid grid-cols-7 gap-1">
              {ALL_DAYS.map((d, i) => {
                const on = schedule.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => (
                      haptic("tick"),
                      set({
                        schedule: {
                          ...schedule,
                          days: on
                            ? schedule.days.filter((v) => v !== d)
                            : [...schedule.days, d],
                        } as Schedule,
                      })
                    )}
                    className={`press h-9 rounded-[12px] text-[12px] font-semibold ${on ? "bg-g-blue text-white" : "bg-g-card text-g-muted"}`}
                  >
                    {tr(DAYS[i]!)}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["from", "to"] as const).map((k) => (
                <label
                  key={k}
                  className="flex h-11 items-center justify-between gap-2 rounded-full bg-g-card px-3.5"
                >
                  <span className="text-[12.5px] text-g-muted">
                    {tr(k === "from" ? "From" : "To")}
                  </span>
                  <input
                    type="time"
                    value={schedule[k]}
                    onChange={(e) =>
                      set({ schedule: { ...schedule, [k]: e.target.value } })
                    }
                    className="bg-transparent text-[15px] font-bold outline-none tabular-nums"
                  />
                </label>
              ))}
            </div>
            <p className="text-[12px] text-g-muted">
              {tr(
                "Outside these hours the dish disappears from the menu by itself (breakfasts, lunch sets).",
              )}
            </p>
          </div>
        )}
        <p className="mt-3 text-[12.5px] font-semibold text-g-ink-2">
          {tr("VAT")}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {[8, 10, 0].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={(x.vat ?? 8) === v}
              onClick={() => (haptic("tick"), set({ vat: v }))}
              className={pill((x.vat ?? 8) === v)}
            >
              {v ? `${v}%` : tr("No VAT")}
            </button>
          ))}
        </div>
      </Card>

      {/* Price history and the quieter actions. */}
      {!isNew && (
        <Card id="d-history" title={tr("History")}>
          {history.length ? (
            <div className="overflow-hidden rounded-[16px] bg-g-card">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] ${i ? "border-t border-g-line" : ""}`}
                >
                  <History size={15} className="shrink-0 text-g-muted" />
                  <span className="min-w-0 flex-1 truncate">
                    {tr("Price")} {compactMoney(h.from)} →{" "}
                    <b>{compactMoney(h.to)}</b>
                  </span>
                  <span className="shrink-0 text-[12px] text-g-muted">
                    @{h.by} · {h.at}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] text-g-muted">
              {tr("No price changes yet.")}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => (haptic("light"), onDuplicate())}
              className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-g-card text-[14px] font-semibold"
            >
              <Copy size={15} className="text-g-blue" /> {tr("Duplicate")}
            </button>
            <button
              type="button"
              onClick={() => (haptic("light"), onArchive())}
              className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-g-card text-[14px] font-semibold text-[#e5484d]"
            >
              {archived ? <Archive size={15} /> : <Trash2 size={15} />}{" "}
              {tr(archived ? "Back from the archive" : "To the archive")}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Jump links for the long dish page. */
export function SectionNav({ items }: { items: [string, string][] }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 py-2">
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => (
            haptic("tick"),
            document
              .getElementById(id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          )}
          className="press h-8 shrink-0 rounded-full bg-g-fill px-3 text-[12.5px] font-semibold text-g-ink-2"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
