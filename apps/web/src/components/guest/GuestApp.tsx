"use client";

import { addLine, allItems, cartCount, cartTotal, formatMoney, setQty, t, unitPrice, type CartLine, type Category, type Lang, type Menu, type MenuItem } from "@yanyin/domain";
import { BellRing, Check, ChefHat, Dices, Flame, Plus, ReceiptText, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import { venueBrand, type VenueBrand } from "@/lib/visual";
import { RouletteSheet } from "./RouletteSheet";
import { AboutSheet, CartSheet, ItemSheet, LangSheet, OrdersSheet, SearchSheet, orderStage, type PlacedOrder } from "./sheets";
import { Chip, DishTile, ItemCard, RoundButton, describe } from "./ui";

function initialLang(): Lang {
  const code = navigator.language.slice(0, 2);
  return (UI_LANGS as readonly string[]).includes(code) ? (code as Lang) : "en";
}

type SheetName = "cart" | "orders" | "search" | "about" | "lang" | "roulette" | null;

/**
 * yanyin.menu — the guest app opened from a table QR code. One scrolling menu
 * (Yandex Eda pattern) with sheets for the dish, the order, search and more.
 */
export function GuestApp({ menu }: { menu: Menu }) {
  const brand = venueBrand(menu.venue);
  const { currency } = menu.venue;
  const items = useMemo(() => allItems(menu), [menu]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const categoryOf = useMemo(() => new Map<string, Category>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c] as const))), [menu]);

  const [lang, setLang] = useState<Lang>("en");
  const [table, setTable] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [now, setNow] = useState(0);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [active, setActive] = useState(menu.categories[0]!.id);
  const [age, setAge] = useState<"unknown" | "ok" | "blocked">(brand.ageRestricted ? "unknown" : "ok");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Browser-only values are read after hydration so the server render stays static.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser-only APIs */
    setLang(initialLang());
    setTable(new URLSearchParams(window.location.search).get("table"));
    try {
      if (sessionStorage.getItem(`age:${menu.venue.slug}`) === "ok") setAge("ok");
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [menu.venue.slug]);

  useEffect(() => {
    if (!orders.length) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [orders.length]);

  // Highlight the tab of the section in view and keep it visible in the tab bar.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.slice(4));
      },
      { rootMargin: "-120px 0px -65% 0px" },
    );
    menu.categories.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [menu]);
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (bar && tab) bar.scrollTo({ left: tab.offsetLeft - 20, behavior: "smooth" });
  }, [active]);

  const flash = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast((cur) => (cur === text ? null : cur)), 2000);
  }, []);
  const say = (key: UiKey) => flash(ui(lang, key));

  const addToCart = (it: MenuItem, variantId: string | undefined, optionIds: string[], qty: number) => {
    setLines((prev) => addLine(prev, { itemId: it.id, variantId, optionIds, qty, unitPrice: unitPrice(it, variantId, optionIds) }));
  };
  const qtyOf = (id: string) => lines.find((l) => l.key === `${id}||`)?.qty ?? 0;
  const quickAdd = (it: MenuItem) => {
    if (it.variants.length || it.modifierGroups.some((g) => g.required)) setItem(it);
    else addToCart(it, undefined, [], 1);
  };
  const setPlainQty = (it: MenuItem, q: number) => setLines((prev) => setQty(prev, `${it.id}||`, q));

  const count = cartCount(lines);
  const total = cartTotal(lines);
  const live = orders.length > 0 && orderStage(orders[orders.length - 1]!, now) < 3;
  const hasCoals = menu.categories.some((c) => c.serviceCalls.some((s) => s.id === "change_coals"));

  const scrollTo = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
  };

  return (
    <div className="min-h-dvh bg-g-bg text-g-ink">
      <div className="mx-auto max-w-[480px] pb-32">
        {/* Header */}
        <header className="flex items-center gap-3.5 px-5 pt-[max(18px,env(safe-area-inset-top))]">
          <button onClick={() => setSheet("about")} className="press flex min-w-0 flex-1 items-center gap-3.5 text-left">
            <span className="ink-grad grid size-[52px] shrink-0 place-items-center rounded-[18px] text-[20px] font-bold shadow-[0_10px_22px_-12px_rgba(11,11,15,0.6)]">{brand.mark}</span>
            <span className="min-w-0">
              <span className="block truncate text-[20px] leading-tight font-bold tracking-[-0.02em]">{menu.venue.name}</span>
              <span className="mt-1 flex min-w-0 items-center gap-2">
                {table && <Chip tone="blue">{`${ui(lang, "table")} ${table.padStart(2, "0")}`}</Chip>}
                <span className="truncate text-[13px] text-g-muted">{brand.cuisine[lang as "en"] ?? brand.cuisine.en}</span>
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {orders.length > 0 && (
              <RoundButton label={ui(lang, "orders")} onClick={() => setSheet("orders")} dot={live}>
                <ReceiptText size={19} strokeWidth={1.75} />
              </RoundButton>
            )}
            <RoundButton label={ui(lang, "language")} onClick={() => setSheet("lang")}>
              <span className="text-[13px] font-bold uppercase">{lang}</span>
            </RoundButton>
            <RoundButton label={ui(lang, "search")} onClick={() => setSheet("search")}>
              <Search size={19} strokeWidth={1.75} />
            </RoundButton>
          </div>
        </header>

        {/* Hero */}
        <Hero
          brand={brand}
          lang={lang}
          currency={currency}
          itemById={itemById}
          categoryOf={categoryOf}
          onOpen={setItem}
          onAdd={(it) => {
            quickAdd(it);
            if (!it.variants.length && !it.modifierGroups.some((g) => g.required)) say("added");
          }}
          onRoulette={() => setSheet("roulette")}
        />

        {/* Quick actions */}
        <div className="mt-4 grid grid-cols-3 gap-3 px-5">
          <QuickAction icon={<BellRing size={20} strokeWidth={1.75} />} label={ui(lang, "callStaff")} onClick={() => say("waiterCalled")} />
          {hasCoals ? (
            <QuickAction icon={<Flame size={20} strokeWidth={1.75} />} label={ui(lang, "changeCoals")} onClick={() => say("coalsCalled")} />
          ) : (
            <QuickAction icon={<ReceiptText size={20} strokeWidth={1.75} />} label={ui(lang, "askBill")} onClick={() => say("billAsked")} />
          )}
          <QuickAction icon={<Dices size={20} strokeWidth={1.75} />} label={ui(lang, "quickRoulette")} onClick={() => setSheet("roulette")} accent />
        </div>

        {/* Category tabs */}
        <nav aria-label={ui(lang, "categories")} className="sticky top-0 z-30 mt-8 bg-g-bg/90 backdrop-blur-xl">
          <div ref={tabsRef} className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth px-5 py-2.5">
            {menu.categories.map((c) => {
              const on = c.id === active;
              return (
                <button
                  key={c.id}
                  data-tab={c.id}
                  onClick={() => scrollTo(c.id)}
                  aria-current={on ? "true" : undefined}
                  className={`press h-9 shrink-0 rounded-full px-4 text-[14px] font-medium whitespace-nowrap transition-colors duration-200 ${on ? "bg-g-ink text-white shadow-[0_8px_18px_-10px_rgba(11,11,15,0.6)]" : "text-g-muted"}`}
                >
                  {t(c.name, lang)}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Menu */}
        <main className="px-5">
          {menu.categories.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="pt-8">
              <h2 className="mb-4 flex items-baseline gap-2 px-1 text-[24px] leading-tight font-bold tracking-[-0.025em]">
                {t(c.name, lang)}
                <span className="text-[15px] font-medium tracking-normal text-g-faint">{c.items.length}</span>
              </h2>
              <div className="grid gap-3">
                {c.items.map((it) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    role={c.role}
                    lang={lang}
                    currency={currency}
                    qty={qtyOf(it.id)}
                    onOpen={() => setItem(it)}
                    onAdd={() => quickAdd(it)}
                    onQty={(q) => setPlainQty(it, q)}
                  />
                ))}
              </div>
            </section>
          ))}
          <p className="pt-12 text-center text-[13px] text-g-faint">
            {ui(lang, "serviceNote")}
            <br />
            {ui(lang, "poweredBy")}
          </p>
        </main>
      </div>

      {/* Floating cart */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setSheet("cart")}
            className="animate-rise press mx-auto flex h-[60px] w-full max-w-[440px] items-center gap-3 rounded-full bg-g-ink pr-6 pl-2 text-white shadow-[0_16px_40px_-14px_rgba(11,11,15,0.55)]"
          >
            <span className="blue-grad grid size-11 place-items-center rounded-full text-[15px] font-bold tabular-nums">{count}</span>
            <span className="flex-1 text-left text-[16px] font-semibold">{ui(lang, "yourOrder")}</span>
            <span className="text-[16px] font-semibold tabular-nums">{formatMoney(total, currency, lang)}</span>
          </button>
        </div>
      )}

      {toast && (
        <div role="status" className={`animate-pop fixed inset-x-0 z-[80] mx-auto ${count > 0 ? "bottom-[calc(max(16px,env(safe-area-inset-bottom))+72px)]" : "bottom-[max(20px,env(safe-area-inset-bottom))]"} flex w-fit max-w-[90vw] items-center gap-2 rounded-full bg-g-ink px-4 py-3 text-[14px] font-medium text-white shadow-xl`}>
          <span className="blue-grad grid size-5 place-items-center rounded-full">
            <Check size={12} strokeWidth={3} />
          </span>
          {toast}
        </div>
      )}

      <ItemSheet
        item={item}
        category={item ? categoryOf.get(item.id) ?? null : null}
        lang={lang}
        currency={currency}
        onClose={() => setItem(null)}
        onAdd={(it, v, o, q) => {
          addToCart(it, v, o, q);
          setItem(null);
          say("added");
        }}
      />
      <CartSheet
        open={sheet === "cart"}
        onClose={() => setSheet(null)}
        lang={lang}
        currency={currency}
        lines={lines}
        itemById={itemById}
        categoryOf={categoryOf}
        onQty={(key, q) => setLines((prev) => setQty(prev, key, q))}
        onSend={(note) => {
          setOrders((o) => [...o, { id: o.length + 1, lines, total, note, placedAt: Date.now() }]);
          setNow(Date.now());
          setLines([]);
          setSheet("orders");
        }}
      />
      <OrdersSheet open={sheet === "orders"} onClose={() => setSheet(null)} lang={lang} currency={currency} orders={orders} now={now} itemById={itemById} onOrderMore={() => setSheet(null)} />
      <SearchSheet
        open={sheet === "search"}
        onClose={() => setSheet(null)}
        menu={menu}
        lang={lang}
        qtyOf={qtyOf}
        onOpen={(it) => setItem(it)}
        onAdd={quickAdd}
        onQty={setPlainQty}
      />
      <AboutSheet open={sheet === "about"} onClose={() => setSheet(null)} menu={menu} brand={brand} lang={lang} />
      <LangSheet
        open={sheet === "lang"}
        onClose={() => setSheet(null)}
        lang={lang}
        onPick={(l) => {
          setLang(l);
          setSheet(null);
        }}
      />
      <RouletteSheet
        open={sheet === "roulette"}
        onClose={() => setSheet(null)}
        menu={menu}
        lang={lang}
        onAddAll={(picked, guests) => {
          setLines((prev) => picked.reduce((acc, it) => addLine(acc, { itemId: it.id, optionIds: [], qty: guests, unitPrice: it.price }), prev));
          setSheet(null);
          say("added");
        }}
      />

      {age !== "ok" && (
        <div className="animate-fade fixed inset-0 z-[90] flex flex-col bg-g-bg px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="ink-grad grid size-16 place-items-center rounded-[22px] text-[26px] font-bold">{brand.mark}</span>
            <p className="mt-8 text-[72px] leading-none font-bold tracking-[-0.04em]">18+</p>
            {age === "blocked" ? (
              <p className="mt-4 max-w-[280px] text-[17px] text-g-muted">{ui(lang, "ageBlocked")}</p>
            ) : (
              <>
                <h2 className="mt-4 text-[24px] font-bold tracking-[-0.02em]">{ui(lang, "ageTitle")}</h2>
                <p className="mt-2 max-w-[280px] text-[16px] text-g-muted">{ui(lang, "ageBody")}</p>
              </>
            )}
          </div>
          {age !== "blocked" && (
            <div className="mx-auto grid w-full max-w-[440px] gap-2.5">
              <button
                onClick={() => {
                  setAge("ok");
                  try {
                    sessionStorage.setItem(`age:${menu.venue.slug}`, "ok");
                  } catch {}
                }}
                className="blue-grad press h-14 rounded-full text-[16px] font-semibold"
              >
                {ui(lang, "ageYes")}
              </button>
              <button onClick={() => setAge("blocked")} className="card press h-14 rounded-full text-[16px] font-semibold">
                {ui(lang, "ageNo")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`press flex h-[104px] flex-col justify-between rounded-[24px] p-3.5 text-left ${accent ? "blue-grad" : "card"}`}>
      <span className={`grid size-10 place-items-center rounded-full ${accent ? "bg-white/20 text-white" : "chip-blue"}`}>{icon}</span>
      <span className={`text-[13px] leading-[1.25] font-semibold ${accent ? "text-white" : "text-g-ink"}`}>{label}</span>
    </button>
  );
}

function Hero({
  brand,
  lang,
  currency,
  itemById,
  categoryOf,
  onOpen,
  onAdd,
  onRoulette,
}: {
  brand: VenueBrand;
  lang: Lang;
  currency: Menu["venue"]["currency"];
  itemById: Map<string, MenuItem>;
  categoryOf: Map<string, Category>;
  onOpen: (it: MenuItem) => void;
  onAdd: (it: MenuItem) => void;
  onRoulette: () => void;
}) {
  const slides = brand.hero.filter((s) => s.kind === "roulette" || itemById.get(s.itemId)?.photo);
  const [index, setIndex] = useState(0);
  const reelItems = (() => {
    const photos = [...itemById.values()].filter((i) => i.photo);
    if (photos.length >= 3) return photos.slice(0, 3);
    const seen = new Set<string>();
    return [...itemById.values()].filter((i) => {
      const role = categoryOf.get(i.id)?.role ?? "main";
      return !seen.has(role) && !!seen.add(role);
    }).slice(0, 3);
  })();
  return (
    <div className="mt-5">
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {slides.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-start px-5">
            {s.kind === "roulette" ? (
              <div className="card-float overflow-hidden rounded-[32px]">
                <button onClick={onRoulette} className="blue-grad relative block h-[200px] w-full overflow-hidden">
                  <span aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_0%,rgba(255,255,255,0.35),transparent_70%)]" />
                  <span className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 justify-center gap-2.5">
                    {[0, 1, 2].map((k) => {
                      const it = reelItems[k];
                      return (
                        <span key={k} className="grid h-[112px] w-[88px] place-items-center rounded-[20px] bg-white/95 shadow-[inset_0_-6px_12px_rgba(47,91,255,0.12),0_12px_24px_-12px_rgba(0,0,0,0.35)]">
                          {it ? <DishTile item={it} role={categoryOf.get(it.id)?.role ?? "main"} photoScale={0.9} glyph={0.62} className="size-full rounded-[20px] !bg-none" /> : <Dices size={28} strokeWidth={1.75} className="text-g-blue" />}
                        </span>
                      );
                    })}
                  </span>
                </button>
                <div className="p-5">
                  <Chip tone="blue" icon={<Dices size={12} strokeWidth={2.25} />}>
                    {ui(lang, "roulette")}
                  </Chip>
                  <h3 className="mt-2.5 text-[24px] leading-[1.15] font-bold tracking-[-0.02em]">{ui(lang, "rouletteTitle")}</h3>
                  <p className="mt-1.5 text-[14px] leading-snug text-g-muted">{ui(lang, "rouletteHint")}</p>
                  <button onClick={onRoulette} className="blue-grad press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
                    <Dices size={18} strokeWidth={2} /> {ui(lang, "rouletteCta")}
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const it = itemById.get(s.itemId)!;
                const role = categoryOf.get(it.id)?.role ?? "main";
                return (
                  <div className="card-float overflow-hidden rounded-[32px]">
                    <button onClick={() => onOpen(it)} className="block w-full" aria-label={t(it.name, lang)}>
                      <DishTile item={it} role={role} photoScale={0.84} className="h-[200px] w-full" />
                    </button>
                    <div className="p-5">
                      <Chip tone="orange" icon={<ChefHat size={12} strokeWidth={2.25} />}>
                        {s.kicker[lang as "en"] ?? s.kicker.en}
                      </Chip>
                      <h3 className="mt-2.5 text-[24px] leading-[1.15] font-bold tracking-[-0.02em]">{t(it.name, lang)}</h3>
                      <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug text-g-muted">{describe(it, lang)}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[22px] font-bold tracking-[-0.02em] tabular-nums">{formatMoney(it.price, currency, lang)}</span>
                        <button onClick={() => onAdd(it)} className="blue-grad press flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold">
                          <Plus size={18} strokeWidth={2.25} /> {ui(lang, "add")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-3.5 flex justify-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "bar-grad w-5" : "w-1.5 bg-g-fill-2"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
