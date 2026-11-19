"use client";

import {
  Ban,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  ImagePlus,
  Languages,
  Minus,
  Plus,
  Search,
  Star,
  Timer,
  X,
} from "lucide-react";
import { useId, useState } from "react";
import type { Category, I18nText, MenuItem } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { STOCK } from "@/lib/demo-stock";
import {
  cardCost,
  qtyLabel,
  stockOf,
  techCardFor,
  techStore,
  type TechCard,
} from "@/lib/techcards";
import type { ItemEdit } from "@/lib/menu-edits";
import { Sheet } from "@/components/guest/ui";
import { DishTile } from "@/components/guest/ui";
import { Group, Row, Switch } from "@/components/system/Kit";
import { compactMoney } from "@/components/crew/CrewApp";
import { useDish, usePrefs, useTr } from "@/components/crew/prefs";

/*
 * A dish (docs/07 §88): up to five photos (the first is the cover, tap one to
 * make it the cover), the name and description in the venue's language only
 * (the system translates into every guest language on save), price and
 * category, the tech card (ingredients from stock with grams, portion, time,
 * steps, cost and margin), visibility and the stop-list. Also creates new dishes.
 */

export type DishDraft = {
  name: I18nText;
  description: I18nText;
  price: number;
  photos: string[];
  categoryId: string;
  hidden: boolean;
};
const MAX_PHOTOS = 5;

export function DishEditor({
  item,
  categories,
  categoryId,
  edit,
  stopped,
  money,
  onSave,
  onStop,
  onClose,
}: {
  /** Null when creating a dish. */
  item: MenuItem | null;
  categories: Category[];
  categoryId: string;
  edit: ItemEdit;
  stopped: boolean;
  money: (n: number) => string;
  onSave: (d: DishDraft) => void;
  onStop: (on: boolean) => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const lang = usePrefs().prefs.lang;
  const techs = techStore.use();
  const id = item?.id ?? "new";
  const [name, setName] = useState(item ? dish(item.name) : "");
  const [desc, setDesc] = useState(
    item?.description ? dish(item.description) : "",
  );
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [photos, setPhotos] = useState<string[]>(
    edit.photos ??
      ((edit.photo ?? item?.photo) ? [edit.photo ?? item!.photo!] : []),
  );
  const [cat, setCat] = useState(categoryId);
  const [hidden, setHidden] = useState(!!edit.hidden);
  const [tech, setTech] = useState(false);
  const card = techCardFor(id, item?.name.en, techs);
  const p = Number(price.replace(/\D/g, ""));
  const cost = cardCost(card);
  const margin = p ? Math.round(((p - cost) / p) * 100) : 0;
  const ok = name.trim().length > 1 && p > 0;
  const fileId = useId();
  const category = categories.find((c) => c.id === cat);

  const save = () =>
    onSave({
      // Written once in the venue's language; the other guest languages are filled on save (the backend translates them).
      name: {
        ...(item?.name ?? {}),
        [lang]: name.trim(),
        ...(item ? {} : { en: name.trim(), ru: name.trim(), vi: name.trim() }),
      },
      description: { ...(item?.description ?? {}), [lang]: desc.trim() },
      price: p,
      photos,
      categoryId: cat,
      hidden,
    });

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={item ? dish(item.name) : tr("New dish")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={save}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        >
          <Check size={18} strokeWidth={2.6} />{" "}
          {item ? tr("Save and publish") : tr("Add to the menu")}
        </button>
      }
    >
      <div className="grid gap-6 px-5 pt-2 pb-10 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-start">
        {/* Photos: the cover large, the rest as thumbnails; tap a thumbnail to make it the cover. */}
        <div className="grid gap-2">
          <div className="relative overflow-hidden rounded-[24px] bg-g-fill">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photos[0]}
                src={photos[0]}
                alt=""
                className="animate-rise aspect-[4/3] w-full object-cover"
              />
            ) : item ? (
              <DishTile
                item={item}
                role={category?.role ?? "main"}
                photoScale={0.9}
                className="aspect-[4/3] w-full rounded-[24px]"
              />
            ) : (
              <label
                htmlFor={fileId}
                className="press grid aspect-[4/3] w-full cursor-pointer place-items-center text-g-muted"
              >
                <span className="flex flex-col items-center gap-2">
                  <span className="blue-grad grid size-12 place-items-center rounded-full">
                    <ImagePlus size={22} />
                  </span>
                  <span className="text-[14px] font-semibold">
                    {tr("Add photos")}
                  </span>
                </span>
              </label>
            )}
            {photos[0] && (
              <span className="absolute top-2.5 left-2.5 inline-flex h-7 items-center gap-1 rounded-full bg-[#0b0b0f]/55 px-2.5 text-[12px] font-semibold text-white">
                <Star size={12} fill="currentColor" /> {tr("Cover")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: MAX_PHOTOS }, (_, i) => {
              const src = photos[i];
              if (src)
                return (
                  <span key={src} className="relative">
                    <button
                      type="button"
                      aria-label={tr("Make it the cover")}
                      onClick={() => (
                        haptic("tick"),
                        setPhotos([src, ...photos.filter((x) => x !== src)])
                      )}
                      className={`press block aspect-square w-full overflow-hidden rounded-[14px] ${i === 0 ? "ring-2 ring-g-blue" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      aria-label={tr("Remove")}
                      onClick={() => (
                        haptic("light"),
                        setPhotos(photos.filter((x) => x !== src))
                      )}
                      className="press absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-g-ink text-white ring-2 ring-[var(--g-bg)] [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]"
                    >
                      <X size={12} strokeWidth={2.6} />
                    </button>
                  </span>
                );
              if (i === photos.length)
                return (
                  <label
                    key="add"
                    htmlFor={fileId}
                    className="press grid aspect-square cursor-pointer place-items-center rounded-[14px] border-2 border-dashed border-g-line text-g-blue"
                  >
                    <Plus size={20} />
                  </label>
                );
              return (
                <span
                  key={i}
                  className="aspect-square rounded-[14px] bg-g-fill"
                />
              );
            })}
          </div>
          <input
            id={fileId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(
                0,
                MAX_PHOTOS - photos.length,
              );
              if (files.length) {
                haptic("success");
                setPhotos([
                  ...photos,
                  ...files.map((f) => URL.createObjectURL(f)),
                ]);
              }
              e.target.value = "";
            }}
          />
          <p className="px-1 text-[12px] text-g-muted">
            {tr(
              "Up to 5 photos. The first is the cover guests see in the menu; the rest open on the dish page.",
            )}
          </p>
          {item?.status === "suggested" && (
            <p className="rounded-[18px] bg-g-tint-orange px-4 py-3 text-[13px] leading-snug text-g-ink-2">
              {tr(
                "Draft from Yan: check the text and the price, then save to confirm.",
              )}
            </p>
          )}
        </div>

        <div className="grid gap-5">
          <label className="block">
            <span className="px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("Dish name")}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("Lamb shashlik")}
              className="mt-1.5 h-14 w-full rounded-[20px] bg-g-fill px-4 text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/40"
            />
          </label>
          <label className="block">
            <span className="px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("Description")}
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder={tr("What it is, how it's made, what it goes with")}
              className="mt-1.5 w-full resize-none rounded-[20px] bg-g-fill px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/40"
            />
          </label>
          <p className="-mt-3 flex items-center gap-1.5 px-1 text-[12.5px] text-g-muted">
            <Languages size={14} className="text-g-blue" />{" "}
            {tr(
              "Write in one language: guests get it in theirs automatically.",
            )}
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className="block">
              <span className="px-1 text-[13px] font-semibold text-g-ink-2">
                {tr("Price")}
              </span>
              <span className="mt-1.5 flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
                <input
                  inputMode="numeric"
                  value={p ? p.toLocaleString("en-US") : ""}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent text-[18px] font-bold outline-none tabular-nums"
                />
                <span className="text-g-muted">₫</span>
              </span>
            </label>
            <label className="block">
              <span className="px-1 text-[13px] font-semibold text-g-ink-2">
                {tr("Category")}
              </span>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="mt-1.5 h-14 w-full rounded-[20px] bg-g-fill px-4 text-[15px] font-semibold outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {dish(c.name)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* The tech card at a glance; tap to open the recipe. */}
          <button
            type="button"
            onClick={() => (haptic("light"), setTech(true))}
            className="press flex items-center gap-3 rounded-[22px] bg-g-fill p-3.5 text-left"
          >
            <span className="blue-grad grid size-11 shrink-0 place-items-center rounded-full">
              <ClipboardList size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-bold">
                {tr("Tech card and recipe")}
              </span>
              <span className="block truncate text-[12.5px] text-g-muted tabular-nums">
                {card.lines.length
                  ? tr("{n} ingredients · costs {c} · margin {m}%", {
                      n: card.lines.length,
                      c: compactMoney(cost),
                      m: margin,
                    })
                  : tr("Not filled in yet: add the ingredients")}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-g-faint" />
          </button>
          {p > 0 && card.lines.length > 0 && (
            <div className="-mt-2 h-2 overflow-hidden rounded-full bg-g-fill">
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${margin < 62 ? "bg-g-orange" : "bg-g-green"}`}
                style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
              />
            </div>
          )}

          <Group>
            <Row
              icon={hidden ? EyeOff : Eye}
              title={tr("Guests see it")}
              sub={
                hidden
                  ? tr("Hidden from the menu and the waiter's picker")
                  : tr("On the menu")
              }
              right={
                <Switch
                  on={!hidden}
                  onChange={(v) => setHidden(!v)}
                  label={tr("Guests see it")}
                />
              }
            />
            {item && (
              <Row
                icon={Ban}
                title={tr("Ran out today")}
                sub={
                  stopped
                    ? tr("In the stop-list until a station brings it back")
                    : tr("Kitchen and bar can mark it too")
                }
                right={
                  <Switch
                    on={stopped}
                    onChange={onStop}
                    label={tr("Ran out today")}
                  />
                }
              />
            )}
          </Group>
          {p > 0 && (
            <p className="px-1 text-[12.5px] text-g-faint">{money(p)}</p>
          )}
        </div>
      </div>
      {tech && (
        <TechCardSheet
          title={name || tr("New dish")}
          price={p}
          card={card}
          onClose={() => setTech(false)}
          onSave={(c) => {
            techStore.set({ ...techs, [id]: c });
            haptic("success");
            setTech(false);
          }}
        />
      )}
    </Sheet>
  );
}

/** The recipe: ingredients from stock with the amount per portion, portion, time, steps; cost and margin live. */
function TechCardSheet({
  title,
  price,
  card,
  onClose,
  onSave,
}: {
  title: string;
  price: number;
  card: TechCard;
  onClose: () => void;
  onSave: (c: TechCard) => void;
}) {
  const tr = useTr();
  const [c, setC] = useState<TechCard>(card);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const cost = cardCost(c);
  const margin = price ? Math.round(((price - cost) / price) * 100) : 0;
  const step = (unit: string) => (unit === "pcs" ? 1 : 0.01);
  const set = (i: number, qty: number) =>
    setC({
      ...c,
      lines: c.lines.map((l, k) =>
        k === i ? { ...l, qty: Math.max(0, Math.round(qty * 1000) / 1000) } : l,
      ),
    });
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Tech card")}
      footer={
        <button
          type="button"
          onClick={() => onSave(c)}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save the tech card")}
        </button>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-[minmax(0,1fr)_300px] md:items-start">
        <div className="grid gap-4">
          <div>
            <p className="text-[13px] font-semibold text-g-blue">
              {tr("Tech card · one portion")}
            </p>
            <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
              {title}
            </h2>
          </div>
          <div className="overflow-hidden rounded-[22px] bg-g-fill">
            {c.lines.length ? (
              c.lines.map((l, i) => {
                const s = stockOf(l.item);
                return (
                  <div
                    key={l.item}
                    className={`flex items-center gap-2 px-3 py-2 ${i ? "border-t border-g-line" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {tr(s.name)}
                      </span>
                      <span className="block text-[12px] text-g-muted tabular-nums">
                        {compactMoney(Math.round(s.cost * l.qty))}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="−"
                      onClick={() => (
                        haptic("tick"),
                        set(i, l.qty - step(s.unit))
                      )}
                      className="press grid size-8 place-items-center rounded-full bg-g-card"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-[62px] text-center text-[14.5px] font-bold tabular-nums">
                      {qtyLabel(l.qty, s.unit, tr)}
                    </span>
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => (
                        haptic("tick"),
                        set(i, l.qty + step(s.unit))
                      )}
                      className="press grid size-8 place-items-center rounded-full bg-g-card"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={tr("Remove")}
                      onClick={() => (
                        haptic("light"),
                        setC({ ...c, lines: c.lines.filter((_, k) => k !== i) })
                      )}
                      className="press grid size-8 place-items-center rounded-full text-g-muted"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="px-4 py-4 text-[14px] text-g-muted">
                {tr("No ingredients yet.")}
              </p>
            )}
          </div>
          {picking ? (
            <div className="animate-rise rounded-[22px] bg-g-fill p-2">
              <label className="flex h-11 items-center gap-2 rounded-full bg-g-card px-3.5">
                <Search size={16} className="text-g-muted" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={tr("Find a product")}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                />
              </label>
              <div className="mt-1.5 grid max-h-[240px] overflow-y-auto">
                {STOCK.filter(
                  (s) =>
                    !c.lines.some((l) => l.item === s.id) &&
                    (!q || tr(s.name).toLowerCase().includes(q.toLowerCase())),
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => (
                      haptic("tick"),
                      setC({
                        ...c,
                        lines: [
                          ...c.lines,
                          { item: s.id, qty: s.unit === "pcs" ? 1 : 0.1 },
                        ],
                      }),
                      setPicking(false),
                      setQ("")
                    )}
                    className="press flex items-center justify-between gap-3 rounded-[14px] px-3 py-2.5 text-left"
                  >
                    <span className="text-[14.5px] font-semibold">
                      {tr(s.name)}
                    </span>
                    <span className="text-[12.5px] text-g-muted">
                      {tr(s.cat)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (haptic("light"), setPicking(true))}
              className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
            >
              <Plus size={17} className="text-g-blue" />{" "}
              {tr("Add an ingredient")}
            </button>
          )}
          <label className="block">
            <span className="px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("How to make it")}
            </span>
            <textarea
              value={c.steps}
              onChange={(e) => setC({ ...c, steps: e.target.value })}
              rows={4}
              placeholder={tr(
                "1. Marinate the meat for 4 hours\n2. Grill 8 minutes over coals\n3. Serve with onion and sauce",
              )}
              className="mt-1.5 w-full resize-none rounded-[20px] bg-g-fill px-4 py-3 text-[14.5px] leading-snug outline-none placeholder:text-g-faint"
            />
          </label>
        </div>
        <div className="grid gap-3 md:sticky md:top-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-g-fill p-3">
              <p className="text-[11.5px] font-semibold text-g-muted">
                {tr("Portion")}
              </p>
              <span className="mt-1 flex items-center gap-1">
                <input
                  inputMode="numeric"
                  value={c.portion || ""}
                  onChange={(e) =>
                    setC({
                      ...c,
                      portion: Number(e.target.value.replace(/\D/g, "")),
                    })
                  }
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-[18px] font-bold outline-none tabular-nums"
                />
                <span className="text-[13px] text-g-muted">{tr("g")}</span>
              </span>
            </div>
            <div className="rounded-[18px] bg-g-fill p-3">
              <p className="flex items-center gap-1 text-[11.5px] font-semibold text-g-muted">
                <Timer size={12} /> {tr("Target")}
              </p>
              <span className="mt-1 flex items-center gap-1">
                <input
                  inputMode="numeric"
                  value={c.minutes || ""}
                  onChange={(e) =>
                    setC({
                      ...c,
                      minutes: Number(e.target.value.replace(/\D/g, "")),
                    })
                  }
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-[18px] font-bold outline-none tabular-nums"
                />
                <span className="text-[13px] text-g-muted">{tr("min")}</span>
              </span>
            </div>
          </div>
          <div className="rounded-[22px] bg-g-fill p-4">
            <div className="flex justify-between text-[14px]">
              <span className="text-g-muted">{tr("Cost of a portion")}</span>
              <b className="tabular-nums">{compactMoney(cost)}</b>
            </div>
            <div className="mt-1.5 flex justify-between text-[14px]">
              <span className="text-g-muted">{tr("Price")}</span>
              <b className="tabular-nums">
                {price ? compactMoney(price) : "—"}
              </b>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-g-line pt-3">
              <span className="text-[14px] font-semibold">{tr("Margin")}</span>
              <span
                className={`text-[24px] font-bold tabular-nums ${margin < 62 ? "text-g-orange" : "text-g-green"}`}
              >
                {price ? `${margin}%` : "—"}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-g-muted">
              {tr("Food cost {n}% · target under 32%", {
                n: price ? 100 - margin : 0,
              })}
            </p>
          </div>
          <p className="px-1 text-[12px] text-g-muted">
            {tr(
              "Every sale writes these amounts off the stock. The kitchen sees the card when they hold the dish.",
            )}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
