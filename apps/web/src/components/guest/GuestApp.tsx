"use client";

import {
  addLine,
  setNote,
  DEFAULT_SERVICE_RATE,
  withService,
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
  UtensilsCrossed,
  Dices,
  Flame,
  Plus,
  ReceiptText,
  Search,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import { venueBrand, type VenueBrand } from "@/lib/visual";
import { RouletteSheet } from "./RouletteSheet";
import { ArtTile } from "@/components/system/Art";
import { NorthSky } from "@/components/system/NorthSky";
import { useScheme } from "@/components/system/scheme";
import {
  Strip,
  StripBig,
  StripWide,
} from "@/components/system/Strip";
import { ThemeToggle } from "@/components/system/ThemeToggle";
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
import { useStopList, withoutStopped } from "@/lib/stoplist";
import { applyEdits, menuEdits } from "@/lib/menu-edits";
import { MysterySheet } from "./MysterySheet";
import { OfflineBar } from "@/components/system/Kit";
import { haptic } from "@/lib/haptics";
import { ScrollLock } from "@/lib/scroll-lock";
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
import { DishCard, DishRow } from "./ui";
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
  | "mystery"
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
export function GuestApp({ menu: seedMenu }: { menu: Menu }) {
  // The admin's published menu edits (prices, names, hidden and new dishes) apply at once.
  const edits = menuEdits(seedMenu.venue.slug).use();
  const fullMenu = useMemo(() => applyEdits(seedMenu, edits), [seedMenu, edits]);
  // Dishes a station marked as run out disappear at once (the full menu still resolves cart lines).
  const stop = useStopList();
  const menu = useMemo(() => withoutStopped(fullMenu, stop), [fullMenu, stop]);
  const brand = venueBrand(menu.venue);
  const { currency } = menu.venue;
  const items = useMemo(() => allItems(fullMenu), [fullMenu]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const categoryOf = useMemo(
    () =>
      new Map<string, Category>(
        fullMenu.categories.flatMap((c) => c.items.map((i) => [i.id, c] as const)),
      ),
    [fullMenu],
  );

  const [lang, setLang] = useState<Lang>("en");
  const [table, setTable] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [now, setNow] = useState(0);
  const [sheet, setSheet] = useState<SheetName>(null);
  // One light/dark choice for every yanyin surface.
  const { dark, toggle: toggleTheme } = useScheme();
  const [item, setItem] = useState<MenuItem | null>(null);
  // Grid (photo cards) or list (rows with a thumbnail): the guest's choice, remembered on this phone.
  const [view, setView] = useState<"grid" | "list">("grid");
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
      if (localStorage.getItem("yanyin:menu-view") === "list") setView("list");
    } catch {}
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
    note?: string,
  ) => {
    setLines((prev) =>
      addLine(prev, {
        itemId: it.id,
        variantId,
        optionIds,
        qty,
        unitPrice: unitPrice(it, variantId, optionIds),
        note,
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
  // Service is shown up front everywhere a sum appears, so the bill holds no surprises.
  const serviceRate = menu.venue.serviceRate ?? DEFAULT_SERVICE_RATE;
  // The "pizza from halves" builder, if the venue has one: it gets its own quick button.
  const halves = useMemo(
    () => menu.categories.flatMap((c) => c.items).find((i) => i.builder === "halves"),
    [menu],
  );
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
        {/* Grid or list, one tap; the same choice for every category. */}
        <div className="flex items-center justify-between gap-3 pt-6">
          <p className="px-1 text-[14px] font-medium text-g-muted">
            {ui(lang, "dishesCount").replace("{n}", String(menu.categories.reduce((n, c) => n + c.items.length, 0)))}
          </p>
          <div role="radiogroup" aria-label={ui(lang, "menuView")} className="relative grid h-10 w-[88px] grid-cols-2 rounded-full bg-g-fill p-1">
            <span aria-hidden className="absolute top-1 bottom-1 left-1 w-[40px] rounded-full bg-white shadow-[0_1px_3px_rgba(11,11,15,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(${view === "list" ? 40 : 0}px)` }} />
            {(
              [
                ["grid", LayoutGrid, ui(lang, "viewGrid")],
                ["list", ListIcon, ui(lang, "viewList")],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={view === v}
                aria-label={label}
                onClick={() => {
                  if (view === v) return;
                  haptic("tick");
                  setView(v);
                  try {
                    localStorage.setItem("yanyin:menu-view", v);
                  } catch {}
                }}
                className={`relative z-10 grid place-items-center rounded-full transition-colors ${view === v ? "text-g-ink" : "text-g-faint"}`}
              >
                <Icon size={18} strokeWidth={2.1} />
              </button>
            ))}
          </div>
        </div>
        {menu.categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="pt-8">
            <h2 className="mb-3 flex items-baseline gap-2 px-1 text-[24px] leading-tight font-bold tracking-[-0.025em]">
              {t(c.name, lang)}
              <span className="text-[15px] font-medium tracking-normal text-g-faint">
                {c.items.length}
              </span>
            </h2>
            {(() => {
              // Dishes with a photo are cards in two columns (an odd one out leads,
              // laid across both); dishes without one are rows of a single card.
              const shots = c.items.filter((i) => i.photo || i.cover);
              const plain = c.items.filter((i) => !i.photo && !i.cover);
              const props = (it: MenuItem) => ({
                item: it,
                lang,
                currency,
                qty: qtyOf(it.id),
                onOpen: () => setItem(it),
                onAdd: () => quickAdd(it),
                onQty: (q: number) => setPlainQty(it, q),
              });
              if (view === "list")
                // List: every dish one row, with its photo as a thumbnail when it has one.
                return (
                  <div className="divide-y divide-g-line rounded-[24px] bg-g-fill px-3">
                    {c.items.map((it, n) => (
                      <Reveal key={`${it.id}-${lang}-l`} delay={(n % 4) * 40}>
                        <DishRow {...props(it)} role={c.role} thumb={Boolean(it.photo || it.cover)} />
                      </Reveal>
                    ))}
                  </div>
                );
              return (
                <>
                  {shots.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {shots.map((it, n) => (
                        <Reveal key={`${it.id}-${lang}`} delay={(n % 4) * 50} className={shots.length % 2 === 1 && n === 0 ? "col-span-2 grid" : "grid"}>
                          <DishCard {...props(it)} role={c.role} format={menu.venue.imageFormat} wide={shots.length % 2 === 1 && n === 0} />
                        </Reveal>
                      ))}
                    </div>
                  )}
                  {plain.length > 0 && (
                    <div className={`divide-y divide-g-line rounded-[24px] bg-g-fill px-3 ${shots.length ? "mt-2.5" : ""}`}>
                      {plain.map((it, n) => (
                        <Reveal key={`${it.id}-${lang}`} delay={(n % 4) * 50}>
                          <DishRow {...props(it)} role={c.role} />
                        </Reveal>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
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
    [menu, lang, currency, lines, view],
  );

  return (
    <div className="min-h-dvh bg-g-bg text-g-ink">
      <OfflineBar text={ui(lang, "offline")} />
      <div className="mx-auto max-w-[480px] pb-32">
        {/* Top: the banking-app pattern, same as the waiter's home. */}
        <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-6 text-white">
          {/* Northern lights in the Nomad blue: soft ribbons of light drift over a deep blue sky. */}
          <NorthSky />
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
          <Strip>
            <StripBig
              art="orders"
              onClick={() => {
                if (count > 0) setSheet("cart");
                else if (menu.categories[0]) scrollTo(menu.categories[0].id);
              }}
              icon={<UtensilsCrossed size={19} strokeWidth={2} />}
              badge={
                count > 0 && (
                  <span className="grid h-7 min-w-7 place-items-center rounded-full bg-g-blue-soft px-2 text-[13px] font-bold text-g-blue tabular-nums">
                    {count}
                  </span>
                )
              }
              title={
                count > 0
                  ? ui(lang, "yourOrder")
                  : orders.length
                    ? ui(lang, "orderMore")
                    : ui(lang, "startOrder")
              }
              sub={
                count > 0
                  ? formatMoney(withService(total, serviceRate).total, currency, lang)
                  : ui(lang, "startOrderSub")
              }
            />
            <StripWide
              onClick={() => say("waiterCalled")}
              art={<ArtTile name="bell" size={38} bare />}
              title={ui(lang, "qaWaiter")}
              sub={ui(lang, "qaWaiterSub")}
            />
            <StripWide
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
              art={<ArtTile name="check" size={38} bare />}
              title={ui(lang, "qaBill")}
              sub={ui(lang, "askBillHint")}
            />
            <StripWide
              onClick={() => setSheet("roulette")}
              corner={
                <span className="wheel-corner pointer-events-none absolute -top-[56px] -left-[56px]">
                  <RouletteWheel size={112} bare />
                </span>
              }
              title={ui(lang, "qaRoulette")}
              sub={ui(lang, "qaRouletteShort")}
            />
            <StripWide
              onClick={() => setSheet("mystery")}
              art={<span className="blue-grad grid size-9 place-items-center rounded-full text-[19px] font-bold">?</span>}
              title={ui(lang, "qaMystery")}
              sub={ui(lang, "qaMysterySub")}
            />
            {halves && (
              <StripWide
                onClick={() => setItem(halves)}
                art={<ArtTile name="pizza" size={38} bare />}
                title={ui(lang, "qaHalves")}
                sub={ui(lang, "qaHalvesSub")}
              />
            )}
            <StripWide
              onClick={() => setSheet("categories")}
              art={<ArtTile name="menu" size={38} bare />}
              title={ui(lang, "categories")}
              sub={`${menu.categories.length} ${ui(lang, "sections")}`}
            />
            <StripWide
              onClick={() => setSheet("yan")}
              art={<YanOrb size={34} />}
              title="Yan"
              sub={ui(lang, "yanShort")}
            />
            <StripWide
              onClick={() => setSheet("wifi")}
              art={<ArtTile name="wifi" size={38} bare />}
              title="Wi-Fi"
              sub={brand.about.wifi.name}
            />
            {hasCoals && (
              <>
                <StripWide
                  onClick={() =>
                    say("coalsCalled", <Flame size={16} strokeWidth={2.25} />)
                  }
                  art={
                    <Flame size={24} strokeWidth={2} className="text-g-orange" />
                  }
                  title={ui(lang, "qaCoalsDo")}
                  sub={ui(lang, "qaCoalsSub")}
                />
                <StripWide
                  onClick={() => setSheet("about")}
                  art={
                    <Info size={24} strokeWidth={2} className="text-g-ink-2" />
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
          </Strip>
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
              {formatMoney(withService(total, serviceRate).total, currency, lang)}
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
            callLabel={ui(lang, "callWaiterShort")}
            kicker={ui(lang, "liveTitle").replace("{n}", String(last.id).padStart(3, "0"))}
            foldLabel={ui(lang, "liveFold")}
            stage={stage}
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
      <MysterySheet
        open={sheet === "mystery"}
        onClose={() => setSheet(null)}
        lang={lang}
        currency={currency}
        menu={menu}
        onTake={(it) => {
          setSheet(null);
          addToCart(it, undefined, [], 1);
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
        serviceRate={serviceRate}
        onPaid={() =>
          flash({
            title: ui(lang, "paidIsland"),
            text: ui(lang, "paidIslandHint"),
            tone: "green",
            icon: <Check size={16} strokeWidth={2.5} />,
          })
        }
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
        onAdd={(it, v, o, q, n) => {
          addToCart(it, v, o, q, n);
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
        onNote={(key, n) => setLines((prev) => setNote(prev, key, n))}
        serviceRate={serviceRate}
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
        menu={menu}
        table={table ?? undefined}
        onOrderMore={() => setSheet(null)}
        onBill={() => setSheet("bill")}
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
          <ScrollLock />
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

/**
 * Sticky category ring. It keeps the "section in view" state to itself: while
 * the guest scrolls, only these labels update, not the whole menu page.
 */
function CategoryTabs({
  menu,
  lang,
  onPick,
}: {
  menu: Menu;
  lang: Lang;
  onPick: (id: string) => void;
}) {
  const [active, setActive] = useState(menu.categories[0]!.id);
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        let top: IntersectionObserverEntry | undefined;
        for (const e of entries)
          if (
            e.isIntersecting &&
            (!top || e.boundingClientRect.top < top.boundingClientRect.top)
          )
            top = e;
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
  // The ring follows the page at once: the moment a new section takes the top,
  // its label glides to the centre. The glide is our own short ease on
  // scrollLeft (cheap, one property per frame), so it never waits for the page
  // to come to rest and never fights the page scroll. A finger on the ring wins.
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!bar || !tab) return;
    const target = Math.max(0, Math.min(bar.scrollWidth - bar.clientWidth, tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2));
    let raf = 0;
    let stopped = false;
    const snap = bar.style.scrollSnapType;
    bar.style.scrollSnapType = "none"; // snapping would tug against the glide
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      bar.style.scrollSnapType = snap;
    };
    const step = () => {
      if (stopped) return;
      const d = target - bar.scrollLeft;
      if (Math.abs(d) < 1) {
        bar.scrollLeft = target;
        stop();
        return;
      }
      bar.scrollLeft += d * 0.22;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    bar.addEventListener("touchstart", stop, { passive: true, once: true });
    bar.addEventListener("pointerdown", stop, { passive: true, once: true });
    return () => {
      stop();
      bar.removeEventListener("touchstart", stop);
      bar.removeEventListener("pointerdown", stop);
    };
  }, [active]);
  useRing(tabsRef, [menu, lang]);
  return (
    <nav
      aria-label={ui(lang, "categories")}
      className="sticky top-0 z-30 mt-6 bg-white"
    >
      <div
        ref={tabsRef}
        className="no-scrollbar flex snap-x snap-proximity gap-1 overflow-x-auto px-[calc(50%-64px)] py-2.5"
      >
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
