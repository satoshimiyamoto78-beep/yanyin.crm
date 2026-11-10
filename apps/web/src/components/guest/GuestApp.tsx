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
  ChevronRight,
  Info,
  LayoutGrid,
  Wifi,
  UtensilsCrossed,
  Dices,
  Flame,
  Plus,
  ReceiptText,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import { venueBrand, type VenueBrand } from "@/lib/visual";
import { RouletteSheet } from "./RouletteSheet";
import {
  AboutSheet,
  BillSheet,
  CategoriesSheet,
  CartSheet,
  ItemSheet,
  LangSheet,
  OrdersSheet,
  SearchSheet,
  orderStage,
  WifiSheet,
  type PlacedOrder,
} from "./sheets";
import Image from "next/image";
import { haptic } from "@/lib/haptics";
import {
  Island,
  LiveIsland,
  Reveal,
  RouletteWheel,
  startLoading,
  ToTop,
  useRing,
  type IslandNotice,
} from "./motion";
import { ItemCard } from "./ui";
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
  | "bill"
  | "categories"
  | "wifi"
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
  const [dark, setDark] = useState(false);
  // The header sky only animates while it is on screen.
  const skyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = skyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("is-off", !e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The guest's choice is remembered on this phone; the menu applies it to the whole page.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved choice once on mount
      if (localStorage.getItem("yanyin:theme") === "dark") setDark(true);
    } catch {
      /* private mode: stay light */
    }
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [dark]);
  const toggleTheme = () => {
    const next = !dark;
    try {
      localStorage.setItem("yanyin:theme", next ? "dark" : "light");
    } catch {
      /* not saved, still switches */
    }
    // One GPU cross-fade of the whole screen instead of hundreds of colour transitions.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const apply = () => {
      const root = document.documentElement;
      if (next) root.dataset.theme = "dark";
      else delete root.dataset.theme;
      setDark(next);
    };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(apply);
    else apply();
  };
  const [item, setItem] = useState<MenuItem | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [age, setAge] = useState<"unknown" | "ok" | "blocked">(
    brand.ageRestricted ? "unknown" : "ok",
  );

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


  const flash = useCallback((n: Notice) => {
    haptic("success");
    setNotice(n);
    setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), 2600);
  }, []);
  /** Every action answers with a notification: a title and what happens next. */
  const say = (
    key: UiKey,
    icon: React.ReactNode = <BellRing size={16} strokeWidth={2.25} />,
  ) =>
    flash({
      title: ui(lang, key),
      text: ui(lang, `${key}Hint` as UiKey),
      icon,
      tone:
        key === "added" || key === "orderSent"
          ? "green"
          : key === "coalsCalled"
            ? "orange"
            : "blue",
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

  // The menu is the heaviest part of the page (every dish card). It is built once per
  // language, menu and cart change, so clocks, tabs, sheets and theme changes elsewhere
  // on the page never re-render a hundred cards.
  const menuList = useMemo(
    () => (
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
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks only read state that is in the deps
    [menu, lang, currency, lines],
  );

  return (
    <div className="min-h-dvh bg-g-bg text-g-ink">
      <div className="mx-auto max-w-[480px] pb-32">
        {/* Top: the banking-app pattern, same as the waiter's home. */}
        <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-6 text-white">
          {/* Northern lights in the Nomad blue: soft ribbons of light drift over a deep blue sky. */}
          <div ref={skyRef} className="north-sky" aria-hidden>
            <span className="ns-glow ns-a" />
            <span className="ns-glow ns-b" />
            <span className="ns-glow ns-c" />
            <span className="ns-ribbon ns-r1" />
            <span className="ns-ribbon ns-r2" />
          </div>
          <div className="flex items-center gap-2.5 px-5">
            <button
              onClick={() => setSheet("about")}
              aria-label={ui(lang, "about")}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[16px] font-bold text-g-ink"
            >
              {brand.mark}
            </button>
            <button
              onClick={() => setSheet("search")}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/15 px-3.5 text-left text-[15px] text-white/70"
            >
              <Search size={17} strokeWidth={2} />
              <span className="truncate">{ui(lang, "search")}</span>
            </button>
            <button
              aria-label={ui(lang, "language")}
              onClick={() => setSheet("lang")}
              className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-[13px] font-bold uppercase"
            >
              {lang}
            </button>
            <button
              aria-label={ui(lang, "yanAsk")}
              onClick={() => {
                haptic("light");
                setSheet("yan");
              }}
              className="press grid size-10 shrink-0 place-items-center rounded-full"
            >
              <YanOrb size={40} />
            </button>
          </div>

          <div className="mt-9 flex items-center gap-3 px-5">
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 text-[14px] text-white/70">
                {table && (
                  <>
                    <span className="size-1.5 shrink-0 rounded-full bg-[#fff]" />
                    <span className="shrink-0 font-semibold text-white">
                      {`${ui(lang, "table")} ${table.padStart(2, "0")}`}
                    </span>
                    <span className="text-white/45">·</span>
                  </>
                )}
                <span className="truncate">
                  {orders.length
                    ? ui(lang, "billTitle")
                    : (brand.cuisine[lang as "en"] ?? brand.cuisine.en)}
                </span>
              </p>
              <button
                onClick={() =>
                  orders.length ? setSheet("bill") : setSheet("about")
                }
                className="press mt-2 flex max-w-full items-center gap-1 text-left"
              >
                <span className="truncate text-[30px] leading-tight font-bold tracking-[-0.03em] tabular-nums">
                  {orders.length
                    ? formatMoney(
                        orders.reduce((n, o) => n + o.total, 0),
                        currency,
                        lang,
                      )
                    : menu.venue.name}
                </span>
                <ChevronRight size={22} className="shrink-0 text-white/55" />
              </button>
            </div>
            <ThemeToggle
              dark={dark}
              onToggle={toggleTheme}
              label={ui(lang, "theme")}
            />
          </div>

          {/* Strip: one big order card, then two rows of the same height: waiter and bill squares, short wide cards. */}
          <div className="no-scrollbar mt-7 grid grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-5 [grid-auto-columns:max-content]">
            <button
              onClick={() => {
                haptic("light");
                if (count > 0) setSheet("cart");
                else if (menu.categories[0]) scrollTo(menu.categories[0].id);
              }}
              className="press row-span-2 flex h-[134px] w-[148px] flex-col justify-between rounded-[22px] bg-white p-3.5 text-left text-g-ink"
            >
              <span className="flex items-center justify-between">
                <span className="blue-grad grid size-10 place-items-center rounded-full">
                  <UtensilsCrossed size={19} strokeWidth={2} />
                </span>
                {count > 0 && (
                  <span className="grid h-7 min-w-7 place-items-center rounded-full bg-g-blue-soft px-2 text-[13px] font-bold text-g-blue tabular-nums">
                    {count}
                  </span>
                )}
              </span>
              <span>
                <span className="block text-[17px] leading-tight font-semibold">
                  {count > 0
                    ? ui(lang, "yourOrder")
                    : orders.length
                      ? ui(lang, "orderMore")
                      : ui(lang, "startOrder")}
                </span>
                <span className="mt-1 block truncate text-[12px] text-g-muted tabular-nums">
                  {count > 0
                    ? formatMoney(total, currency, lang)
                    : ui(lang, "startOrderSub")}
                </span>
              </span>
            </button>
            <SquareButton
              icon={<BellRing size={21} strokeWidth={1.9} />}
              label={ui(lang, "qaWaiter")}
              onClick={() => say("waiterCalled")}
            />
            <SquareButton
              icon={<ReceiptText size={21} strokeWidth={1.9} />}
              label={ui(lang, "qaBill")}
              onClick={() => {
                if (!orders.length)
                  flash({
                    title: ui(lang, "billNone"),
                    text: ui(lang, "billNoneHint"),
                    tone: "orange",
                    icon: <ReceiptText size={16} strokeWidth={2.25} />,
                  });
                else setSheet("bill");
              }}
            />
            <WideButton
              onClick={() => setSheet("roulette")}
              corner={
                <span className="wheel-corner pointer-events-none absolute -top-[56px] -left-[56px]">
                  <RouletteWheel size={112} bare />
                </span>
              }
              title={ui(lang, "qaRoulette")}
              sub={ui(lang, "qaRouletteShort")}
            />
            <WideButton
              onClick={() => setSheet("categories")}
              art={
                <span className="chip-blue grid size-9 place-items-center rounded-[12px]">
                  <LayoutGrid size={18} strokeWidth={2} />
                </span>
              }
              title={ui(lang, "categories")}
              sub={`${menu.categories.length} ${ui(lang, "sections")}`}
            />
            <WideButton
              onClick={() => setSheet("yan")}
              art={<YanOrb size={34} />}
              title="Yan"
              sub={ui(lang, "yanShort")}
            />
            <WideButton
              onClick={() => setSheet("wifi")}
              art={
                <span className="chip-blue grid size-9 place-items-center rounded-[12px]">
                  <Wifi size={18} strokeWidth={2} />
                </span>
              }
              title="Wi-Fi"
              sub={brand.about.wifi.name}
            />
            {hasCoals && (
              <>
                <WideButton
                  onClick={() =>
                    say("coalsCalled", <Flame size={16} strokeWidth={2.25} />)
                  }
                  art={
                    <span className="chip-orange grid size-9 place-items-center rounded-[12px]">
                      <Flame size={18} strokeWidth={2} />
                    </span>
                  }
                  title={ui(lang, "qaCoalsDo")}
                  sub={ui(lang, "qaCoalsSub")}
                />
                <WideButton
                  onClick={() => setSheet("about")}
                  art={
                    <span className="chip-gray grid size-9 place-items-center rounded-[12px]">
                      <Info size={18} strokeWidth={2} />
                    </span>
                  }
                  title={ui(lang, "about")}
                  sub={
                    brand.about.closes
                      ? `${ui(lang, "openUntil")} ${brand.about.closes}`
                      : ""
                  }
                />
              </>
            )}
          </div>
        </section>

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
        {/* Category tabs: own state, so following the scroll never re-renders the page. */}
        <CategoryTabs menu={menu} lang={lang} onPick={scrollTo} />

        {/* Menu */}
        {menuList}
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

      {/* Live order: the bottom island with a burning fuse while the kitchen works. */}
      {(() => {
        const last = orders[orders.length - 1];
        if (!last || sheet) return null;
        const stage = orderStage(last, now);
        const since = (now - last.placedAt) / 1000;
        if (stage === 3 && since > 55) return null;
        const keys: UiKey[] = [
          "liveSent",
          "liveAccepted",
          "liveCooking",
          "liveReady",
        ];
        return (
          <LiveIsland
            label={ui(lang, keys[stage]!)}
            progress={Math.min(1, since / 45)}
            done={stage === 3}
            eta={(() => {
              // Demo clock: 45 s of real time stands for a 15-minute kitchen.
              const left = Math.max(
                0,
                Math.round((1 - Math.min(1, since / 45)) * 15 * 60),
              );
              return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
            })()}
            etaLabel={ui(lang, "liveEta")}
            mark={brand.mark}
            thumb={(() => {
              const first = itemById.get(last.lines[0]?.itemId ?? "");
              return first?.photo || first?.cover ? (
                <Image
                  src={(first.photo ?? first.cover)!}
                  alt=""
                  width={60}
                  height={60}
                  className="size-full object-cover"
                />
              ) : (
                <ChefHat
                  size={24}
                  strokeWidth={1.8}
                  className="text-white/80"
                />
              );
            })()}
            openLabel={ui(lang, "liveOpen")}
            callLabel={ui(lang, "qaWaiter")}
            onOpen={() => setSheet("orders")}
            onCall={() => say("waiterCalled")}
            bottom={
              count > 0
                ? "calc(max(16px, env(safe-area-inset-bottom)) + 76px)"
                : "max(20px, env(safe-area-inset-bottom))"
            }
          />
        );
      })()}

      {!sheet && (
        <ToTop
          label={ui(lang, "toTop")}
          bottom={`calc(max(20px, env(safe-area-inset-bottom)) + ${(count > 0 ? 76 : 0) + (orders.length && orderStage(orders[orders.length - 1]!, now) < 3 ? 64 : 0)}px)`}
        />
      )}

      <CategoriesSheet
        open={sheet === "categories"}
        onClose={() => setSheet(null)}
        menu={menu}
        lang={lang}
        onPick={(id) => {
          setSheet(null);
          // Let the page close first, then glide to the section.
          setTimeout(() => scrollTo(id), 80);
        }}
      />
      <BillSheet
        open={sheet === "bill"}
        onClose={() => setSheet(null)}
        lang={lang}
        currency={currency}
        orders={orders}
        itemById={itemById}
        table={table}
        onRequest={(_, method) => {
          setSheet(null);
          flash({
            title: ui(lang, "billRequested"),
            text: `${ui(lang, "billRequestedHint")} · ${method}`,
            tone: "orange",
            icon: <ReceiptText size={16} strokeWidth={2.25} />,
          });
        }}
      />

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
      <WifiSheet
        open={sheet === "wifi"}
        onClose={() => setSheet(null)}
        brand={brand}
        lang={lang}
        onNotice={(title) =>
          flash({
            title,
            tone: "green",
            icon: <Check size={16} strokeWidth={2.5} />,
          })
        }
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

/** Square service button in the top strip (waiter, bill). */
function SquareButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="press flex size-[62px] flex-col items-center justify-center gap-0.5 rounded-[20px] bg-white text-g-ink"
    >
      {icon}
      <span className="max-w-full truncate px-1 text-[10px] font-semibold">
        {label}
      </span>
    </button>
  );
}

/**
 * Short wide card in the top strip: as tall as a square button, illustration and two lines.
 * `corner` puts a large illustration in the top-left corner, cropped to a quarter.
 */
function WideButton({
  onClick,
  art,
  corner,
  title,
  sub,
}: {
  onClick: () => void;
  art?: React.ReactNode;
  corner?: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className={`press relative flex h-[62px] w-[158px] items-center gap-2.5 overflow-hidden rounded-[20px] bg-white pr-3 text-left text-g-ink ${corner ? "pl-[64px]" : "pl-2.5"}`}
    >
      {corner}
      {art && (
        <span className="grid size-10 shrink-0 place-items-center">{art}</span>
      )}
      <span className="relative min-w-0">
        <span className="block truncate text-[14px] leading-tight font-semibold">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-g-muted">
          {sub}
        </span>
      </span>
    </button>
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
    <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-[#0b1636] via-[#0b1636]/70 to-transparent px-5 pt-20 pb-4">
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/15 px-2.5 text-[12px] font-semibold text-white backdrop-blur-md">
        {icon}
        {chip}
      </span>
      <span className="live mt-2.5 block text-[20px] leading-[1.15] font-bold tracking-[-0.02em] text-white">
        {title}
      </span>
      {text && (
        <span className="live mt-1 line-clamp-1 block text-[13px] leading-snug text-white/75">
          {text}
        </span>
      )}
      <span className="mt-3 flex h-10 items-center justify-between gap-3">
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
                className="aurora block h-[300px] w-full cursor-pointer rounded-[26px] text-left"
                aria-label={ui(lang, "roulette")}
              >
                <span className="absolute -top-16 -right-16">
                  <RouletteWheel tone="dark" size={270} />
                </span>
                <HeroCaption
                  chip={ui(lang, "roulette")}
                  icon={<Dices size={12} strokeWidth={2.25} />}
                  title={ui(lang, "rouletteTitle")}
                  text={ui(lang, "rouletteHint")}
                >
                  <span className="press flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-semibold text-[#1d3fd6]">
                    <Dices size={18} strokeWidth={2} />{" "}
                    {ui(lang, "rouletteCta")}
                  </span>
                </HeroCaption>
              </div>
            ) : (
              (() => {
                const it = itemById.get(s.itemId)!;
                const builder =
                  it.variants.length > 0 ||
                  it.modifierGroups.some((g) => g.required);
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(it)}
                    onKeyDown={(e) => e.key === "Enter" && onOpen(it)}
                    className="relative block h-[300px] w-full cursor-pointer overflow-hidden rounded-[26px] bg-[#0b1636] text-left text-white"
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
                      <span className="live block text-[20px] leading-[1.15] font-bold tracking-[-0.02em]">
                        {t(it.name, lang)}
                      </span>
                      <span className="live mt-1 line-clamp-1 text-[13px] leading-[1.4] text-white/80">
                        {s.blurb[lang as "en"] ?? s.blurb.en}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {s.facts.map((f) => (
                          <span
                            key={f.en}
                            className="inline-flex h-5 items-center rounded-full border border-white/25 px-2 text-[11px] font-medium text-white/90"
                          >
                            {f[lang as "en"] ?? f.en}
                          </span>
                        ))}
                      </span>
                      <span className="mt-2.5 flex h-10 items-center justify-between gap-3 border-t border-white/15 pt-2.5 box-content">
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
                          className="press flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-[#1d3fd6]"
                        >
                          {!builder && <Plus size={18} strokeWidth={2.25} />}
                          {s.cta
                            ? (s.cta[lang as "en"] ?? s.cta.en)
                            : ui(lang, "add")}
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

/** Sun that turns into the moon: rays fold away and a shadow slides in to carve the crescent. */
function ThemeToggle({
  dark,
  onToggle,
  label,
}: {
  dark: boolean;
  onToggle: () => void;
  label: string;
}) {
  const id = useId();
  return (
    <button
      aria-label={label}
      aria-pressed={dark}
      onClick={() => {
        haptic("tick");
        onToggle();
      }}
      className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15"
    >
      <svg
        viewBox="0 0 24 24"
        width={22}
        height={22}
        className={`theme-ico ${dark ? "is-dark" : ""}`}
        aria-hidden
      >
        <mask id={`moon-${id}`}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="moon-bite" cx="17" cy="9" r="5.5" fill="#000" />
        </mask>
        <circle
          className="sun-core"
          cx="12"
          cy="12"
          r="5"
          fill="#fff"
          mask={`url(#moon-${id})`}
        />
        <g className="rays" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.8v2.2M12 20v2.2M1.8 12h2.2M20 12h2.2M4.8 4.8l1.5 1.5M17.7 17.7l1.5 1.5M4.8 19.2l1.5-1.5M17.7 6.3l1.5-1.5" />
        </g>
      </svg>
    </button>
  );
}

/**
 * Sticky category ring. It keeps the "section in view" state to itself: while
 * the guest scrolls, only these labels update, not the whole menu page.
 */
function CategoryTabs({ menu, lang, onPick }: { menu: Menu; lang: Lang; onPick: (id: string) => void }) {
  const [active, setActive] = useState(menu.categories[0]!.id);
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        let top: IntersectionObserverEntry | undefined;
        for (const e of entries) if (e.isIntersecting && (!top || e.boundingClientRect.top < top.boundingClientRect.top)) top = e;
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
  // The ring turns the current section to its centre once the page comes to rest:
  // turning it during the page scroll made two animations fight for every frame.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout> | undefined;
    const follow = () => {
      const bar = tabsRef.current;
      const tab = bar?.querySelector<HTMLElement>(`[data-tab="${activeRef.current}"]`);
      if (bar && tab) bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
    };
    const onScroll = () => {
      clearTimeout(idle);
      idle = setTimeout(follow, 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  useRing(tabsRef, [menu, lang]);
  return (
    <nav aria-label={ui(lang, "categories")} className="sticky top-0 z-30 mt-6 bg-white">
      <div ref={tabsRef} className="no-scrollbar flex snap-x snap-proximity gap-1 overflow-x-auto px-[calc(50%-64px)] py-2.5">
        {menu.categories.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              data-tab={c.id}
              onClick={() => onPick(c.id)}
              aria-current={on ? "true" : undefined}
              className={`h-9 shrink-0 snap-center rounded-full px-4 text-[14px] font-medium whitespace-nowrap ${on ? "bg-g-ink text-white" : "text-g-muted"}`}
            >
              {t(c.name, lang)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
