"use client";

import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  LogOut,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  advanceTicket,
  allItems,
  checklistProgress,
  type ChecklistRun,
  type I18nText,
  type Menu,
  type Station,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { saveStopList, useStopList } from "@/lib/stoplist";
import { TEAM } from "@/lib/demo-team";
import {
  BAR_CHECKLIST,
  BAR_RUN,
  demoKitchen,
  KITCHEN_CHECKLIST,
  KITCHEN_RUN,
  VENUE_STATIONS,
  venueStation,
  type KdsLine,
  type KdsOrder,
} from "@/lib/demo-kitchen";
import { Island, type IslandNotice } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { ArtScene, ArtTile } from "@/components/system/Art";
import { NorthSky } from "@/components/system/NorthSky";
import { BrandQr, PinPad } from "@/components/system/Kit";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { ChecklistPage } from "@/components/crew/Checklist";
import { CrewPrefsProvider, useDish, useTr } from "@/components/crew/prefs";

/*
 * yanyin.kitchen: one screen per station on a wall tablet (bar, hot kitchen,
 * cold kitchen). The whole station works one shared queue (ADR-014): orders
 * by table, oldest first, each line tapped through new → making → ready.
 * Age is shown by a live timer, colour and an icon, never colour alone. When
 * a table's lines for this station are ready it moves to "Ready to serve" and
 * its waiter is notified. Dark by default, big type, no typing in the flow.
 */

/* ---------------------------------------------------------------- Demo clock */

// 12:45 when the screen opens, then real time.
const START = 12 * 3600 + 45 * 60;
/** The demo pairing code the admin console shows for a new station tablet. */
export const PAIR_CODE = "4827";
const clock = (() => {
  let now = START;
  let t0 = 0;
  const subs = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    get: () => now,
    subscribe: (f: () => void) => {
      subs.add(f);
      if (!timer) {
        t0 = Date.now() - (now - START) * 1000;
        timer = setInterval(() => {
          now = START + Math.floor((Date.now() - t0) / 1000);
          subs.forEach((s) => s());
        }, 1000);
      }
      return () => {
        subs.delete(f);
        if (!subs.size && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
  };
})();
const useClock = () =>
  useSyncExternalStore(clock.subscribe, clock.get, () => START);
const hhmm = (s: number) =>
  `${String(Math.floor(s / 3600) % 24).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
const secOf = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 3600 + (m ?? 0) * 60;
};
/** Minutes waiting: under 8 fine, 8–15 getting long, 15+ late. */
const ageTone = (min: number) =>
  min >= 15 ? "late" : min >= 8 ? "long" : "ok";

/* ---------------------------------------------------------------- Storage */

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* not saved, still works */
  }
};

/** A short soft chime for a new order (Web Audio, no files). */
function chime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(
        0.2,
        ctx.currentTime + i * 0.12 + 0.02,
      );
      g.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + i * 0.12 + 0.35,
      );
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    /* no audio: the card still flashes */
  }
}

/* ---------------------------------------------------------------- App */

export function StationApp({ menu }: { menu: Menu }) {
  return (
    <CrewPrefsProvider>
      <Screen menu={menu} />
    </CrewPrefsProvider>
  );
}

function Screen({ menu }: { menu: Menu }) {
  const tr = useTr();
  const [station, setStation] = useState<Station | null>(null);
  // A shared wall tablet signs in with a code from the admin console, not a personal login.
  const [paired, setPaired] = useState<boolean | null>(null);
  const [picking, setPicking] = useState(false);
  const [dark, setDark] = useState(true);
  const [sound, setSound] = useState(true);
  const stop = useStopList();
  const [sheet, setSheet] = useState<"stop" | "checklist" | null>(null);
  const [runs, setRuns] = useState<Record<string, ChecklistRun>>({
    bar: BAR_RUN,
    kitchen: KITCHEN_RUN,
  });
  const demo = useMemo(() => demoKitchen(menu), [menu]);
  const [orders, setOrders] = useState<KdsOrder[]>(demo.orders);
  const [served, setServed] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  // Changing the station from the header takes a history entry: back returns to the queue.
  useEffect(() => {
    if (!picking) return;
    try {
      history.pushState({ ...(history.state ?? {}), kdsPick: 1 }, "");
    } catch {}
    const onPop = () => setPicking(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [picking]);

  // Restore this tablet's station, theme, sound and the stop-list once.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restore saved screen settings once on mount */
    setStation(read<Station | null>("yanyin:kds-station", null));
    setPaired(read("yanyin:kds-paired", false));
    setDark(read("yanyin:kds-dark", true));
    setSound(read("yanyin:kds-sound", true));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.dataset.scheme = "dark";
    else delete root.dataset.scheme;
  }, [dark]);

  const notify = useCallback((n: IslandNotice) => {
    setNotice(n);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2800);
  }, []);

  // New orders keep arriving: a chime, a flash, and the card joins the queue.
  useEffect(() => {
    let k = 0;
    const id = setInterval(() => {
      const o = demo.nextOrder(k++, hhmm(clock.get()));
      setOrders((os) => [...os, o]);
      setFresh(o.id);
      if (soundRef.current) chime();
      haptic("light");
    }, 35_000);
    return () => clearInterval(id);
  }, [demo]);

  const now = useClock();
  const minute = Math.floor(now / 60);
  const mine = (l: KdsLine) => l.station === station;
  // Orders with work left for this station, oldest first.
  const queue = orders
    .filter(
      (o) =>
        !served.includes(o.id) &&
        o.lines.some((l) => mine(l) && l.state !== "ready"),
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  const ready = orders.filter(
    (o) =>
      !served.includes(o.id) &&
      o.lines.some(mine) &&
      o.lines.filter(mine).every((l) => l.state === "ready"),
  );
  const count = (st: KdsLine["state"]) =>
    queue.reduce(
      (n, o) =>
        n +
        o.lines
          .filter((l) => mine(l) && l.state === st)
          .reduce((q, l) => q + l.qty, 0),
      0,
    );
  const info = VENUE_STATIONS.find((s) => s.id === station);
  const onShift = TEAM.filter(
    (p) =>
      p.onShift &&
      station &&
      (p.stations.includes(station) ||
        (station === "hot" && p.stations.includes("grill")) ||
        (station === "cold" && p.stations.includes("pastry"))),
  );
  const tpl = station === "bar" ? BAR_CHECKLIST : KITCHEN_CHECKLIST;
  const runKey = station === "bar" ? "bar" : "kitchen";
  const progress = checklistProgress(tpl, runs[runKey]!, hhmm(now));
  const stationItems = useMemo(
    () =>
      allItems(menu).filter(
        (i) => i.price > 0 && venueStation(menu, i) === station,
      ),
    [menu, station],
  );

  const finishIfReady = (o: KdsOrder) => {
    const lines = o.lines.filter(mine);
    if (lines.length && lines.every((l) => l.state === "ready")) {
      haptic("success");
      notify({
        title: tr("Table {n} is ready", { n: o.table }),
        text: `@${o.waiter}`,
        tone: "green",
        icon: <Check size={16} strokeWidth={2.6} />,
      });
    }
  };
  const tapLine = (o: KdsOrder, l: KdsLine) => {
    haptic("tick");
    const next = {
      ...o,
      lines: o.lines.map((x) =>
        x.id === l.id
          ? {
              ...x,
              state: advanceTicket({
                id: x.id,
                station: x.station,
                table: o.table,
                state: x.state,
              }).state,
            }
          : x,
      ),
    };
    setOrders((os) => os.map((x) => (x.id === o.id ? next : x)));
    finishIfReady(next);
  };
  const allReady = (o: KdsOrder) => {
    const next = {
      ...o,
      lines: o.lines.map((x) =>
        mine(x) ? { ...x, state: "ready" as const } : x,
      ),
    };
    setOrders((os) => os.map((x) => (x.id === o.id ? next : x)));
    finishIfReady(next);
  };

  if (paired === null) return <div className="min-h-dvh bg-g-bg" />;
  if (!paired)
    return (
      <PairScreen
        onPaired={() => {
          write("yanyin:kds-paired", true);
          setPaired(true);
        }}
      />
    );
  if (!station || picking)
    return (
      <StationPicker
        current={station}
        onClose={station ? () => history.back() : undefined}
        onUnpair={() => {
          write("yanyin:kds-paired", false);
          write("yanyin:kds-station", null);
          setStation(null);
          setPicking(false);
          setPaired(false);
        }}
        onPick={(s) => {
          haptic("success");
          setStation(s);
          write("yanyin:kds-station", s);
          if (picking) history.back();
          setPicking(false);
        }}
      />
    );

  const counters: { label: string; n: number; dot: string }[] = [
    { label: tr("New"), n: count("new"), dot: "bg-[#8fb2ff]" },
    { label: tr("Making"), n: count("making"), dot: "bg-g-orange" },
    { label: tr("Ready"), n: ready.length, dot: "bg-[#5ce0a0]" },
  ];

  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <Island notice={notice} />
      {/* The same sky as the waiter's home: station, live counts, people on it, the clock and the tools. */}
      <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-6 text-white">
        <NorthSky />
        <div className="flex items-center gap-2 px-4 sm:px-6">
          <button
            onClick={() => setPicking(true)}
            className="press flex h-12 min-w-0 items-center gap-2 rounded-full bg-white/15 pr-4 pl-1.5"
          >
            <ArtTile name={info?.art ?? "kitchen"} size={40} bare />
            <span className="truncate text-[19px] font-bold tracking-[-0.01em]">
              {tr(info?.label ?? "")}
            </span>
            <ChevronDown size={18} className="shrink-0 text-white/60" />
          </button>
          <span
            className="hidden shrink-0 -space-x-2 sm:flex"
            aria-label={onShift.map((p) => `@${p.handle}`).join(", ")}
          >
            {onShift.map((p) => (
              <span
                key={p.id}
                title={`@${p.handle}`}
                className="grid size-9 place-items-center rounded-full bg-[#fff] text-[14px] font-bold text-[#0b0b0f] ring-2 ring-white/30"
              >
                {p.name.slice(0, 1)}
              </span>
            ))}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ToolButton
              label={tr("Stop-list")}
              onClick={() => setSheet("stop")}
              badge={
                stationItems.filter((i) => stop.includes(i.id)).length ||
                undefined
              }
            >
              <Ban size={19} strokeWidth={2} />
            </ToolButton>
            <ToolButton
              label={tr("Checklist")}
              onClick={() => setSheet("checklist")}
              badge={progress.late.length || undefined}
            >
              <ClipboardCheck size={19} strokeWidth={2} />
            </ToolButton>
            <ToolButton
              label={sound ? tr("Sound on") : tr("Sound off")}
              onClick={() => {
                setSound(!sound);
                write("yanyin:kds-sound", !sound);
              }}
            >
              {sound ? (
                <Volume2 size={19} strokeWidth={2} />
              ) : (
                <VolumeX size={19} strokeWidth={2} />
              )}
            </ToolButton>
            <ThemeToggle
              dark={dark}
              onToggle={() => {
                setDark(!dark);
                write("yanyin:kds-dark", !dark);
              }}
              label={tr("Light or dark theme")}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[14px] text-white/70">
              <span className="size-1.5 shrink-0 rounded-full bg-[#5ce0a0]" />
              <span className="font-semibold text-white">
                {tr("Shift is on")}
              </span>
              <span className="text-white/45">·</span>
              {progress.late.length
                ? tr("{n} late|{n} late", { n: progress.late.length })
                : tr("Checklist {a}/{b}", {
                    a: progress.done,
                    b: progress.total,
                  })}
            </p>
            <p className="mt-1 text-[44px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {hhmm(now)}
            </p>
          </div>
          <div className="flex gap-2">
            {counters.map((c) => (
              <span
                key={c.label}
                className="flex h-[62px] min-w-[96px] flex-col justify-center rounded-[20px] bg-white/15 px-3.5"
              >
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/75">
                  <span className={`size-1.5 rounded-full ${c.dot}`} />{" "}
                  {c.label}
                </span>
                <span className="live text-[24px] leading-tight font-bold tabular-nums">
                  {c.n}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Above the sky's soft lower edge, so the first rows are never washed out. */}
      <div className="relative z-10 flex flex-col gap-4 px-4 pb-10 sm:px-6 lg:flex-row lg:items-start">
        {/* The queue, oldest first. */}
        <main className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
          {queue.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              station={station}
              minute={minute}
              fresh={fresh === o.id}
              stop={stop}
              onLine={(l) => tapLine(o, l)}
              onAll={() => allReady(o)}
            />
          ))}
          {!queue.length && (
            <ArtScene
              name={info?.art ?? "kitchen"}
              layout="row"
              focal={64}
              className="col-span-full rounded-[28px] p-6"
            >
              <p className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
                {tr("All caught up")}
              </p>
              <p className="mt-1 text-[15px] text-g-muted">
                {tr("New orders appear here with a chime")}
              </p>
            </ArtScene>
          )}
        </main>

        {/* Ready to serve: the waiter or runner takes it. */}
        <aside className="order-first w-full shrink-0 lg:sticky lg:top-4 lg:order-none lg:w-[320px]">
          <ArtScene
            name="bell"
            layout="row"
            focal={48}
            className="rounded-[28px] p-4"
            footer={
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
                {ready.map((o) => (
                  <div
                    key={o.id}
                    className="animate-pop flex min-w-0 items-center gap-3 rounded-full bg-g-card p-1.5"
                  >
                    <span className="chip-green grid size-12 shrink-0 place-items-center rounded-full text-[19px] font-bold tabular-nums">
                      {o.table}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {tr("Table {n}", { n: o.table })}
                      </span>
                      <span className="block truncate text-[12.5px] text-g-muted">
                        @{o.waiter} ·{" "}
                        {tr("{n} item|{n} items", {
                          n: o.lines
                            .filter(mine)
                            .reduce((n, l) => n + l.qty, 0),
                        })}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        haptic("success");
                        setServed((s) => [...s, o.id]);
                      }}
                      className="press h-11 shrink-0 rounded-full bg-g-ink px-4 text-[13px] font-semibold text-white"
                    >
                      {tr("Served")}
                    </button>
                  </div>
                ))}
                {!ready.length && (
                  <p className="flex items-center gap-2 px-1 py-1 text-[14px] text-g-muted">
                    <span className="size-2 rounded-full bg-g-green" />{" "}
                    {tr("Nothing waiting at the pass")}
                  </p>
                )}
              </div>
            }
          >
            <p className="truncate text-[14px] leading-tight font-semibold text-g-ink-2">
              {tr("Ready to serve")}
            </p>
            <p className="live mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {ready.length}
            </p>
          </ArtScene>
        </aside>
      </div>

      {sheet === "stop" && (
        <Sheet
          open
          onClose={() => setSheet(null)}
          label={tr("Stop-list")}
          title={false}
        >
          <div className="px-5 pt-1 pb-10">
            <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
              {tr("Stop-list")}
            </h2>
            <p className="mt-0.5 text-[14px] text-g-muted">
              {tr(
                "Tap what ran out: guests and waiters stop seeing it at once",
              )}
            </p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2">
              {stationItems.map((it) => {
                const off = stop.includes(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      haptic(off ? "light" : "success");
                      const next = off
                        ? stop.filter((x) => x !== it.id)
                        : [...stop, it.id];
                      saveStopList(next);
                    }}
                    aria-pressed={off}
                    className="press flex min-w-0 items-center gap-3 rounded-full bg-g-fill p-1.5 pr-1.5 text-left"
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-full ${off ? "chip-red" : "chip-green"}`}
                    >
                      {off ? (
                        <Ban size={19} strokeWidth={2.2} />
                      ) : (
                        <Check size={19} strokeWidth={2.6} />
                      )}
                    </span>
                    <DishName
                      name={it.name}
                      className={`min-w-0 flex-1 truncate text-[16px] ${off ? "text-g-muted line-through" : "font-semibold"}`}
                    />
                    <span
                      className={`h-10 shrink-0 rounded-full px-4 text-[13px] leading-10 font-semibold ${off ? "bg-g-ink text-white" : "bg-g-card text-g-ink-2"}`}
                    >
                      {off ? tr("Back on") : tr("Ran out")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Sheet>
      )}
      {sheet === "checklist" && (
        <ChecklistPage
          template={tpl}
          run={runs[runKey]!}
          onChange={(r) => setRuns((rs) => ({ ...rs, [runKey]: r }))}
          me={onShift[0]?.id ?? "staff-thao"}
          setBy="staff-huong"
          onClose={() => setSheet(null)}
          onFinish={(xp) =>
            notify({
              title: tr("Checklist closed · +{n} XP", { n: xp }),
              text: tr("{who} sees it in the admin panel", { who: "@huong" }),
              tone: "green",
              icon: <Check size={16} strokeWidth={2.6} />,
            })
          }
        />
      )}
    </div>
  );
}

function DishName({ name, className }: { name: I18nText; className?: string }) {
  const dish = useDish();
  return <span className={className}>{dish(name)}</span>;
}

/** A round frosted button on the sky, like the waiter's header buttons. */
function ToolButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="press relative grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white"
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-g-orange px-1 text-[10px] font-bold text-white tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

/** One table's order for this station: round rows like the waiter's lists, live age, one big blue action. */
function OrderCard({
  order: o,
  station,
  minute,
  fresh,
  stop,
  onLine,
  onAll,
}: {
  order: KdsOrder;
  station: Station;
  minute: number;
  fresh: boolean;
  stop: string[];
  onLine: (l: KdsLine) => void;
  onAll: () => void;
}) {
  const tr = useTr();
  const lines = o.lines.filter((l) => l.station === station);
  const other = o.lines.filter(
    (l) => l.station !== station && l.state !== "ready",
  );
  const min = Math.max(0, minute - Math.floor(secOf(o.at) / 60));
  const tone = ageTone(min);
  const ring = {
    ok: "",
    long: "ring-2 ring-g-orange/60",
    late: "ring-[3px] ring-[#ef4444]",
  }[tone];
  return (
    <section
      className={`flex min-w-0 flex-col rounded-[28px] bg-g-fill p-4 ${ring} ${fresh ? "animate-pop" : ""}`}
    >
      <header className="flex items-start justify-between gap-3 px-1">
        <span className="min-w-0">
          <span className="block text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums">
            {tr("Table {n}", { n: o.table })}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-g-muted">
            <span className="font-semibold text-g-blue">@{o.waiter}</span>
            <span>· {o.at}</span>
            {o.guest && (
              <span className="chip-blue rounded-full px-2 py-0.5 font-semibold">
                {tr("from the QR menu")}
              </span>
            )}
          </span>
        </span>
        <Elapsed since={o.at} tone={tone} />
      </header>
      <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)] gap-2">
        {lines.map((l) => {
          const out = stop.includes(l.itemId);
          const badge = {
            new: "chip-blue",
            making: "chip-orange",
            ready: "chip-green",
          }[l.state];
          return (
            <button
              key={l.id}
              onClick={() => onLine(l)}
              disabled={l.state === "ready"}
              className={`press flex min-w-0 items-center gap-3 rounded-full bg-g-card p-1.5 text-left ${l.state === "ready" ? "opacity-60" : ""}`}
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-full text-[18px] font-bold tabular-nums ${badge}`}
              >
                {l.qty}×
              </span>
              <span className="min-w-0 flex-1 py-1">
                <DishName
                  name={l.name}
                  className={`block truncate text-[18px] leading-snug font-semibold ${l.state === "ready" ? "line-through decoration-2" : ""}`}
                />
                {l.note && (
                  <span className="block truncate text-[13.5px] font-semibold text-g-orange">
                    {tr(l.note)}
                  </span>
                )}
                {out && (
                  <span className="block truncate text-[13px] font-semibold text-[#ef4444]">
                    {tr("In the stop-list")}
                  </span>
                )}
              </span>
              <StatePill state={l.state} />
            </button>
          );
        })}
      </div>
      {other.length > 0 && (
        <p className="mt-2.5 px-2 text-[13px] text-g-muted">
          {tr("Also on this order")}:{" "}
          {[...new Set(other.map((l) => l.station))]
            .map(
              (s) =>
                `${tr(VENUE_STATIONS.find((v) => v.id === s)?.label ?? "")} ${other.filter((l) => l.station === s).reduce((n, l) => n + l.qty, 0)}`,
            )
            .join(" · ")}
        </p>
      )}
      <button
        onClick={() => {
          haptic("success");
          onAll();
        }}
        className="blue-grad press mt-3.5 flex h-14 items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
      >
        <Check size={19} strokeWidth={2.6} /> {tr("All ready")}
      </button>
    </section>
  );
}

/** The one action on a line, like the waiter's list buttons: start it, then mark it ready. */
function StatePill({ state }: { state: KdsLine["state"] }) {
  const tr = useTr();
  if (state === "new")
    return (
      <span className="h-11 shrink-0 rounded-full bg-g-ink px-4 text-[13px] leading-[44px] font-semibold text-white">
        {tr("Start")}
      </span>
    );
  if (state === "making")
    return (
      <span className="blue-grad h-11 shrink-0 rounded-full px-4 text-[13px] leading-[44px] font-semibold">
        {tr("Ready")}
      </span>
    );
  return (
    <span className="chip-green mr-2 flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold">
      <Check size={14} strokeWidth={3} /> {tr("Done")}
    </span>
  );
}

/** Live minutes:seconds since the order came in, with colour and an icon by age. */
function Elapsed({
  since,
  tone,
}: {
  since: string;
  tone: "ok" | "long" | "late";
}) {
  const now = useClock();
  const s = Math.max(0, now - secOf(since));
  const cls = {
    ok: "bg-g-card text-g-ink",
    long: "chip-orange",
    late: "chip-red",
  }[tone];
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[18px] font-bold tabular-nums ${cls}`}
    >
      {tone === "late" ? (
        <AlertTriangle size={17} strokeWidth={2.4} />
      ) : (
        <Clock size={17} strokeWidth={2.4} />
      )}
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

/** First run on a tablet: which station is this screen. The sky on top, the stations as scene cards. */
function StationPicker({
  current,
  onPick,
  onClose,
  onUnpair,
}: {
  current: Station | null;
  onPick: (s: Station) => void;
  onClose?: () => void;
  onUnpair: () => void;
}) {
  const tr = useTr();
  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <section className="relative isolate px-5 pt-[max(28px,env(safe-area-inset-top))] pb-10 text-white sm:px-8">
        <NorthSky />
        <div className="mx-auto max-w-[960px]">
          <div className="mb-6 flex items-center gap-2">
            {onClose && (
              <button type="button" aria-label={tr("Back")} onClick={onClose} className="press grid size-10 place-items-center rounded-full bg-white/15">
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
            )}
            <button type="button" onClick={onUnpair} className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[13px] font-semibold">
              <LogOut size={15} strokeWidth={2.2} /> {tr("Unpair this tablet")}
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-[14px] text-white/70">
            <span className="size-1.5 shrink-0 rounded-full bg-[#5ce0a0]" />
            <span className="font-semibold text-white">Samarkand</span>
            <span className="text-white/45">·</span>
            {tr("Station screen")}
          </p>
          <h1 className="mt-3 text-[32px] leading-tight font-bold tracking-[-0.025em]">
            {tr("Which station is this screen?")}
          </h1>
          <p className="mt-1 text-[15px] text-white/75">
            {tr(
              "The screen remembers it. Change it any time from the top bar.",
            )}
          </p>
        </div>
      </section>
      <div className="relative z-10 px-5 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-[960px] gap-3 sm:grid-cols-3">
          {VENUE_STATIONS.map((s) => {
            const people = TEAM.filter(
              (p) =>
                p.onShift &&
                (p.stations.includes(s.id) ||
                  s.absorbs.some((a) => p.stations.includes(a))),
            );
            return (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className={`press relative block text-left ${current === s.id ? "rounded-[28px] ring-2 ring-g-blue" : ""}`}
              >
                <ArtScene
                  name={s.art}
                  layout="row"
                  focal={64}
                  className="h-full rounded-[28px] p-5"
                  footer={
                    <span className="mt-4 flex items-center gap-2">
                      <span className="flex -space-x-2">
                        {people.map((p) => (
                          <span
                            key={p.id}
                            className="blue-grad grid size-8 place-items-center rounded-full text-[13px] font-bold ring-2 ring-[var(--g-bg)]"
                          >
                            {p.name.slice(0, 1)}
                          </span>
                        ))}
                      </span>
                      <span className="min-w-0 truncate text-[13px] text-g-muted">
                        {people.length
                          ? people.map((p) => `@${p.handle}`).join(" · ")
                          : tr("Nobody on shift")}
                      </span>
                    </span>
                  }
                >
                  <p className="text-[24px] leading-tight font-bold tracking-[-0.02em]">
                    {tr(s.label)}
                  </p>
                  <p className="mt-0.5 text-[14px] text-g-muted">
                    {tr("{n} on shift", { n: people.length })}
                  </p>
                </ArtScene>
                <ChevronRight
                  size={18}
                  className="absolute right-4 bottom-5 text-g-faint"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** First run on a wall tablet: the code from the admin console (Settings → Station tablets), or a scan of the admin's phone. */
function PairScreen({ onPaired }: { onPaired: () => void }) {
  const tr = useTr();
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (pin.length < 4) return;
    if (pin === PAIR_CODE) {
      haptic("success");
      const t = setTimeout(onPaired, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a wrong code shakes, then clears
    setBad(true);
    const t = setTimeout(() => {
      setBad(false);
      setPin("");
    }, 650);
    return () => clearTimeout(t);
  }, [pin, onPaired]);
  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <section className="relative isolate px-5 pt-[max(28px,env(safe-area-inset-top))] pb-10 text-white sm:px-8">
        <NorthSky />
        <div className="mx-auto max-w-[960px]">
          <p className="flex items-center gap-1.5 text-[14px] text-white/70">
            <span className="size-1.5 shrink-0 rounded-full bg-[#5ce0a0]" />
            <span className="font-semibold text-white">yanyin.kitchen</span>
          </p>
          <h1 className="mt-3 text-[32px] leading-tight font-bold tracking-[-0.025em]">{tr("Connect this tablet")}</h1>
          <p className="mt-1 max-w-[560px] text-[15px] text-white/75">{tr("Enter the code from the admin console: Settings → Station tablets. Nobody signs in on a shared screen.")}</p>
        </div>
      </section>
      <div className="relative z-10 px-5 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-[960px] items-start gap-6 md:grid-cols-[1fr_300px]">
          <div className="card rounded-[28px] px-5 py-8">
            <PinPad value={pin} onChange={setPin} error={bad} />
            <p className={`mt-6 text-center text-[14px] ${bad ? "font-semibold text-[#e5484d]" : "text-g-muted"}`}>{bad ? tr("Wrong code, try again") : tr("Demo code: {code}", { code: PAIR_CODE })}</p>
          </div>
          <div className="card flex flex-col items-center rounded-[28px] p-6 text-center">
            <BrandQr value="https://yanyin.app/pair/samarkand-4827" size={200} label={tr("Pairing QR code")} />
            <p className="mt-4 text-[16px] font-bold">{tr("Or scan with the admin's phone")}</p>
            <p className="mt-1 text-[13px] text-g-muted">{tr("Waiter app → Scan, or the admin console camera.")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
