"use client";

import { addLine, allItems, cartCount, cartTotal, formatMoney, setQty, t, unitPrice, type CartLine, type Category, type Lang, type Menu, type MenuItem } from "@yanyin/domain";
import { BellRing, Check, Dices, Flame, Martini, Plus, ReceiptText, Search, Soup, Wine } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import { venueBrand, type VenueBrand } from "@/lib/visual";
import { RouletteSheet } from "./RouletteSheet";
import { AboutSheet, CartSheet, ItemSheet, LangSheet, OrdersSheet, SearchSheet, orderStage, type PlacedOrder } from "./sheets";
import { IconButton, ItemRow, ProductCard } from "./ui";

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
        <header className="flex items-center gap-3 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-2">
          <button onClick={() => setSheet("about")} className="press flex min-w-0 items-center gap-3 text-left">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-g-ink text-[17px] font-bold text-white">{brand.mark}</span>
            <span className="min-w-0">
              <span className="block truncate text-[17px] leading-tight font-semibold">{menu.venue.name}</span>
              <span className="block truncate text-[13px] text-g-muted">
                {table ? `${ui(lang, "table")} ${table} · ` : ""}
                {brand.cuisine[lang as "en"] ?? brand.cuisine.en}
              </span>
            </span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {orders.length > 0 && (
              <IconButton label={ui(lang, "orders")} onClick={() => setSheet("orders")} dot={live}>
                <ReceiptText size={19} strokeWidth={1.75} />
              </IconButton>
            )}
            <button onClick={() => setSheet("lang")} aria-label={ui(lang, "language")} className="press h-10 rounded-full bg-g-fill px-3.5 text-[13px] font-semibold uppercase">
              {lang}
            </button>
            <IconButton label={ui(lang, "search")} onClick={() => setSheet("search")}>
              <Search size={19} strokeWidth={1.75} />
            </IconButton>
          </div>
        </header>

        {/* Hero */}
        <Hero brand={brand} lang={lang} currency={currency} itemById={itemById} onOpen={setItem} onRoulette={() => setSheet("roulette")} />

        {/* Quick actions */}
        <div className="mt-3 grid grid-cols-3 gap-2.5 px-5">
          <QuickAction icon={<BellRing size={22} strokeWidth={1.75} />} label={ui(lang, "callStaff")} onClick={() => say("waiterCalled")} />
          {hasCoals ? (
            <QuickAction icon={<Flame size={22} strokeWidth={1.75} />} label={ui(lang, "changeCoals")} onClick={() => say("coalsCalled")} />
          ) : (
            <QuickAction icon={<ReceiptText size={22} strokeWidth={1.75} />} label={ui(lang, "askBill")} onClick={() => say("billAsked")} />
          )}
          <QuickAction icon={<Dices size={22} strokeWidth={1.75} />} label={ui(lang, "quickRoulette")} onClick={() => setSheet("roulette")} accent />
        </div>

        {/* Category tabs */}
        <nav aria-label={ui(lang, "categories")} className="sticky top-0 z-30 mt-7 bg-white/92 backdrop-blur-xl">
          <div ref={tabsRef} className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth px-5 py-2.5">
            {menu.categories.map((c) => {
              const on = c.id === active;
              return (
                <button
                  key={c.id}
                  data-tab={c.id}
                  onClick={() => scrollTo(c.id)}
                  aria-current={on ? "true" : undefined}
                  className={`press h-9 shrink-0 rounded-full px-4 text-[14px] font-medium whitespace-nowrap transition-colors duration-200 ${on ? "bg-g-ink text-white" : "text-g-muted"}`}
                >
                  {t(c.name, lang)}
                </button>
              );
            })}
          </div>
          <div className="h-px bg-g-line" />
        </nav>

        {/* Menu */}
        <main className="px-5">
          {menu.categories.map((c) => {
            const photos = c.items.filter((i) => i.photo);
            const rest = c.items.filter((i) => !i.photo);
            const props = (it: MenuItem) => ({
              item: it,
              role: c.role,
              lang,
              currency,
              qty: qtyOf(it.id),
              onOpen: () => setItem(it),
              onAdd: () => quickAdd(it),
              onQty: (q: number) => setPlainQty(it, q),
            });
            return (
              <section key={c.id} id={`cat-${c.id}`} className="pt-9">
                <h2 className="mb-4 flex items-baseline gap-2 text-[24px] leading-tight font-bold tracking-[-0.025em]">
                  {t(c.name, lang)}
                  <span className="text-[15px] font-medium tracking-normal text-g-faint">{c.items.length}</span>
                </h2>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-7">
                    {photos.map((it) => (
                      <ProductCard key={it.id} {...props(it)} />
                    ))}
                  </div>
                )}
                {rest.length > 0 && (
                  <div className={photos.length ? "mt-4" : ""}>
                    {rest.map((it) => (
                      <ItemRow key={it.id} {...props(it)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
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
            <span className="grid size-11 place-items-center rounded-full bg-g-blue text-[15px] font-bold tabular-nums">{count}</span>
            <span className="flex-1 text-left text-[16px] font-semibold">{ui(lang, "yourOrder")}</span>
            <span className="text-[16px] font-semibold tabular-nums">{formatMoney(total, currency, lang)}</span>
          </button>
        </div>
      )}

      {toast && (
        <div role="status" className={`animate-pop fixed inset-x-0 z-[80] mx-auto ${count > 0 ? "bottom-[calc(max(16px,env(safe-area-inset-bottom))+72px)]" : "bottom-[max(20px,env(safe-area-inset-bottom))]"} flex w-fit max-w-[90vw] items-center gap-2 rounded-full bg-g-ink px-4 py-3 text-[14px] font-medium text-white shadow-xl`}>
          <span className="grid size-5 place-items-center rounded-full bg-g-blue">
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
        <div className="animate-fade fixed inset-0 z-[90] flex flex-col bg-white px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="grid size-16 place-items-center rounded-full bg-g-ink text-[26px] font-bold text-white">{brand.mark}</span>
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
                className="press h-14 rounded-full bg-g-blue text-[16px] font-semibold text-white"
              >
                {ui(lang, "ageYes")}
              </button>
              <button onClick={() => setAge("blocked")} className="press h-14 rounded-full bg-g-fill text-[16px] font-semibold">
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
    <button onClick={onClick} className={`press flex h-[92px] flex-col justify-between rounded-[22px] p-3.5 text-left ${accent ? "bg-g-blue-soft text-g-blue" : "bg-g-fill"}`}>
      {icon}
      <span className={`text-[13px] leading-[1.25] font-medium ${accent ? "text-g-blue" : "text-g-ink"}`}>{label}</span>
    </button>
  );
}

function Hero({
  brand,
  lang,
  currency,
  itemById,
  onOpen,
  onRoulette,
}: {
  brand: VenueBrand;
  lang: Lang;
  currency: Menu["venue"]["currency"];
  itemById: Map<string, MenuItem>;
  onOpen: (it: MenuItem) => void;
  onRoulette: () => void;
}) {
  const slides = brand.hero.filter((s) => s.kind === "roulette" || itemById.get(s.itemId)?.photo);
  const single = slides.length === 1;
  return (
    <div className={`no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 ${single ? "" : "scroll-px-5"}`}>
      {slides.map((s, i) => {
        const width = single ? "w-full" : "w-[86%]";
        if (s.kind === "roulette") {
          return (
            <button key={i} onClick={onRoulette} className={`press relative h-[204px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-g-ink p-5 text-left text-white ${width}`}>
              <div aria-hidden className="absolute top-5 right-5 flex gap-1.5">
                {[Soup, Wine, Martini].map((Icon, k) => (
                  <span key={k} className="grid h-14 w-11 place-items-center rounded-2xl bg-white/10 text-white/80">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                ))}
              </div>
              <span className="absolute inset-x-5 bottom-5 block">
                <span className="block text-[13px] font-medium text-white/60">{ui(lang, "roulette")}</span>
                <span className="mt-1 block max-w-[78%] text-[22px] leading-[1.15] font-bold tracking-[-0.02em]">{ui(lang, "rouletteTitle")}</span>
                <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-g-blue px-4 text-[14px] font-semibold">
                  <Dices size={17} strokeWidth={2} /> {ui(lang, "rouletteCta")}
                </span>
              </span>
            </button>
          );
        }
        const it = itemById.get(s.itemId)!;
        return (
          <button key={i} onClick={() => onOpen(it)} className={`press relative h-[204px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-g-fill text-left ${width}`}>
            <Image src={it.photo!} alt="" width={420} height={280} priority={i === 0} className="dish-shadow absolute top-1/2 -right-[14%] w-[68%] -translate-y-[46%] object-contain" />
            <span className="absolute inset-y-5 left-5 flex w-[48%] flex-col">
              <span className="text-[13px] font-medium text-g-muted">{s.kicker[lang as "en"] ?? s.kicker.en}</span>
              <span className="mt-1 text-[22px] leading-[1.15] font-bold tracking-[-0.02em]">{t(it.name, lang)}</span>
              <span className="mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white pr-1.5 pl-4 text-[15px] font-semibold tabular-nums shadow-[0_2px_10px_-4px_rgba(11,11,15,0.2)]">
                {formatMoney(it.price, currency, lang)}
                <span className="grid size-7 place-items-center rounded-full bg-g-blue text-white">
                  <Plus size={16} strokeWidth={2.25} />
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
