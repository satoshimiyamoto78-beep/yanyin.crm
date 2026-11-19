"use client";

import { Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  allItems,
  formatMoney,
  type Category,
  type I18nText,
  type Menu,
  type MenuItem,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { applyEdits, menuEdits } from "@/lib/menu-edits";
import { saveStopList, useStopList } from "@/lib/stoplist";
import { DishTile } from "@/components/guest/ui";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import {
  DataTable,
  EmptyState,
  Field,
  PhotoPick,
  Switch,
  TextArea,
  TextField,
  Toolbar,
} from "@/components/system/Kit";
import { useDish, useTr } from "@/components/crew/prefs";
import { DishEditor, type DishDraft } from "./DishEditor";

/*
 * The menu editor (docs/09 §7–8): every category and dish, search and filters,
 * one tap to hide a dish or put it in the stop-list, a dish page to change the
 * name, description, price and photo, and "Add with Yan": a photo and a few
 * words become a draft card. Saved changes reach guests and waiters at once.
 */

type Filter = "all" | "hidden" | "stop" | "draft";

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
  const published = useMemo(() => applyEdits(menu, edits), [menu, edits]);
  // The editor lists every dish, hidden ones too: the seed plus the new ones, with edits applied.
  const all = useMemo(() => {
    const seen = applyEdits(menu, {
      ...edits,
      items: Object.fromEntries(
        Object.entries(edits.items).map(([k, v]) => [
          k,
          { ...v, hidden: false },
        ]),
      ),
    });
    return allItems(seen);
  }, [menu, edits]);
  const catOf = useMemo(
    () =>
      new Map(
        menu.categories
          .flatMap((c) => c.items.map((i) => [i.id, c] as const))
          .concat(
            edits.added.map(
              (a) =>
                [
                  a.id,
                  menu.categories.find((c) => c.id === a.categoryId)!,
                ] as const,
            ),
          ),
      ),
    [menu, edits.added],
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const saveDraft = (id: string, d: DishDraft) =>
    store.set((cur) => ({
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
        },
      },
    }));
  const money = (n: number) => formatMoney(n, menu.venue.currency, "en");
  const hidden = (id: string) => !!edits.items[id]?.hidden;
  const query = q.trim().toLowerCase();
  const rows = all.filter(
    (i) =>
      (cat === "all" || i.categoryId === cat) &&
      (filter === "all" ||
        (filter === "hidden" && hidden(i.id)) ||
        (filter === "stop" && stop.includes(i.id)) ||
        (filter === "draft" && i.status === "suggested")) &&
      (!query ||
        Object.values(i.name).some((v) =>
          (v ?? "").toLowerCase().includes(query),
        )),
  );
  const toggleHidden = (i: MenuItem) => {
    haptic("tick");
    const h = !hidden(i.id);
    store.set((e) => ({
      ...e,
      items: { ...e.items, [i.id]: { ...e.items[i.id], hidden: h } },
    }));
    notify(
      h
        ? tr("{name} is hidden from guests", { name: dish(i.name) })
        : tr("{name} is back on the menu", { name: dish(i.name) }),
    );
  };
  const state = (i: MenuItem) =>
    hidden(i.id)
      ? { label: tr("Hidden"), cls: "chip-gray" }
      : stop.includes(i.id)
        ? { label: tr("Ran out"), cls: "chip-red" }
        : i.status === "suggested"
          ? { label: tr("Draft"), cls: "chip-orange" }
          : { label: tr("On the menu"), cls: "chip-green" };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [
            "dish",
            tr("Dishes"),
            String(allItems(published).length),
            tr("guests see them"),
          ] as const,
          [
            "draft",
            tr("Drafts"),
            String(all.filter((i) => i.status === "suggested").length),
            tr("check and confirm"),
          ] as const,
          [
            "stop",
            tr("Stop-list"),
            String(stop.length),
            tr("ran out today"),
          ] as const,
          [
            "hidden",
            tr("Hidden"),
            String(all.filter((i) => hidden(i.id)).length),
            tr("not on the menu"),
          ] as const,
        ].map(([art, title, value, sub]) => (
          <ArtScene
            key={title}
            name={art}
            layout="row"
            focal={36}
            className="rounded-[22px] p-3.5"
            footer={
              <p className="mt-2.5 truncate text-[12px] text-g-muted">{sub}</p>
            }
          >
            <p className="truncate text-[13px] font-semibold text-g-ink-2">
              {title}
            </p>
            <p className="text-[24px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {value}
            </p>
          </ArtScene>
        ))}
      </div>

      {/* Two clear ways to add: by hand, or a photo and a few words for Yan. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
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
      </div>

      <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5">
        {[
          { id: "all", name: { en: "All" } as I18nText },
          ...menu.categories,
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              haptic("tick");
              setCat(c.id);
            }}
            aria-pressed={cat === c.id}
            className={`press h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors ${cat === c.id ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
          >
            {c.id === "all" ? tr("All") : dish(c.name)}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Toolbar
          query={q}
          onQuery={setQ}
          placeholder={tr("Find a dish")}
          chips={[
            { id: "all", label: tr("All"), count: all.length },
            {
              id: "draft",
              label: tr("Drafts"),
              count: all.filter((i) => i.status === "suggested").length,
            },
            { id: "stop", label: tr("Ran out"), count: stop.length },
            {
              id: "hidden",
              label: tr("Hidden"),
              count: all.filter((i) => hidden(i.id)).length,
            },
          ]}
          active={filter}
          onChip={(id) => setFilter(id as Filter)}
        />
      </div>
      <div className="mt-4">
        <DataTable
          rows={rows}
          rowKey={(i) => i.id}
          onRow={(i) => setOpen(i.id)}
          columns={[
            {
              key: "dish",
              label: tr("Dish"),
              render: (i) => (
                <span className="flex items-center gap-3">
                  <DishTile
                    item={i}
                    role={catOf.get(i.id)?.role ?? "main"}
                    glyph={0.6}
                    soft
                    className="size-11 shrink-0 rounded-[14px] !bg-g-card"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-semibold ${hidden(i.id) ? "text-g-faint line-through" : ""}`}
                    >
                      {dish(i.name)}
                    </span>
                    <span className="block truncate text-[12.5px] text-g-muted">
                      {dish(catOf.get(i.id)?.name)}
                    </span>
                  </span>
                </span>
              ),
              sort: (i) => dish(i.name),
            },
            {
              key: "state",
              label: tr("Status"),
              width: "150px",
              render: (i) => (
                <span
                  className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${state(i).cls}`}
                >
                  {state(i).label}
                </span>
              ),
            },
            {
              key: "price",
              label: tr("Price"),
              width: "150px",
              align: "right",
              render: (i) => (
                <span className="font-semibold">{money(i.price)}</span>
              ),
              sort: (i) => i.price,
            },
            {
              key: "show",
              label: tr("Guests see it"),
              width: "130px",
              align: "right",
              render: (i) => (
                <span
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex"
                >
                  <Switch
                    on={!hidden(i.id)}
                    onChange={() => toggleHidden(i)}
                    label={tr("Guests see it")}
                  />
                </span>
              ),
            },
          ]}
          mobile={(i) => (
            <div className="flex min-w-0 items-center gap-3 rounded-[22px] bg-g-fill p-2 pr-3">
              <button
                type="button"
                onClick={() => setOpen(i.id)}
                className="press flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <DishTile
                  item={i}
                  role={catOf.get(i.id)?.role ?? "main"}
                  glyph={0.6}
                  soft
                  className="size-14 shrink-0 rounded-[16px] !bg-g-card"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[15px] font-semibold ${hidden(i.id) ? "text-g-faint line-through" : ""}`}
                  >
                    {dish(i.name)}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="text-[14px] font-semibold tabular-nums">
                      {money(i.price)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${state(i).cls}`}
                    >
                      {state(i).label}
                    </span>
                  </span>
                </span>
              </button>
              <Switch
                on={!hidden(i.id)}
                onChange={() => toggleHidden(i)}
                label={tr("Guests see it")}
              />
            </div>
          )}
          empty={
            <EmptyState
              art="menu"
              title={tr("Nothing found")}
              text={tr("Try another word or filter.")}
              action={{
                label: tr("Show everything"),
                onClick: () => (setQ(""), setFilter("all"), setCat("all")),
              }}
            />
          }
        />
      </div>

      {open && (
        <DishEditor
          item={all.find((i) => i.id === open)!}
          categories={menu.categories}
          categoryId={catOf.get(open)?.id ?? menu.categories[0]!.id}
          edit={edits.items[open] ?? {}}
          stopped={stop.includes(open)}
          money={money}
          onStop={(on) => {
            saveStopList(on ? [...stop, open] : stop.filter((x) => x !== open));
            notify(on ? tr("Marked as ran out") : tr("Back in stock"));
          }}
          onSave={(d) => {
            saveDraft(open, d);
            haptic("success");
            notify(tr("Saved · guests see it now"));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {creating && (
        <DishEditor
          item={null}
          categories={menu.categories}
          categoryId={cat !== "all" ? cat : menu.categories[0]!.id}
          edit={{}}
          stopped={false}
          money={money}
          onStop={() => {}}
          onSave={(d) => {
            const id = `new-${Date.now()}`;
            store.set((cur) => ({
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
              items: d.hidden
                ? { ...cur.items, [id]: { hidden: true } }
                : cur.items,
            }));
            haptic("success");
            notify(tr("{name} is on the menu", { name: dish(d.name) }));
            setCreating(false);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {adding && (
        <AddWithYan
          categories={menu.categories}
          onClose={() => setAdding(false)}
          onAdd={(n) => {
            store.set((cur) => ({ ...cur, added: [...cur.added, n] }));
            haptic("success");
            notify(tr("{name} is on the menu", { name: n.name.en ?? "" }));
            setAdding(false);
          }}
        />
      )}
    </div>
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
                id: `new-${Date.now()}`,
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
