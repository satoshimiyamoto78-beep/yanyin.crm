"use client";

import { allItems, formatMoney, t, type Category, type Lang, type Menu, type MenuItem } from "@yanyin/domain";
import { ArrowUp, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { ui, type UiKey } from "@/lib/ui-strings";
import { DishTile, Sheet } from "./ui";

/**
 * Yan's mark: a flat disc in the Nomad blue gradient that slowly drifts inside,
 * with a flat white spark. No 3D shading.
 */
/**
 * Yan's face: a flat disc in the Nomad blue gradient that drifts slowly, with two
 * soft eyes that blink now and then and glance to the side. A character, not a logo.
 */
export function YanOrb({ size = 44 }: { size?: number }) {
  const eyeW = Math.max(3, size * 0.11);
  const eyeH = Math.max(6, size * 0.26);
  return (
    <span className="yan-orb relative grid shrink-0 place-items-center overflow-hidden rounded-full" style={{ width: size, height: size }} aria-hidden>
      <span className="yan-eyes flex items-center" style={{ gap: size * 0.16, marginTop: -size * 0.04 }}>
        <span className="yan-eye block rounded-full bg-[#fff]" style={{ width: eyeW, height: eyeH }} />
        <span className="yan-eye block rounded-full bg-[#fff]" style={{ width: eyeW, height: eyeH }} />
      </span>
    </span>
  );
}

type Msg = { from: "guest" | "yan"; text: string; items?: MenuItem[]; pending?: boolean };

const QUESTIONS: UiKey[] = ["yanQPopular", "yanQVeg", "yanQHalal", "yanQMild", "yanQCheap", "yanQDrink"];

const SPICY = /tom yum|spicy|chili|smashed cucumber|adjika|hot/i;

/**
 * Demo brain for Yan: answers from the menu itself with simple intent rules.
 * In production this is Claude with the venue menu as context (docs/02, engine).
 */
function answer(q: string, lang: Lang, items: MenuItem[], roleOf: Map<string, Category["role"]>, currency: Menu["venue"]["currency"]): Omit<Msg, "from"> {
  const s = q.toLowerCase();
  const food = items.filter((i) => !["drink", "hot_drink", "alcohol", "hookah"].includes(roleOf.get(i.id) ?? ""));
  const pick = (list: MenuItem[], n = 4) => [...list].sort((a, b) => Number(!!b.photo) - Number(!!a.photo)).slice(0, n);
  const num = s.match(/(\d[\d\s.,]*)\s*(k|к|тыс|000)?/);
  if (/veg|без мяса|chay|meat ?free/.test(s)) return { text: ui(lang, "yanAVeg"), items: pick(food.filter((i) => i.tags.includes("vegetarian") || i.tags.includes("vegan"))) };
  if (/halal|халял/.test(s)) return { text: ui(lang, "yanAHalal"), items: pick(food.filter((i) => i.tags.includes("halal"))) };
  if (/not spicy|nothing spicy|не остр|mild|không cay/.test(s)) return { text: ui(lang, "yanAMild"), items: pick(food.filter((i) => !SPICY.test(i.name.en ?? ""))) };
  if (/drink|напит|đồ uống|pair/.test(s)) return { text: ui(lang, "yanADrink"), items: pick(items.filter((i) => roleOf.get(i.id) === "drink" || roleOf.get(i.id) === "hot_drink")) };
  if (num && /under|до|dưới|cheap|less/.test(s)) {
    let n = Number(num[1]!.replace(/[\s.,]/g, ""));
    if (num[2] || n < 1000) n *= 1000;
    return { text: ui(lang, "yanACheap").replace("{n}", formatMoney(n, currency, lang)), items: pick(food.filter((i) => i.price <= n).sort((a, b) => b.price - a.price)) };
  }
  if (/popular|популяр|recommend|посовет|gọi nhiều|best/.test(s)) return { text: ui(lang, "yanAPopular"), items: pick(food.filter((i) => i.photo)) };
  const words = s.split(/\s+/).filter((w) => w.length > 2);
  const hits = items.filter((i) => words.some((w) => Object.values(i.name).some((n) => n?.toLowerCase().includes(w)) || Object.values(i.description ?? {}).some((d) => d?.toLowerCase().includes(w))));
  return hits.length ? { text: ui(lang, "yanAFound"), items: pick(hits) } : { text: ui(lang, "yanANone") };
}

export function YanSheet({
  open,
  onClose,
  menu,
  lang,
  onOpen,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  menu: Menu;
  lang: Lang;
  onOpen: (it: MenuItem) => void;
  onAdd: (it: MenuItem) => void;
}) {
  const items = useMemo(() => allItems(menu), [menu]);
  const roleOf = useMemo(() => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c.role] as const))), [menu]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const { currency } = menu.venue;

  useEffect(() => {
    // Braces matter: scroll methods return a Promise in new Chromium, which React would treat as a cleanup.
    if (msgs.length) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    haptic("light");
    setText("");
    const a = answer(q, lang, items, roleOf, currency);
    // The answer bubble arrives blurred ("thinking"), then pulls into focus.
    setMsgs((m) => [...m, { from: "guest", text: q }, { from: "yan", ...a, pending: true }]);
    setTimeout(() => setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, pending: false } : x))), 900);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "yan")}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ui(lang, "yanPlaceholder")}
            aria-label={ui(lang, "yanPlaceholder")}
            className="h-12 min-w-0 flex-1 rounded-full bg-g-fill px-5 text-[16px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30"
          />
          <button type="submit" aria-label="Send" disabled={!text.trim()} className="blue-grad press grid size-12 shrink-0 place-items-center rounded-full disabled:opacity-40">
            <ArrowUp size={20} strokeWidth={2.25} />
          </button>
        </form>
      }
    >
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-center gap-3.5">
          <YanOrb size={52} />
          <div>
            <h2 className="text-[24px] leading-tight font-bold tracking-[-0.02em]">Yan</h2>
            <p className="text-[14px] text-g-muted">{ui(lang, "yanRole")}</p>
          </div>
        </div>
        <p className="mt-6 max-w-[88%] rounded-[22px] rounded-tl-[8px] bg-g-fill px-4 py-3 text-[15px] leading-snug">{ui(lang, "yanHello")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUESTIONS.map((k) => (
            <button key={k} onClick={() => ask(ui(lang, k))} className="press h-10 rounded-full border border-g-line px-4 text-[14px] font-medium">
              {ui(lang, k)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3">
          {msgs.map((m, i) =>
            m.from === "guest" ? (
              <p key={i} className="animate-rise ml-auto max-w-[80%] rounded-[22px] rounded-tr-[8px] bg-g-ink px-4 py-3 text-[15px] leading-snug text-white">
                {m.text}
              </p>
            ) : (
              <div key={i} data-loading={m.pending ? "true" : undefined} className="animate-rise max-w-[94%]" aria-busy={m.pending}>
                {m.pending && <p className="mb-1.5 text-[12px] font-medium text-g-blue">{ui(lang, "yanThinking")}…</p>}
                <div className="rounded-[22px] rounded-tl-[8px] bg-g-fill p-3">
                  <p className="live px-1 pb-1 text-[15px] leading-snug">{m.text}</p>
                  {m.items?.map((it) => (
                    <div key={it.id} className="mt-2 flex items-center gap-3 rounded-[16px] bg-white p-2">
                      <button onClick={() => onOpen(it)} className="live shrink-0">
                        <DishTile item={it} role={roleOf.get(it.id) ?? "main"} photoScale={0.9} glyph={0.5} className="size-14 rounded-[12px]" />
                      </button>
                      <button onClick={() => onOpen(it)} className="min-w-0 flex-1 text-left">
                        <span className="live block truncate text-[15px] font-semibold">{t(it.name, lang)}</span>
                        <span className="live block text-[13px] text-g-muted tabular-nums">{formatMoney(it.price, currency, lang)}</span>
                      </button>
                      <button
                        aria-label={`${ui(lang, "add")} ${t(it.name, lang)}`}
                        onClick={() => {
                          haptic("success");
                          onAdd(it);
                        }}
                        className="blue-grad press grid size-9 shrink-0 place-items-center rounded-full"
                      >
                        <Plus size={18} strokeWidth={2.25} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
          <div ref={end} />
        </div>
        <p className="mt-6 text-center text-[12px] text-g-faint">{ui(lang, "yanNote")}</p>
      </div>
    </Sheet>
  );
}
