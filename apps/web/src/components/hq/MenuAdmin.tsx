"use client";

import {
  Archive,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  ListChecks,
  Percent,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  allItems,
  formatMoney,
  type Category,
  type CategoryRole,
  type I18nText,
  type Menu,
  type MenuItem,
  type ModifierGroup,
  type Station,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import {
  applyEdits,
  categoriesOf,
  editorItems,
  menuEdits,
  modLibrary,
  type MenuEdits,
} from "@/lib/menu-edits";
import { saveStopList, useStopList } from "@/lib/stoplist";
import { venueStation } from "@/lib/demo-kitchen";
import { DishTile } from "@/components/guest/ui";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import {
  EmptyState,
  Field,
  PhotoPick,
  Switch,
  TextArea,
  TextField,
  Toolbar,
} from "@/components/system/Kit";
import { DragList } from "@/components/crew/DragList";
import { useDish, usePrefs, useTr } from "@/components/crew/prefs";
import { DishEditor, type DishDraft } from "./DishEditor";

/*
 * The menu (docs/11, docs/07 §89). Three tabs:
 *  - Dishes: tiles, "+ Dish" and "With Yan", categories and filters (drafts,
 *    ran out, hidden, archive), a select mode for bulk actions (hide, show,
 *    move, change prices by a percent, archive), the dish page.
 *  - Categories: drag to order, rename, hide, default station, serving hours,
 *    add a category.
 *  - Modifiers: the library of groups (doneness, sauces, extras) shared by
 *    many dishes: required or not, how many to pick, options with prices.
 * Every change lands in one store the guest menu and the waiter read.
 */

type Tab = "dishes" | "cats" | "mods";
let seq = 0;
/** A fresh id for something the admin creates. */
const uid = (p: string) => `${p}-${Date.now().toString(36)}${++seq}`;
type Filter = "all" | "hidden" | "stop" | "draft" | "archive";
const STATIONS: { id: Station; label: string }[] = [
  { id: "hot", label: "Hot kitchen" },
  { id: "cold", label: "Cold kitchen" },
  { id: "bar", label: "Bar" },
];
const ROLE_STATION = (r: CategoryRole): Station =>
  r === "drink" || r === "hot_drink" || r === "alcohol"
    ? "bar"
    : r === "salad" || r === "dessert" || r === "starter"
      ? "cold"
      : "hot";
const seg = (on: boolean) =>
  `h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`;

export function MenuAdmin({
  menu,
  notify,
}: {
  menu: Menu;
  notify: (title: string) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const store = menuEdits(menu.venue.slug);
  const edits = store.use();
  const stop = useStopList();
  const [tab, setTab] = useState<Tab>("dishes");
  const published = applyEdits(menu, edits);
  const all = editorItems(menu, edits);
  const cats = categoriesOf(menu, edits);
  const library = modLibrary(menu, edits);
  const catById = (id: string) => cats.find((c) => c.id === id);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [bulk, setBulk] = useState<"move" | "price" | null>(null);
  const [group, setGroup] = useState<ModifierGroup | null>(null);
  const [catEdit, setCatEdit] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, menu.venue.currency, "en");
  const hidden = (id: string) => !!edits.items[id]?.hidden;
  const archived = (id: string) => !!edits.items[id]?.archived;
  const query = q.trim().toLowerCase();
  const live = all.filter((i) => !archived(i.id));
  const rows = (
    filter === "archive" ? all.filter((i) => archived(i.id)) : live
  ).filter(
    (i) =>
      (cat === "all" || i.categoryId === cat) &&
      (filter === "all" ||
        filter === "archive" ||
        (filter === "hidden" && hidden(i.id)) ||
        (filter === "stop" && stop.includes(i.id)) ||
        (filter === "draft" && i.status === "suggested")) &&
      (!query ||
        Object.values(i.name).some((v) =>
          (v ?? "").toLowerCase().includes(query),
        )),
  );
  const put = (fn: (e: MenuEdits) => MenuEdits) => store.set(fn);
  const patchItems = (
    ids: string[],
    p: (id: string) => Partial<MenuEdits["items"][string]>,
  ) =>
    put((e) => ({
      ...e,
      items: {
        ...e.items,
        ...Object.fromEntries(
          ids.map((id) => [id, { ...e.items[id], ...p(id) }]),
        ),
      },
    }));
  const toggleHidden = (i: MenuItem) => {
    haptic("tick");
    const h = !hidden(i.id);
    patchItems([i.id], () => ({ hidden: h }));
    notify(
      h
        ? tr("{name} is hidden from guests", { name: dish(i.name) })
        : tr("{name} is back on the menu", { name: dish(i.name) }),
    );
  };
  const state = (i: MenuItem) =>
    archived(i.id)
      ? { label: tr("Archive"), cls: "chip-gray" }
      : hidden(i.id)
        ? { label: tr("Hidden"), cls: "chip-gray" }
        : stop.includes(i.id)
          ? { label: tr("Ran out"), cls: "chip-red" }
          : i.status === "suggested"
            ? { label: tr("Draft"), cls: "chip-orange" }
            : { label: tr("On the menu"), cls: "chip-green" };
  const saveDish = (id: string, d: DishDraft, item?: MenuItem) => {
    const before = item?.price;
    put((cur) => ({
      ...cur,
      items: {
        ...cur.items,
        [id]: {
          ...cur.items[id],
          name: d.name,
          description: d.description,
          price: d.price,
          photos: d.photos,
          photo: d.photos[0],
          hidden: d.hidden,
          categoryId: d.categoryId,
          variants: d.variants,
          modIds: d.modIds,
          station: d.station,
          cookMin: d.cookMin,
          tags: d.tags,
          allergens: d.allergens,
          weight: d.weight,
          kcal: d.kcal,
          spicy: d.spicy,
          channels: d.channels,
          schedule: d.schedule,
          vat: d.vat,
        },
      },
      prices:
        before !== undefined && before !== d.price
          ? {
              ...cur.prices,
              [id]: [
                { at: "14 Nov 12:45", from: before, to: d.price, by: "huong" },
                ...(cur.prices?.[id] ?? []),
              ],
            }
          : cur.prices,
    }));
  };
  const duplicate = (i: MenuItem) => {
    const id = uid("new");
    put((cur) => ({
      ...cur,
      added: [
        ...cur.added,
        {
          id,
          categoryId: i.categoryId,
          name: Object.fromEntries(
            Object.entries(i.name).map(([k, v]) => [k, `${v} (2)`]),
          ) as I18nText,
          description: i.description,
          price: i.price,
          photo: i.photo,
        },
      ],
      items: { ...cur.items, [id]: { ...cur.items[i.id], hidden: true } },
    }));
    haptic("success");
    notify(tr("Copy made · hidden until you check it"));
    setOpen(null);
  };
  const tiles = [
    [
      "dish",
      tr("Dishes"),
      String(allItems(published).length),
      tr("guests see them"),
      "all",
    ],
    [
      "draft",
      tr("Drafts"),
      String(live.filter((i) => i.status === "suggested").length),
      tr("check and confirm"),
      "draft",
    ],
    ["stop", tr("Stop-list"), String(stop.length), tr("ran out today"), "stop"],
    [
      "hidden",
      tr("Hidden"),
      String(live.filter((i) => hidden(i.id)).length),
      tr("not on the menu"),
      "hidden",
    ],
  ] as const;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([art, title, value, sub, f]) => (
          <button
            key={title}
            type="button"
            onClick={() => (haptic("light"), setTab("dishes"), setFilter(f))}
            className="press text-left"
          >
            <ArtScene
              name={art}
              layout="row"
              focal={36}
              className="rounded-[22px] p-3.5"
              footer={
                <p className="mt-2.5 truncate text-[12px] text-g-muted">
                  {sub}
                </p>
              }
            >
              <p className="truncate text-[13px] font-semibold text-g-ink-2">
                {title}
              </p>
              <p className="live text-[24px] leading-none font-bold tracking-[-0.03em] tabular-nums">
                {value}
              </p>
            </ArtScene>
          </button>
        ))}
      </div>

      <div className="flex justify-self-start rounded-full bg-g-fill p-1">
        {(
          [
            ["dishes", tr("Dishes")],
            ["cats", tr("Categories")],
            ["mods", tr("Modifiers")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => (haptic("tick"), setTab(id))}
            className={seg(tab === id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-rise grid gap-4">
        {tab === "dishes" && (
          <>
            {/* Two clear ways to add and a select mode for many dishes at once. */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => (haptic("light"), setCreating(true))}
                className="blue-grad press flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
              >
                <Plus size={18} strokeWidth={2.6} /> {tr("Dish")}
              </button>
              <button
                type="button"
                onClick={() => (haptic("light"), setAdding(true))}
                className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
              >
                <Sparkles size={17} strokeWidth={2.2} className="text-g-blue" />{" "}
                {tr("With Yan")}
              </button>
              <button
                type="button"
                aria-pressed={selecting}
                aria-label={tr("Select")}
                onClick={() => (
                  haptic("light"),
                  setSelecting(!selecting),
                  setPicked([])
                )}
                className={`press grid size-12 place-items-center rounded-full ${selecting ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill"}`}
              >
                {selecting ? <X size={19} /> : <ListChecks size={19} />}
              </button>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {[{ id: "all", name: { en: "All" } as I18nText }, ...cats].map(
                (c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => (haptic("tick"), setCat(c.id))}
                    aria-pressed={cat === c.id}
                    className={`press h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors ${cat === c.id ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill text-g-ink-2"}`}
                  >
                    {c.id === "all" ? tr("All") : dish(c.name)}
                  </button>
                ),
              )}
            </div>
            <Toolbar
              query={q}
              onQuery={setQ}
              placeholder={tr("Find a dish")}
              chips={[
                { id: "all", label: tr("All"), count: live.length },
                {
                  id: "draft",
                  label: tr("Drafts"),
                  count: live.filter((i) => i.status === "suggested").length,
                },
                { id: "stop", label: tr("Ran out"), count: stop.length },
                {
                  id: "hidden",
                  label: tr("Hidden"),
                  count: live.filter((i) => hidden(i.id)).length,
                },
                {
                  id: "archive",
                  label: tr("Archive"),
                  count: all.length - live.length,
                },
              ]}
              active={filter}
              onChip={(id) => setFilter(id as Filter)}
            />
            {rows.length ? (
              <div className="stagger grid gap-2 md:grid-cols-2">
                {rows.map((i) => {
                  const on = picked.includes(i.id);
                  const x = edits.items[i.id];
                  return (
                    <div
                      key={i.id}
                      className={`flex min-w-0 items-center gap-3 rounded-[22px] p-2 pr-3 transition-colors ${on ? "bg-g-blue/12 ring-2 ring-g-blue" : "bg-g-fill"}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          selecting
                            ? (haptic("tick"),
                              setPicked(
                                on
                                  ? picked.filter((p) => p !== i.id)
                                  : [...picked, i.id],
                              ))
                            : (haptic("light"), setOpen(i.id))
                        }
                        className="press flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {selecting && (
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-g-blue bg-g-blue text-white" : "border-g-line"}`}
                          >
                            {on && <Check size={13} strokeWidth={3} />}
                          </span>
                        )}
                        <DishTile
                          item={i}
                          role={catById(i.categoryId)?.role ?? "main"}
                          glyph={0.6}
                          soft
                          className="size-14 shrink-0 rounded-[16px] !bg-g-card"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[15px] font-semibold ${hidden(i.id) || archived(i.id) ? "text-g-faint line-through" : ""}`}
                          >
                            {dish(i.name)}
                          </span>
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            <span className="text-[14px] font-semibold tabular-nums">
                              {i.variants.length > 1 ? `${tr("from")} ` : ""}
                              {money(i.price)}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${state(i).cls}`}
                            >
                              {state(i).label}
                            </span>
                            {x?.schedule && (
                              <span className="truncate text-[11.5px] text-g-muted">{`${x.schedule.from}–${x.schedule.to}`}</span>
                            )}
                          </span>
                          <span className="block truncate text-[12px] text-g-muted">
                            {dish(catById(i.categoryId)?.name)}
                            {i.variants.length > 1
                              ? ` · ${tr("{n} sizes", { n: i.variants.length })}`
                              : ""}
                            {i.modifierGroups.length
                              ? ` · ${tr("{n} modifiers", { n: i.modifierGroups.length })}`
                              : ""}
                          </span>
                        </span>
                      </button>
                      {!selecting && !archived(i.id) && (
                        <Switch
                          on={!hidden(i.id)}
                          onChange={() => toggleHidden(i)}
                          label={tr("Guests see it")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                art="dish"
                title={tr("Nothing found")}
                text={tr("Try another word or filter.")}
                action={{
                  label: tr("Show everything"),
                  onClick: () => (setQ(""), setFilter("all"), setCat("all")),
                }}
              />
            )}
          </>
        )}

        {tab === "cats" && (
          <>
            <p className="px-1 text-[13px] text-g-muted">
              {tr(
                "Hold and drag to change the order guests see. Tap a category to edit it.",
              )}
            </p>
            <DragList
              items={cats}
              onReorder={(list) => (
                haptic("success"),
                put((e) => ({ ...e, catOrder: list.map((c) => c.id) }))
              )}
              render={(c, { dragging }) => (
                <div
                  className={`mb-2 flex items-center gap-3 rounded-[20px] bg-g-fill p-2 pr-3 ${dragging ? "shadow-[0_12px_32px_-12px_rgba(11,11,15,0.4)]" : ""}`}
                >
                  <GripVertical size={18} className="shrink-0 text-g-faint" />
                  <button
                    type="button"
                    onClick={() => (haptic("light"), setCatEdit(c.id))}
                    className="press flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[15px] font-semibold ${c.edit.hidden ? "text-g-faint line-through" : ""}`}
                      >
                        {dish(c.name)}
                      </span>
                      <span className="block truncate text-[12.5px] text-g-muted">
                        {tr("{n} dishes", {
                          n: all.filter(
                            (i) => i.categoryId === c.id && !archived(i.id),
                          ).length,
                        })}{" "}
                        ·{" "}
                        {tr(
                          STATIONS.find(
                            (s) =>
                              s.id === (c.edit.station ?? ROLE_STATION(c.role)),
                          )!.label,
                        )}
                        {c.edit.hours
                          ? ` · ${c.edit.hours.from}–${c.edit.hours.to}`
                          : ""}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-g-faint" />
                  </button>
                  <button
                    type="button"
                    aria-label={tr(c.edit.hidden ? "Show" : "Hide")}
                    onClick={() => (
                      haptic("tick"),
                      put((e) => ({
                        ...e,
                        cats: {
                          ...e.cats,
                          [c.id]: { ...e.cats?.[c.id], hidden: !c.edit.hidden },
                        },
                      }))
                    )}
                    className="press grid size-9 shrink-0 place-items-center rounded-full bg-g-card"
                  >
                    {c.edit.hidden ? (
                      <EyeOff size={16} className="text-g-muted" />
                    ) : (
                      <Eye size={16} className="text-g-blue" />
                    )}
                  </button>
                </div>
              )}
            />
            <button
              type="button"
              onClick={() => (haptic("light"), setCatEdit("new"))}
              className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
            >
              <Plus size={17} className="text-g-blue" /> {tr("New category")}
            </button>
          </>
        )}

        {tab === "mods" && (
          <>
            <p className="px-1 text-[13px] text-g-muted">
              {tr(
                "A group is made once and attached to many dishes: doneness, sauces, extras, sizes of a hookah.",
              )}
            </p>
            <div className="stagger grid gap-2 md:grid-cols-2">
              {library.map((g) => {
                const used = all.filter((i) =>
                  i.modifierGroups.some((m) => m.id === g.id),
                ).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => (haptic("light"), setGroup(g))}
                    className="press rounded-[22px] bg-g-fill p-3.5 text-left"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15.5px] font-bold">
                        {dish(g.name)}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${g.required ? "chip-orange" : "chip-gray"}`}
                      >
                        {tr(g.required ? "required" : "optional")}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[12.5px] text-g-muted">
                      {g.max === 1
                        ? tr("one choice")
                        : tr("up to {n}", { n: g.max })}{" "}
                      · {tr("{n} options", { n: g.options.length })} ·{" "}
                      {tr("in {n} dishes", { n: used })}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1">
                      {g.options.slice(0, 5).map((o) => (
                        <span
                          key={o.id}
                          className="rounded-full bg-g-card px-2.5 py-1 text-[12px] font-medium"
                        >
                          {dish(o.name)}
                          {o.price ? ` +${Math.round(o.price / 1000)}k` : ""}
                        </span>
                      ))}
                      {g.options.length > 5 && (
                        <span className="px-1 py-1 text-[12px] text-g-muted">
                          +{g.options.length - 5}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => (
                haptic("light"),
                setGroup({
                  id: uid("mg"),
                  name: { en: "" },
                  required: false,
                  max: 1,
                  display: "chips",
                  options: [],
                })
              )}
              className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
            >
              <Plus size={17} className="text-g-blue" /> {tr("New group")}
            </button>
          </>
        )}
      </div>

      {/* Bulk bar: what to do with the picked dishes. */}
      {selecting && picked.length > 0 && (
        <div className="animate-rise fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+172px)] z-40 mx-auto max-w-[560px] rounded-[24px] bg-g-ink p-2 text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] lg:bottom-6 [[data-scheme=dark]_&]:bg-[#2c2f38]">
          <p className="px-2 pt-1 pb-2 text-[13px] font-semibold text-white/70">
            {tr("{n} picked", { n: picked.length })}
          </p>
          <div className="grid grid-cols-5 gap-1">
            {(
              [
                [
                  EyeOff,
                  tr("Hide"),
                  () => (
                    patchItems(picked, () => ({ hidden: true })),
                    notify(tr("Hidden from guests"))
                  ),
                ],
                [
                  Eye,
                  tr("Show"),
                  () => (
                    patchItems(picked, () => ({ hidden: false })),
                    notify(tr("Back on the menu"))
                  ),
                ],
                [ChevronRight, tr("Move"), () => setBulk("move")],
                [Percent, tr("Price"), () => setBulk("price")],
                [
                  Archive,
                  tr("Archive"),
                  () => (
                    patchItems(picked, () => ({ archived: true })),
                    notify(tr("Moved to the archive")),
                    setPicked([])
                  ),
                ],
              ] as const
            ).map(([I, label, fn]) => (
              <button
                key={label}
                type="button"
                onClick={() => (haptic("light"), fn())}
                className="press flex flex-col items-center gap-1 rounded-[16px] py-2 text-[11.5px] font-semibold hover:bg-white/10"
              >
                <I size={18} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {bulk === "move" && (
        <Sheet
          open
          onClose={() => setBulk(null)}
          label={tr("Move to a category")}
        >
          <div className="grid gap-2 px-5 pt-2 pb-10">
            <h2 className="text-[26px] font-bold tracking-[-0.025em]">
              {tr("Move {n} dishes to", { n: picked.length })}
            </h2>
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => (
                  haptic("success"),
                  patchItems(picked, () => ({ categoryId: c.id })),
                  notify(tr("Moved to {cat}", { cat: dish(c.name) })),
                  setBulk(null),
                  setPicked([])
                )}
                className="press flex h-12 items-center justify-between rounded-[18px] bg-g-fill px-4 text-left text-[15px] font-semibold"
              >
                {dish(c.name)}{" "}
                <ChevronRight size={16} className="text-g-faint" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {bulk === "price" && (
        <BulkPrice
          items={all.filter((i) => picked.includes(i.id))}
          money={money}
          onClose={() => setBulk(null)}
          onApply={(pct) => {
            put((cur) => ({
              ...cur,
              items: {
                ...cur.items,
                ...Object.fromEntries(
                  all
                    .filter((i) => picked.includes(i.id))
                    .map((i) => [
                      i.id,
                      {
                        ...cur.items[i.id],
                        price:
                          Math.round((i.price * (1 + pct / 100)) / 1000) * 1000,
                      },
                    ]),
                ),
              },
              prices: {
                ...cur.prices,
                ...Object.fromEntries(
                  all
                    .filter((i) => picked.includes(i.id))
                    .map((i) => [
                      i.id,
                      [
                        {
                          at: "14 Nov 12:45",
                          from: i.price,
                          to:
                            Math.round((i.price * (1 + pct / 100)) / 1000) *
                            1000,
                          by: "huong",
                        },
                        ...(cur.prices?.[i.id] ?? []),
                      ],
                    ]),
                ),
              },
            }));
            haptic("success");
            notify(
              tr("Prices changed by {p}% for {n} dishes", {
                p: pct > 0 ? `+${pct}` : pct,
                n: picked.length,
              }),
            );
            setBulk(null);
            setPicked([]);
          }}
        />
      )}

      {open &&
        (() => {
          const item = all.find((i) => i.id === open)!;
          return (
            <DishEditor
              item={item}
              categories={cats as unknown as Category[]}
              categoryId={item.categoryId}
              edit={edits.items[open] ?? {}}
              stopped={stop.includes(open)}
              money={money}
              library={library}
              defaultStation={venueStation(menu, item)}
              history={edits.prices?.[open] ?? []}
              onDuplicate={() => duplicate(item)}
              onArchive={() => (
                patchItems([open], () => ({ archived: !archived(open) })),
                notify(
                  archived(open)
                    ? tr("Back on the menu")
                    : tr("Moved to the archive"),
                ),
                setOpen(null)
              )}
              onNewGroup={() =>
                setGroup({
                  id: uid("mg"),
                  name: { en: "" },
                  required: false,
                  max: 1,
                  display: "chips",
                  options: [],
                })
              }
              onStop={(on) => {
                saveStopList(
                  on ? [...stop, open] : stop.filter((x) => x !== open),
                );
                notify(on ? tr("Marked as ran out") : tr("Back in stock"));
              }}
              onSave={(d) => {
                saveDish(open, d, item);
                haptic("success");
                notify(tr("Saved · guests see it now"));
                setOpen(null);
              }}
              onClose={() => setOpen(null)}
            />
          );
        })()}
      {creating && (
        <DishEditor
          item={null}
          categories={cats as unknown as Category[]}
          categoryId={cat !== "all" ? cat : cats[0]!.id}
          edit={{}}
          stopped={false}
          money={money}
          library={library}
          defaultStation="hot"
          history={[]}
          onDuplicate={() => {}}
          onArchive={() => {}}
          onNewGroup={() =>
            setGroup({
              id: uid("mg"),
              name: { en: "" },
              required: false,
              max: 1,
              display: "chips",
              options: [],
            })
          }
          onStop={() => {}}
          onSave={(d) => {
            const id = uid("new");
            put((cur) => ({
              ...cur,
              added: [
                ...cur.added,
                {
                  id,
                  categoryId: d.categoryId,
                  name: d.name,
                  description: d.description,
                  price: d.price,
                  photos: d.photos,
                  photo: d.photos[0],
                },
              ],
            }));
            saveDish(id, d);
            haptic("success");
            notify(tr("{name} is on the menu", { name: dish(d.name) }));
            setCreating(false);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {group && (
        <GroupEditor
          group={group}
          used={
            all.filter((i) => i.modifierGroups.some((m) => m.id === group.id))
              .length
          }
          onClose={() => setGroup(null)}
          onDelete={() => (
            put((e) => ({
              ...e,
              modsRemoved: [...(e.modsRemoved ?? []), group.id],
            })),
            notify(tr("Group deleted")),
            setGroup(null)
          )}
          onSave={(g) => (
            put((e) => ({ ...e, mods: { ...e.mods, [g.id]: g } })),
            haptic("success"),
            notify(tr("Saved · every dish with it is updated")),
            setGroup(null)
          )}
        />
      )}
      {catEdit && (
        <CategoryEditor
          cat={
            catEdit === "new"
              ? null
              : (cats.find((c) => c.id === catEdit) ?? null)
          }
          count={all.filter((i) => i.categoryId === catEdit).length}
          onClose={() => setCatEdit(null)}
          onSave={(c) => {
            if (catEdit === "new")
              put((e) => ({
                ...e,
                addedCats: [
                  ...(e.addedCats ?? []),
                  { id: uid("cat"), name: c.name, role: c.role },
                ],
              }));
            else
              put((e) => ({
                ...e,
                cats: {
                  ...e.cats,
                  [catEdit]: {
                    ...e.cats?.[catEdit],
                    name: c.name,
                    station: c.station,
                    hours: c.hours,
                  },
                },
              }));
            haptic("success");
            notify(tr("Saved"));
            setCatEdit(null);
          }}
        />
      )}
      {adding && (
        <AddWithYan
          categories={menu.categories}
          onClose={() => setAdding(false)}
          onAdd={(n) => {
            put((cur) => ({ ...cur, added: [...cur.added, n] }));
            haptic("success");
            notify(tr("{name} is on the menu", { name: n.name.en ?? "" }));
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function BulkPrice({
  items,
  money,
  onClose,
  onApply,
}: {
  items: MenuItem[];
  money: (n: number) => string;
  onClose: () => void;
  onApply: (pct: number) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const [pct, setPct] = useState(10);
  const next = (p: number) => Math.round((p * (1 + pct / 100)) / 1000) * 1000;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Change prices")}
      footer={
        <button
          type="button"
          onClick={() => onApply(pct)}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Apply to {n} dishes", { n: items.length })}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <h2 className="text-[26px] font-bold tracking-[-0.025em]">
          {tr("Change prices")}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {[-10, -5, 5, 10, 15, 20].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={pct === v}
              onClick={() => (haptic("tick"), setPct(v))}
              className={`press h-10 rounded-full px-4 text-[14px] font-semibold ${pct === v ? "chip-blue" : "bg-g-fill"}`}
            >
              {v > 0 ? `+${v}` : v}%
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-g-muted">
          {tr(
            "Rounded to a thousand. The old prices stay in each dish's history.",
          )}
        </p>
        <div className="overflow-hidden rounded-[20px] bg-g-fill">
          {items.map((i, k) => (
            <div
              key={i.id}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] ${k ? "border-t border-g-line" : ""}`}
            >
              <span className="truncate font-semibold">{dish(i.name)}</span>
              <span className="shrink-0 tabular-nums">
                <span className="text-g-muted line-through">
                  {money(i.price)}
                </span>{" "}
                <b>{money(next(i.price))}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function GroupEditor({
  group,
  used,
  onClose,
  onSave,
  onDelete,
}: {
  group: ModifierGroup;
  used: number;
  onClose: () => void;
  onSave: (g: ModifierGroup) => void;
  onDelete: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const lang = usePrefs().prefs.lang;
  const [name, setName] = useState(dish(group.name));
  const [required, setRequired] = useState(group.required);
  const [max, setMax] = useState(group.max);
  const [opts, setOpts] = useState(
    group.options.map((o) => ({ ...o, label: dish(o.name) })),
  );
  const ok =
    name.trim().length > 1 &&
    opts.length > 0 &&
    opts.every((o) => o.label.trim());
  const isNew = !group.name.en && !group.options.length;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Modifier group")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() =>
            onSave({
              ...group,
              name: {
                ...group.name,
                [lang]: name.trim(),
                ...(group.name.en ? {} : { en: name.trim() }),
              },
              required,
              max,
              options: opts.map(({ label, ...o }) => ({
                ...o,
                name: {
                  ...o.name,
                  [lang]: label.trim(),
                  ...(o.name.en ? {} : { en: label.trim() }),
                },
              })),
            })
          }
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save the group")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("Doneness")}
          className="h-14 w-full rounded-[20px] bg-g-fill px-4 text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between gap-2 rounded-[18px] bg-g-fill px-3.5 py-2.5">
            <span className="text-[14px] font-semibold">{tr("Required")}</span>
            <Switch
              on={required}
              onChange={setRequired}
              label={tr("Required")}
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-[18px] bg-g-fill px-2 py-1.5">
            <span className="pl-1.5 text-[13px] font-semibold">
              {tr("Pick up to")}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label="−"
                onClick={() => (haptic("tick"), setMax(Math.max(1, max - 1)))}
                className="press grid size-8 place-items-center rounded-full bg-g-card"
              >
                −
              </button>
              <span className="w-6 text-center text-[16px] font-bold tabular-nums">
                {max}
              </span>
              <button
                type="button"
                aria-label="+"
                onClick={() => (haptic("tick"), setMax(max + 1))}
                className="press grid size-8 place-items-center rounded-full bg-g-card"
              >
                +
              </button>
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-g-fill">
          {opts.map((o, i) => (
            <div
              key={o.id}
              className={`flex items-center gap-2 px-2 py-1.5 ${i ? "border-t border-g-line" : ""}`}
            >
              <input
                value={o.label}
                onChange={(e) =>
                  setOpts(
                    opts.map((x, k) =>
                      k === i ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                placeholder={tr("Medium")}
                className="h-10 min-w-0 flex-1 bg-transparent px-2 text-[15px] font-semibold outline-none"
              />
              <span className="flex h-10 w-[110px] items-center gap-1 rounded-full bg-g-card px-3">
                <span className="text-[12px] text-g-muted">+</span>
                <input
                  inputMode="numeric"
                  value={o.price ? o.price.toLocaleString("en-US") : ""}
                  onChange={(e) =>
                    setOpts(
                      opts.map((x, k) =>
                        k === i
                          ? {
                              ...x,
                              price:
                                Number(e.target.value.replace(/\D/g, "")) || 0,
                            }
                          : x,
                      ),
                    )
                  }
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-right text-[14px] font-bold outline-none tabular-nums"
                />
              </span>
              <button
                type="button"
                aria-label={tr("Remove")}
                onClick={() => (
                  haptic("light"),
                  setOpts(opts.filter((_, k) => k !== i))
                )}
                className="press grid size-8 place-items-center rounded-full text-g-muted"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => (
              haptic("light"),
              setOpts([
                ...opts,
                { id: uid("o"), name: {}, price: 0, label: "" },
              ])
            )}
            className={`press flex h-11 w-full items-center justify-center gap-1.5 text-[14px] font-semibold text-g-blue ${opts.length ? "border-t border-g-line" : ""}`}
          >
            <Plus size={15} /> {tr("Add an option")}
          </button>
        </div>
        <p className="px-1 text-[12.5px] text-g-muted">
          {used
            ? tr("Used in {n} dishes: a change reaches all of them.", {
                n: used,
              })
            : tr("Not attached to any dish yet.")}
        </p>
        {!isNew && (
          <button
            type="button"
            onClick={onDelete}
            className="press h-11 rounded-full bg-g-fill text-[14px] font-semibold text-[#e5484d]"
          >
            {tr("Delete the group")}
          </button>
        )}
      </div>
    </Sheet>
  );
}

function CategoryEditor({
  cat,
  count,
  onClose,
  onSave,
}: {
  cat: ReturnType<typeof categoriesOf>[number] | null;
  count: number;
  onClose: () => void;
  onSave: (c: {
    name: I18nText;
    role: CategoryRole;
    station: Station;
    hours: { from: string; to: string } | null;
  }) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const lang = usePrefs().prefs.lang;
  const [name, setName] = useState(cat ? dish(cat.name) : "");
  const [role, setRole] = useState<CategoryRole>(cat?.role ?? "main");
  const [station, setStation] = useState<Station>(
    cat?.edit.station ?? ROLE_STATION(cat?.role ?? "main"),
  );
  const [hours, setHours] = useState(cat?.edit.hours ?? null);
  const ROLES: [CategoryRole, string][] = [
    ["main", "Mains"],
    ["soup", "Soups"],
    ["salad", "Salads"],
    ["grill", "Grill"],
    ["dessert", "Desserts"],
    ["drink", "Drinks"],
    ["hot_drink", "Hot drinks"],
    ["alcohol", "Alcohol"],
  ];
  return (
    <Sheet
      open
      onClose={onClose}
      label={cat ? dish(cat.name) : tr("New category")}
      footer={
        <button
          type="button"
          disabled={name.trim().length < 2}
          onClick={() =>
            onSave({
              name: {
                ...(cat?.name ?? {}),
                [lang]: name.trim(),
                ...(cat
                  ? {}
                  : { en: name.trim(), ru: name.trim(), vi: name.trim() }),
              },
              role,
              station,
              hours,
            })
          }
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("Breakfasts")}
          className="h-14 w-full rounded-[20px] bg-g-fill px-4 text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint"
        />
        {!cat && (
          <div>
            <p className="mb-1.5 px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("Kind")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(([r, l]) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => (
                    haptic("tick"),
                    setRole(r),
                    setStation(ROLE_STATION(r))
                  )}
                  className={`press h-9 rounded-full px-3.5 text-[13px] font-semibold ${role === r ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
                >
                  {tr(l)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Cooked at")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={station === s.id}
                onClick={() => (haptic("tick"), setStation(s.id))}
                className={`press h-9 rounded-full px-3.5 text-[13px] font-semibold ${station === s.id ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(s.label)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[12px] text-g-muted">
            {tr("New dishes of this category go there; a dish can change it.")}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[18px] bg-g-fill px-3.5 py-3">
          <span className="text-[14.5px] font-semibold">
            {tr("Only at some hours")}
          </span>
          <Switch
            on={!!hours}
            onChange={(v) =>
              setHours(v ? { from: "07:00", to: "12:00" } : null)
            }
            label={tr("Only at some hours")}
          />
        </div>
        {hours && (
          <div className="animate-rise grid grid-cols-2 gap-2">
            {(["from", "to"] as const).map((k) => (
              <label
                key={k}
                className="flex h-11 items-center justify-between gap-2 rounded-full bg-g-fill px-3.5"
              >
                <span className="text-[12.5px] text-g-muted">
                  {tr(k === "from" ? "From" : "To")}
                </span>
                <input
                  type="time"
                  value={hours[k]}
                  onChange={(e) => setHours({ ...hours, [k]: e.target.value })}
                  className="bg-transparent text-[15px] font-bold outline-none tabular-nums"
                />
              </label>
            ))}
          </div>
        )}
        {cat && (
          <p className="px-1 text-[12.5px] text-g-muted">
            {tr("{n} dishes", { n: count })}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/** ADR-007: a photo and a note → Yan's draft card → check → add. */
function AddWithYan({
  categories,
  onClose,
  onAdd,
}: {
  categories: Category[];
  onClose: () => void;
  onAdd: (n: {
    id: string;
    categoryId: string;
    name: I18nText;
    description?: I18nText;
    price: number;
    photo?: string;
  }) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const [photo, setPhoto] = useState<string>();
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<{
    name: I18nText;
    description: I18nText;
    price: string;
    categoryId: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const write = () => {
    haptic("light");
    setBusy(true);
    setTimeout(() => {
      const words = note.trim() || "Grilled lamb ribs with herbs, 290k";
      const price = Number(/(\d+)\s*k/i.exec(words)?.[1] ?? "250") * 1000;
      const base = words.replace(/,?\s*\d+\s*k/i, "").trim();
      const title = base.charAt(0).toUpperCase() + base.slice(1);
      setDraft({
        name: { en: title, ru: title, vi: title },
        description: {
          en: `${title}. Cooked to order, served with fresh herbs and flatbread.`,
          ru: `${title}. Готовим под заказ, подаём со свежей зеленью и лепёшкой.`,
          vi: `${title}. Nấu theo yêu cầu, ăn kèm rau thơm và bánh mì.`,
        },
        price: String(price),
        categoryId:
          categories.find((c) => /grill|shashlik|kebab/i.test(c.name.en ?? ""))
            ?.id ?? categories[0]!.id,
      });
      setBusy(false);
      haptic("success");
    }, 1400);
  };
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Add a dish with Yan")}
      footer={
        draft ? (
          <button
            type="button"
            onClick={() =>
              onAdd({
                id: uid("new"),
                categoryId: draft.categoryId,
                name: draft.name,
                description: draft.description,
                price: Number(draft.price) || 0,
                photo,
              })
            }
            className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
          >
            <Plus size={18} strokeWidth={2.6} /> {tr("Add to the menu")}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={write}
            className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold disabled:opacity-60"
          >
            <Sparkles size={18} strokeWidth={2.2} />{" "}
            {busy ? tr("Yan is writing…") : tr("Write the card")}
          </button>
        )
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10">
        <div>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {draft ? tr("Check the card") : tr("A photo and a few words")}
          </h2>
          <p className="mt-1 text-[14px] text-g-muted">
            {draft
              ? tr(
                  "Yan wrote it in every menu language. Fix anything, then add.",
                )
              : tr("Say what it is and the price; Yan does the rest.")}
          </p>
        </div>
        <PhotoPick
          value={photo}
          onChange={setPhoto}
          label={tr("Take a photo of the dish")}
        />
        {!draft ? (
          <Field
            label={tr("A few words")}
            hint={tr("For example: grilled lamb ribs with herbs, 290k")}
          >
            <TextArea
              value={note}
              onChange={setNote}
              placeholder={tr("Grilled lamb ribs with herbs, 290k")}
              rows={2}
            />
          </Field>
        ) : (
          <div className="animate-rise grid gap-4">
            <Field label={tr("Dish name")}>
              <TextField
                value={draft.name.en ?? ""}
                onChange={(v) =>
                  setDraft({ ...draft, name: { ...draft.name, en: v } })
                }
              />
            </Field>
            <Field label={tr("Description")}>
              <TextArea
                value={draft.description.en ?? ""}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    description: { ...draft.description, en: v },
                  })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("Price")}>
                <TextField
                  value={draft.price}
                  onChange={(v) =>
                    setDraft({ ...draft, price: v.replace(/\D/g, "") })
                  }
                  inputMode="numeric"
                  suffix="₫"
                />
              </Field>
              <Field label={tr("Category")}>
                <select
                  value={draft.categoryId}
                  onChange={(e) =>
                    setDraft({ ...draft, categoryId: e.target.value })
                  }
                  className="h-14 w-full rounded-full bg-g-fill px-5 text-[16px] outline-none focus:ring-2 focus:ring-g-blue/40"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {dish(c.name)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                tr("Translated: EN, RU, VI"),
                tr("Allergens: none found"),
                tr("~ 650 kcal"),
              ].map((c) => (
                <span
                  key={c}
                  className="chip-blue rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
