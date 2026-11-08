"use client";

import { addLine, allItems, cartCount, setQty, unitPrice, type CartLine, type Category, type Lang, type Menu, type MenuItem } from "@yanyin/domain";
import { Check, Home, Info, ReceiptText, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LANG_LABEL, UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import { venueBrand } from "@/lib/visual";
import { RouletteSheet } from "./RouletteSheet";
import { AboutScreen, CartScreen, DetailScreen, HomeScreen, MenuScreen, OrdersScreen, orderStage, type Ctx, type PlacedOrder } from "./screens";
import { Sheet } from "./Sheet";

type Tab = "home" | "menu" | "cart" | "orders" | "about";
type View = { tab: Tab; itemId?: string };

function initialLang(): Lang {
  const code = navigator.language.slice(0, 2);
  return (UI_LANGS as readonly string[]).includes(code) ? (code as Lang) : "en";
}

/**
 * yanyin.menu: the guest app opened from a table QR code. One platform design
 * (docs/06-design-direction.md), white-labelled per venue by accent and copy.
 */
export function GuestApp({ menu }: { menu: Menu }) {
  const brand = venueBrand(menu.venue);
  const { currency } = menu.venue;
  const items = useMemo(() => allItems(menu), [menu]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const categoryOf = useMemo(() => new Map<string, Category>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c] as const))), [menu]);

  const [lang, setLang] = useState<Lang>("en");
  const [table, setTable] = useState<string | null>(null);
  const [stack, setStack] = useState<View[]>([{ tab: "home" }]);
  const [activeCat, setActiveCat] = useState(menu.categories[0]!.id);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [now, setNow] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [age, setAge] = useState<"unknown" | "ok" | "blocked">(brand.ageRestricted ? "unknown" : "ok");

  const view = stack[stack.length - 1]!;

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

  // Live order status ticks while an order is in progress.
  const live = orders.length > 0 && orderStage(orders[orders.length - 1]!, now).pct < 100;
  useEffect(() => {
    if (!orders.length) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [orders.length]);

  // Phone back button walks the in-app stack.
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = useCallback((v: View) => {
    window.history.pushState({ yanyin: true }, "");
    setStack((s) => [...s, v]);
    window.scrollTo({ top: 0 });
  }, []);
  const back = useCallback(() => {
    if (stack.length > 1) window.history.back();
  }, [stack.length]);

  const showToast = useCallback(
    (text: string) => {
      setToast(text);
      setTimeout(() => setToast((cur) => (cur === text ? null : cur)), 2200);
    },
    [],
  );

  const addToCart = useCallback(
    (item: MenuItem, variantId: string | undefined, optionIds: string[], qty: number) => {
      setLines((prev) => addLine(prev, { itemId: item.id, variantId, optionIds, qty, unitPrice: unitPrice(item, variantId, optionIds) }));
      showToast(ui(lang, "added"));
    },
    [lang, showToast],
  );

  const ctx: Ctx = {
    menu,
    brand,
    lang,
    currency,
    table,
    lines,
    categoryOf,
    itemById,
    qtyOf: (id) => lines.filter((l) => l.itemId === id && !l.variantId && !l.optionIds.length).reduce((s, l) => s + l.qty, 0),
    open: (item) => push({ tab: view.tab, itemId: item.id }),
    quickAdd: (item) => {
      if (item.variants.length || item.modifierGroups.some((g) => g.required)) push({ tab: view.tab, itemId: item.id });
      else addToCart(item, undefined, [], 1);
    },
    setPlainQty: (item, qty) => setLines((prev) => setQty(prev, `${item.id}||`, qty)),
    go: (tab, categoryId) => {
      if (categoryId) setActiveCat(categoryId);
      if (tab === view.tab && !view.itemId) return;
      push({ tab });
    },
    back,
    openLang: () => setLangOpen(true),
    openRoulette: () => setRouletteOpen(true),
    service: (key: UiKey) => showToast(ui(lang, key)),
    hasCoals: menu.categories.some((c) => c.serviceCalls.some((s) => s.id === "change_coals")),
  };

  const detailItem = view.itemId ? itemById.get(view.itemId) : undefined;
  const count = cartCount(lines);

  return (
    <div style={{ ["--guest-cta" as string]: brand.accent }} className="min-h-dvh bg-guest-bg text-guest-ink">
      <div className={`relative mx-auto min-h-dvh max-w-[430px] overflow-x-hidden ${detailItem || view.tab === "cart" ? "" : "pb-[118px]"}`}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[380px]" style={{ background: "radial-gradient(110% 75% at 12% -15%, color-mix(in srgb, var(--guest-cta) 20%, transparent), transparent 42%)" }} />
        <div className="relative">
          {detailItem ? (
            <DetailScreen
              key={detailItem.id}
              ctx={ctx}
              item={detailItem}
              onAdd={(variantId, optionIds, qty) => {
                addToCart(detailItem, variantId, optionIds, qty);
                back();
              }}
            />
          ) : view.tab === "home" ? (
            <HomeScreen ctx={ctx} search={search} setSearch={setSearch} />
          ) : view.tab === "menu" ? (
            <MenuScreen ctx={ctx} active={activeCat} setActive={setActiveCat} search={search} setSearch={setSearch} />
          ) : view.tab === "cart" ? (
            <CartScreen
              ctx={ctx}
              onQty={(key, qty) => setLines((prev) => setQty(prev, key, qty))}
              onSend={(note) => {
                const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
                setOrders((o) => [...o, { id: o.length + 1, lines, total, note, placedAt: Date.now() }]);
                setNow(Date.now());
                setLines([]);
                setStack([{ tab: "home" }, { tab: "orders" }]);
              }}
            />
          ) : view.tab === "orders" ? (
            <OrdersScreen ctx={ctx} orders={orders} now={now} />
          ) : (
            <AboutScreen ctx={ctx} />
          )}
        </div>
      </div>

      {!detailItem && view.tab !== "cart" && (
        <nav aria-label="Main" className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-guest-surface p-1.5 shadow-[0_16px_36px_-14px_rgba(20,22,26,.22)]">
          {(
            [
              ["home", Home],
              ["menu", UtensilsCrossed],
              ["cart", ShoppingBag],
              ["orders", ReceiptText],
              ["about", Info],
            ] as const
          ).map(([tab, Icon]) => {
            const on = view.tab === tab;
            return (
              <button
                key={tab}
                aria-label={ui(lang, tab)}
                aria-current={on ? "page" : undefined}
                onClick={() => (on ? undefined : setStack(tab === "home" ? [{ tab: "home" }] : [{ tab: "home" }, { tab }]))}
                className={`relative grid size-10 place-items-center rounded-full transition-all duration-200 ${on ? "scale-105 bg-guest-cta text-white" : "text-guest-muted-2"}`}
              >
                <Icon className="size-4" strokeWidth={2.4} />
                {tab === "cart" && count > 0 && (
                  <span className="absolute -top-px -right-px grid h-[18px] min-w-[18px] place-items-center rounded-full border-[2.5px] border-guest-surface bg-guest-red px-1 text-[9.5px] font-extrabold text-white">
                    {count}
                  </span>
                )}
                {tab === "orders" && live && (
                  <span className="animate-dot absolute top-1 right-1 size-[9px] rounded-full border-[2.5px] border-guest-surface bg-guest-green" />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {toast && (
        <div role="status" className="animate-pop fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[60] mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-full bg-guest-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-xl">
          <Check className="size-4 text-guest-green" strokeWidth={3} /> {toast}
        </div>
      )}

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={ui(lang, "language")}>
        <div className="px-5 pb-6">
          <h2 className="mb-4 text-[18px] font-extrabold">{ui(lang, "language")}</h2>
          <div className="overflow-hidden rounded-[18px] bg-guest-surface-2">
            {UI_LANGS.map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLang(l);
                  setLangOpen(false);
                }}
                className="flex w-full items-center gap-3 border-t border-guest-line px-4 py-3.5 text-left first:border-t-0"
              >
                <span className="grid size-7 place-items-center rounded-full bg-guest-surface text-[11px] font-extrabold uppercase">{l}</span>
                <span className="flex-1 text-[13.5px] font-bold">{LANG_LABEL[l]}</span>
                {l === lang && (
                  <span className="accent-soft grid size-5 place-items-center rounded-full text-guest-cta">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <RouletteSheet
        open={rouletteOpen}
        onClose={() => setRouletteOpen(false)}
        menu={menu}
        lang={lang}
        onAddAll={(picked, guests) => {
          setLines((prev) => picked.reduce((acc, item) => addLine(acc, { itemId: item.id, optionIds: [], qty: guests, unitPrice: item.price }), prev));
          showToast(ui(lang, "added"));
        }}
      />

      {age !== "ok" && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-6 backdrop-blur">
          <div className="animate-pop w-full max-w-sm rounded-[26px] bg-guest-surface p-7 text-center shadow-2xl">
            <p className="text-[56px] leading-none font-extrabold text-guest-cta">18+</p>
            {age === "blocked" ? (
              <p className="mt-4 font-bold">{ui(lang, "ageBlocked")}</p>
            ) : (
              <>
                <h2 className="mt-4 text-[19px] font-extrabold">{ui(lang, "ageTitle")}</h2>
                <p className="mt-2 text-[13.5px] text-guest-muted">{ui(lang, "ageBody")}</p>
                <div className="mt-6 grid gap-2">
                  <button
                    onClick={() => {
                      setAge("ok");
                      try {
                        sessionStorage.setItem(`age:${menu.venue.slug}`, "ok");
                      } catch {}
                    }}
                    className="press rounded-full bg-guest-cta py-4 font-bold text-white"
                  >
                    {ui(lang, "ageYes")}
                  </button>
                  <button onClick={() => setAge("blocked")} className="press rounded-full bg-guest-surface-2 py-4 font-bold">
                    {ui(lang, "ageNo")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
