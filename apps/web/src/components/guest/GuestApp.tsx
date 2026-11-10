"use client";

import {
  addLine,
  allItems,
  cartCount,
  cartTotal,
  defaultOptionIds,
  formatMoney,
  setQty,
  t,
  unitPrice,
  type CartLine,
  type Category,
  type Lang,
  type Menu,
  type MenuItem,
} from "@yanyin/domain";
import {
  BellRing,
  Check,
  ChefHat,
  Dices,
  Flame,
  Plus,
  ReceiptText,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import { venueBrand, type VenueBrand } from "@/lib/visual";
import { RouletteSheet } from "./RouletteSheet";
import {
  AboutSheet,
  CartSheet,
  ItemSheet,
  LangSheet,
  OrdersSheet,
  SearchSheet,
  orderStage,
  type PlacedOrder,
} from "./sheets";
import Image from "next/image";
import { haptic } from "@/lib/haptics";
import { Island, Reveal, RouletteWheel, startLoading, type IslandNotice } from "./motion";
import { ActionCircle, ItemCard } from "./ui";
import { YanOrb, YanSheet } from "./YanSheet";

function initialLang(): Lang {
  const code = navigator.language.slice(0, 2);
  return (UI_LANGS as readonly string[]).includes(code) ? (code as Lang) : "en";
}

type SheetName =
  | "cart"
  | "orders"
  | "search"
  | "about"
  | "lang"
  | "roulette"
  | "yan"
  | null;

type Notice = IslandNotice;

/**
 * yanyin.menu — the guest app opened from a table QR code. One scrolling menu
 * (Yandex Eda pattern) with sheets for the dish, the order, search and more.
 */
export function GuestApp({ menu }: { menu: Menu }) {
  const brand = venueBrand(menu.venue);
  const { currency } = menu.venue;
  const items = useMemo(() => allItems(menu), [menu]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const categoryOf = useMemo(
    () =>
      new Map<string, Category>(
        menu.categories.flatMap((c) => c.items.map((i) => [i.id, c] as const)),
      ),
    [menu],
  );

  const [lang, setLang] = useState<Lang>("en");
  const [table, setTable] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [now, setNow] = useState(0);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [active, setActive] = useState(menu.categories[0]!.id);
  const [age, setAge] = useState<"unknown" | "ok" | "blocked">(
    brand.ageRestricted ? "unknown" : "ok",
  );
  const tabsRef = useRef<HTMLDivElement>(null);

  // Browser-only values are read after hydration so the server render stays static.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser-only APIs */
    setLang(initialLang());
    setTable(new URLSearchParams(window.location.search).get("table"));
    try {
      if (sessionStorage.getItem(`age:${menu.venue.slug}`) === "ok")
        setAge("ok");
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
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
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
    if (bar && tab)
      bar.scrollTo({ left: tab.offsetLeft - 20, behavior: "smooth" });
  }, [active]);

  const flash = useCallback((n: Notice) => {
    haptic("success");
    setNotice(n);
    setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), 2600);
  }, []);
  /** Every action answers with a notification: a title and what happens next. */
  const say = (key: UiKey, icon: React.ReactNode = <BellRing size={16} strokeWidth={2.25} />) =>
    flash({
      title: ui(lang, key),
      text: ui(lang, `${key}Hint` as UiKey),
      icon,
      tone: key === "added" || key === "orderSent" ? "green" : key === "coalsCalled" ? "orange" : "blue",
    });

  const addToCart = (
    it: MenuItem,
    variantId: string | undefined,
    optionIds: string[],
    qty: number,
  ) => {
    setLines((prev) =>
      addLine(prev, {
        itemId: it.id,
        variantId,
        optionIds,
        qty,
        unitPrice: unitPrice(it, variantId, optionIds),
      }),
    );
  };
  const qtyOf = (id: string) =>
    lines.find((l) => l.key === `${id}||`)?.qty ?? 0;
  const quickAdd = (it: MenuItem) => {
    if (it.variants.length || it.modifierGroups.some((g) => g.required))
      setItem(it);
    else addToCart(it, undefined, [], 1);
  };
  const setPlainQty = (it: MenuItem, q: number) =>
    setLines((prev) => setQty(prev, `${it.id}||`, q));

  const count = cartCount(lines);
  const total = cartTotal(lines);
  const live =
    orders.length > 0 && orderStage(orders[orders.length - 1]!, now) < 3;
  const hasCoals = menu.categories.some((c) =>
    c.serviceCalls.some((s) => s.id === "change_coals"),
  );

  const scrollTo = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 64,
        behavior: "smooth",
      });
  };

  return (
    <div className="min-h-dvh bg-g-bg text-g-ink">
      <div className="mx-auto max-w-[480px] pb-32">
        {/* Header: venue on the left, one grouped control pill on the right */}
        <header className="flex items-center gap-3 px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <button
            onClick={() => setSheet("about")}
            className="press flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="ink-grad grid size-[52px] shrink-0 place-items-center rounded-[18px] text-[20px] font-bold">
              {brand.mark}
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5 text-[13px]">
                {table && (
                  <>
                    <span className="size-1.5 shrink-0 rounded-full bg-g-blue" />
                    <span className="shrink-0 font-semibold text-g-blue">
                      {`${ui(lang, "table")} ${table.padStart(2, "0")}`}
                    </span>
                    <span className="text-g-faint">·</span>
                  </>
                )}
                <span className="truncate text-g-muted">
                  {brand.cuisine[lang as "en"] ?? brand.cuisine.en}
                </span>
              </span>
              <span className="block truncate text-[22px] leading-tight font-bold tracking-[-0.02em]">
                {menu.venue.name}
              </span>
            </span>
          </button>
          <div className="flex h-11 shrink-0 items-center rounded-full bg-g-fill px-1">
            <button
              aria-label={ui(lang, "yanAsk")}
              onClick={() => {
                haptic("light");
                setSheet("yan");
              }}
              className="press grid size-9 place-items-center rounded-full"
            >
              <YanOrb size={30} />
            </button>
            {orders.length > 0 && (
              <button
                aria-label={ui(lang, "orders")}
                onClick={() => setSheet("orders")}
                className="press relative grid size-9 place-items-center rounded-full"
              >
                <ReceiptText size={19} strokeWidth={1.75} />
                {live && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-g-fill bg-g-blue" />
                )}
              </button>
            )}
            <button
              aria-label={ui(lang, "language")}
              onClick={() => setSheet("lang")}
              className="press grid h-9 min-w-9 place-items-center rounded-full px-1.5 text-[13px] font-bold uppercase"
            >
              {lang}
            </button>
            <span className="mx-0.5 h-5 w-px bg-g-fill-2" aria-hidden />
            <button
              aria-label={ui(lang, "search")}
              onClick={() => setSheet("search")}
              className="press grid size-9 place-items-center rounded-full"
            >
              <Search size={19} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Hero */}
        <Reveal key={`hero-${lang}`}>
          <Hero
            brand={brand}
            lang={lang}
            currency={currency}
            itemById={itemById}
            onOpen={setItem}
            onAdd={(it) => {
              quickAdd(it);
              if (
                !it.variants.length &&
                !it.modifierGroups.some((g) => g.required)
              )
                say("added", <Plus size={18} strokeWidth={2.25} />);
            }}
            onRoulette={() => setSheet("roulette")}
          />
        </Reveal>

        {/* Quick actions */}
        {/* Quick actions: one compact row of round buttons, the same as on the waiter's home. */}
        <div className="mt-5 flex justify-around px-3">
          <ActionCircle
            icon={<BellRing size={22} strokeWidth={1.9} />}
            label={ui(lang, "qaWaiter")}
            onClick={() => say("waiterCalled")}
          />
          {hasCoals && (
            <ActionCircle
              icon={<Flame size={22} strokeWidth={1.9} />}
              label={ui(lang, "qaCoalsDo")}
              onClick={() => say("coalsCalled", <Flame size={16} strokeWidth={2.25} />)}
            />
          )}
          <ActionCircle
            icon={<ReceiptText size={22} strokeWidth={1.9} />}
            label={ui(lang, "qaBill")}
            onClick={() => say("billAsked", <ReceiptText size={16} strokeWidth={2.25} />)}
          />
          <ActionCircle
            label={ui(lang, "qaRoulette")}
            onClick={() => setSheet("roulette")}
            art={<RouletteWheel size={46} bare />}
          />
        </div>

        {/* Category tabs */}
        <nav
          aria-label={ui(lang, "categories")}
          className="sticky top-0 z-30 mt-6 bg-white"
        >
          <div
            ref={tabsRef}
            className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth px-5 py-2.5"
          >
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
        </nav>

        {/* Menu */}
        <main className="px-5">
          {menu.categories.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="pt-8">
              <h2 className="mb-1 flex items-baseline gap-2 px-1 text-[24px] leading-tight font-bold tracking-[-0.025em]">
                {t(c.name, lang)}
                <span className="text-[15px] font-medium tracking-normal text-g-faint">
                  {c.items.length}
                </span>
              </h2>
              <div className="divide-y divide-g-line">
                {c.items.map((it, n) => (
                  <Reveal key={`${it.id}-${lang}`} delay={(n % 4) * 60}>
                    <ItemCard
                      item={it}
                      role={c.role}
                      lang={lang}
                      currency={currency}
                      qty={qtyOf(it.id)}
                      onOpen={() => setItem(it)}
                      onAdd={() => quickAdd(it)}
                      onQty={(q) => setPlainQty(it, q)}
                    />
                  </Reveal>
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
            className="animate-rise press mx-auto flex h-[60px] w-full max-w-[440px] items-center gap-3 rounded-full bg-g-ink pr-6 pl-2 text-white"
          >
            <span className="blue-grad grid size-11 place-items-center rounded-full text-[15px] font-bold tabular-nums">
              {count}
            </span>
            <span className="flex-1 text-left text-[16px] font-semibold">
              {ui(lang, "yourOrder")}
            </span>
            <span className="text-[16px] font-semibold tabular-nums">
              {formatMoney(total, currency, lang)}
            </span>
          </button>
        </div>
      )}

      <Island notice={notice} />

      <ItemSheet
        item={item}
        category={item ? (categoryOf.get(item.id) ?? null) : null}
        lang={lang}
        currency={currency}
        onClose={() => setItem(null)}
        onAdd={(it, v, o, q) => {
          addToCart(it, v, o, q);
          setItem(null);
          say("added", <Plus size={18} strokeWidth={2.25} />);
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
          setOrders((o) => [
            ...o,
            { id: o.length + 1, lines, total, note, placedAt: Date.now() },
          ]);
          setNow(Date.now());
          setLines([]);
          setSheet("orders");
          say("orderSent", <ChefHat size={18} strokeWidth={2} />);
        }}
      />
      <OrdersSheet
        open={sheet === "orders"}
        onClose={() => setSheet(null)}
        lang={lang}
        currency={currency}
        orders={orders}
        now={now}
        itemById={itemById}
        onOrderMore={() => setSheet(null)}
      />
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
      <AboutSheet
        open={sheet === "about"}
        onClose={() => setSheet(null)}
        menu={menu}
        brand={brand}
        lang={lang}
        onNotice={(title, text) =>
          flash({ title, text, icon: <Check size={18} strokeWidth={2.5} /> })
        }
      />
      <LangSheet
        open={sheet === "lang"}
        onClose={() => setSheet(null)}
        lang={lang}
        onPick={(l) => {
          setLang(l);
          setSheet(null);
          startLoading(); // new language = new data: blur and pull into focus
        }}
      />
      <YanSheet
        open={sheet === "yan"}
        onClose={() => setSheet(null)}
        menu={menu}
        lang={lang}
        onOpen={(it) => setItem(it)}
        onAdd={(it) => {
          quickAdd(it);
          if (!it.variants.length && !it.modifierGroups.some((g) => g.required))
            say("added", <Plus size={18} strokeWidth={2.25} />);
        }}
      />
      <RouletteSheet
        open={sheet === "roulette"}
        onClose={() => setSheet(null)}
        menu={menu}
        lang={lang}
        onAddAll={(picked, guests) => {
          setLines((prev) =>
            picked.reduce((acc, it) => {
              const opts = defaultOptionIds(it);
              return addLine(acc, {
                itemId: it.id,
                optionIds: opts,
                qty: guests,
                unitPrice: unitPrice(it, undefined, opts),
              });
            }, prev),
          );
          setSheet(null);
          say("added", <Plus size={18} strokeWidth={2.25} />);
        }}
      />

      {age !== "ok" && (
        <div className="animate-fade fixed inset-0 z-[90] flex flex-col bg-g-bg px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="ink-grad grid size-16 place-items-center rounded-[22px] text-[26px] font-bold">
              {brand.mark}
            </span>
            <p className="mt-8 text-[72px] leading-none font-bold tracking-[-0.04em]">
              18+
            </p>
            {age === "blocked" ? (
              <p className="mt-4 max-w-[280px] text-[17px] text-g-muted">
                {ui(lang, "ageBlocked")}
              </p>
            ) : (
              <>
                <h2 className="mt-4 text-[24px] font-bold tracking-[-0.02em]">
                  {ui(lang, "ageTitle")}
                </h2>
                <p className="mt-2 max-w-[280px] text-[16px] text-g-muted">
                  {ui(lang, "ageBody")}
                </p>
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
              <button
                onClick={() => setAge("blocked")}
                className="card press h-14 rounded-full text-[16px] font-semibold"
              >
                {ui(lang, "ageNo")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Label, name, description and the action row, all laid over the hero image. */
function HeroCaption({
  chip,
  icon,
  title,
  text,
  children,
}: {
  chip: string;
  icon: React.ReactNode;
  title: string;
  text?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-[#0b1636] via-[#0b1636]/70 to-transparent px-5 pt-24 pb-5">
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/15 px-2.5 text-[12px] font-semibold text-white backdrop-blur-md">
        {icon}
        {chip}
      </span>
      <span className="live mt-2.5 block text-[26px] leading-[1.1] font-bold tracking-[-0.02em] text-white">
        {title}
      </span>
      {text && (
        <span className="live mt-1.5 line-clamp-2 block text-[14px] leading-snug text-white/75">
          {text}
        </span>
      )}
      <span className="mt-4 flex h-12 items-center justify-between gap-3">
        {children}
      </span>
    </span>
  );
}

function Hero({
  brand,
  lang,
  currency,
  itemById,
  onOpen,
  onAdd,
  onRoulette,
}: {
  brand: VenueBrand;
  lang: Lang;
  currency: Menu["venue"]["currency"];
  itemById: Map<string, MenuItem>;
  onOpen: (it: MenuItem) => void;
  onAdd: (it: MenuItem) => void;
  onRoulette: () => void;
}) {
  const slides = brand.hero.filter(
    (s) => s.kind === "roulette" || itemById.has(s.itemId),
  );
  const [index, setIndex] = useState(0);
  return (
    <div className="mt-5">
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) =>
          setIndex(
            Math.round(
              e.currentTarget.scrollLeft / e.currentTarget.clientWidth,
            ),
          )
        }
      >
        {slides.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-start px-5">
            {s.kind === "roulette" ? (
              <div
                role="button"
                tabIndex={0}
                onClick={onRoulette}
                onKeyDown={(e) => e.key === "Enter" && onRoulette()}
                className="aurora block h-[372px] w-full cursor-pointer rounded-[30px] text-left"
                aria-label={ui(lang, "roulette")}
              >
                <span className="absolute -top-14 -right-20">
                  <RouletteWheel tone="dark" size={330} />
                </span>
                <HeroCaption
                  chip={ui(lang, "roulette")}
                  icon={<Dices size={12} strokeWidth={2.25} />}
                  title={ui(lang, "rouletteTitle")}
                  text={ui(lang, "rouletteHint")}
                >
                  <span className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[16px] font-semibold text-[#1d3fd6]">
                    <Dices size={18} strokeWidth={2} /> {ui(lang, "rouletteCta")}
                  </span>
                </HeroCaption>
              </div>
            ) : (
              (() => {
                const it = itemById.get(s.itemId)!;
                const builder = it.variants.length > 0 || it.modifierGroups.some((g) => g.required);
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(it)}
                    onKeyDown={(e) => e.key === "Enter" && onOpen(it)}
                    className="relative block h-[372px] w-full cursor-pointer overflow-hidden rounded-[30px] bg-[#0b1636] text-left text-white"
                    aria-label={t(it.name, lang)}
                  >
                    {/* Full-bleed photo, a soft scrim for the text, nothing else on top of the food. */}
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      sizes="(max-width: 480px) 100vw, 440px"
                      priority={i === 0}
                      className="live object-cover"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,22,54,0.4)_0%,rgba(11,22,54,0)_18%,rgba(11,22,54,0)_30%,rgba(11,22,54,0.72)_52%,rgba(11,22,54,0.94)_70%,#0b1636_100%)]"
                    />
                    <span className="absolute top-4 left-4 inline-flex h-7 items-center gap-1.5 rounded-full bg-white/18 px-3 text-[12px] font-semibold backdrop-blur-md">
                      <ChefHat size={13} strokeWidth={2.25} />
                      {s.kicker[lang as "en"] ?? s.kicker.en}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 block px-5 pb-5">
                      <span className="live block text-[24px] leading-[1.1] font-bold tracking-[-0.025em]">
                        {t(it.name, lang)}
                      </span>
                      <span className="live mt-1.5 line-clamp-2 text-[14px] leading-[1.4] text-white/80">
                        {s.blurb[lang as "en"] ?? s.blurb.en}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {s.facts.map((f) => (
                          <span
                            key={f.en}
                            className="inline-flex h-6 items-center rounded-full border border-white/25 px-2.5 text-[12px] font-medium text-white/90"
                          >
                            {f[lang as "en"] ?? f.en}
                          </span>
                        ))}
                      </span>
                      <span className="mt-3 flex h-12 items-center justify-between gap-3 border-t border-white/15 pt-3 box-content">
                        <span className="live text-[24px] font-semibold tracking-[-0.02em] tabular-nums">
                          {builder && it.variants.length === 0 && (
                            <span className="mr-1 text-[14px] font-medium text-white/70">
                              {ui(lang, "from")}
                            </span>
                          )}
                          {formatMoney(it.price, currency, lang)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            haptic(builder ? "light" : "success");
                            if (builder) onOpen(it);
                            else onAdd(it);
                          }}
                          className="press flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#1d3fd6]"
                        >
                          {!builder && <Plus size={18} strokeWidth={2.25} />}
                          {s.cta ? (s.cta[lang as "en"] ?? s.cta.en) : ui(lang, "add")}
                        </button>
                      </span>
                    </span>
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
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "bar-grad w-5" : "w-1.5 bg-g-fill-2"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
