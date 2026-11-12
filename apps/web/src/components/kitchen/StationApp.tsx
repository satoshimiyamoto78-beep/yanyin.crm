"use client";

import { AlertTriangle, Ban, Check, ChevronDown, ClipboardCheck, Clock, CookingPot, Hourglass, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { advanceTicket, allItems, checklistProgress, type ChecklistRun, type I18nText, type Menu, type Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { saveStopList, useStopList } from "@/lib/stoplist";
import { TEAM } from "@/lib/demo-team";
import { BAR_CHECKLIST, BAR_RUN, demoKitchen, KITCHEN_CHECKLIST, KITCHEN_RUN, VENUE_STATIONS, venueStation, type KdsLine, type KdsOrder } from "@/lib/demo-kitchen";
import { Island, type IslandNotice } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { ArtScene, ArtTile } from "@/components/system/Art";
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
const useClock = () => useSyncExternalStore(clock.subscribe, clock.get, () => START);
const hhmm = (s: number) => `${String(Math.floor(s / 3600) % 24).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
const secOf = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 3600 + (m ?? 0) * 60;
};
/** Minutes waiting: under 8 fine, 8–15 getting long, 15+ late. */
const ageTone = (min: number) => (min >= 15 ? "late" : min >= 8 ? "long" : "ok");

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
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.35);
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
  const [picking, setPicking] = useState(false);
  const [dark, setDark] = useState(true);
  const [sound, setSound] = useState(true);
  const stop = useStopList();
  const [sheet, setSheet] = useState<"stop" | "checklist" | null>(null);
  const [runs, setRuns] = useState<Record<string, ChecklistRun>>({ bar: BAR_RUN, kitchen: KITCHEN_RUN });
  const demo = useMemo(() => demoKitchen(menu), [menu]);
  const [orders, setOrders] = useState<KdsOrder[]>(demo.orders);
  const [served, setServed] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  // Restore this tablet's station, theme, sound and the stop-list once.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restore saved screen settings once on mount */
    setStation(read<Station | null>("yanyin:kds-station", null));
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
  const queue = orders.filter((o) => !served.includes(o.id) && o.lines.some((l) => mine(l) && l.state !== "ready")).sort((a, b) => a.at.localeCompare(b.at));
  const ready = orders.filter((o) => !served.includes(o.id) && o.lines.some(mine) && o.lines.filter(mine).every((l) => l.state === "ready"));
  const count = (st: KdsLine["state"]) => queue.reduce((n, o) => n + o.lines.filter((l) => mine(l) && l.state === st).reduce((q, l) => q + l.qty, 0), 0);
  const info = VENUE_STATIONS.find((s) => s.id === station);
  const onShift = TEAM.filter((p) => p.onShift && station && (p.stations.includes(station) || (station === "hot" && p.stations.includes("grill")) || (station === "cold" && p.stations.includes("pastry"))));
  const tpl = station === "bar" ? BAR_CHECKLIST : KITCHEN_CHECKLIST;
  const runKey = station === "bar" ? "bar" : "kitchen";
  const progress = checklistProgress(tpl, runs[runKey]!, hhmm(now));
  const stationItems = useMemo(() => allItems(menu).filter((i) => i.price > 0 && venueStation(menu, i) === station), [menu, station]);

  const finishIfReady = (o: KdsOrder) => {
    const lines = o.lines.filter(mine);
    if (lines.length && lines.every((l) => l.state === "ready")) {
      haptic("success");
      notify({ title: tr("Table {n} is ready", { n: o.table }), text: `@${o.waiter}`, tone: "green", icon: <Check size={16} strokeWidth={2.6} /> });
    }
  };
  const tapLine = (o: KdsOrder, l: KdsLine) => {
    haptic("tick");
    const next = { ...o, lines: o.lines.map((x) => (x.id === l.id ? { ...x, state: advanceTicket({ id: x.id, station: x.station, table: o.table, state: x.state }).state } : x)) };
    setOrders((os) => os.map((x) => (x.id === o.id ? next : x)));
    finishIfReady(next);
  };
  const allReady = (o: KdsOrder) => {
    const next = { ...o, lines: o.lines.map((x) => (mine(x) ? { ...x, state: "ready" as const } : x)) };
    setOrders((os) => os.map((x) => (x.id === o.id ? next : x)));
    finishIfReady(next);
  };

  if (!station || picking)
    return (
      <StationPicker
        current={station}
        onPick={(s) => {
          haptic("success");
          setStation(s);
          setPicking(false);
          write("yanyin:kds-station", s);
        }}
      />
    );

  return (
    <div className="min-h-dvh bg-g-bg text-g-ink">
      <Island notice={notice} />
      {/* Header: which station, the counts, the clock, then tools. */}
      <header className="sticky top-0 z-30 border-b border-g-line bg-g-bg">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
          <button onClick={() => setPicking(true)} className="press flex h-12 items-center gap-2 rounded-full bg-g-fill pr-4 pl-1.5">
            <ArtTile name={info?.art ?? "kitchen"} size={40} bare />
            <span className="text-[19px] font-bold tracking-[-0.01em]">{tr(info?.label ?? "")}</span>
            <ChevronDown size={18} className="text-g-muted" />
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-g-tint-blue px-3.5 py-2 text-[15px] font-semibold text-g-blue tabular-nums">
            <Hourglass size={16} strokeWidth={2.4} /> {tr("New")} {count("new")}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-g-tint-orange px-3.5 py-2 text-[15px] font-semibold text-g-orange tabular-nums">
            <CookingPot size={16} strokeWidth={2.4} /> {tr("Making")} {count("making")}
          </span>
          <span className="hidden text-[13px] text-g-muted md:inline">{onShift.map((p) => `@${p.handle}`).join(" · ")}</span>
          <span className="ml-auto text-[26px] font-bold tracking-[-0.02em] tabular-nums">{hhmm(now)}</span>
          <div className="flex items-center gap-2">
            <ToolButton label={tr("Stop-list")} onClick={() => setSheet("stop")} badge={stationItems.filter((i) => stop.includes(i.id)).length || undefined}>
              <Ban size={20} strokeWidth={2.1} />
            </ToolButton>
            <ToolButton label={tr("Checklist")} onClick={() => setSheet("checklist")} badge={progress.late.length || undefined} badgeTone="orange">
              <ClipboardCheck size={20} strokeWidth={2.1} />
            </ToolButton>
            <ToolButton
              label={sound ? tr("Sound on") : tr("Sound off")}
              onClick={() => {
                setSound(!sound);
                write("yanyin:kds-sound", !sound);
              }}
            >
              {sound ? <Volume2 size={20} strokeWidth={2.1} /> : <VolumeX size={20} strokeWidth={2.1} />}
            </ToolButton>
            <ToolButton
              label={tr("Theme")}
              onClick={() => {
                setDark(!dark);
                write("yanyin:kds-dark", !dark);
              }}
            >
              {dark ? <Sun size={20} strokeWidth={2.1} /> : <Moon size={20} strokeWidth={2.1} />}
            </ToolButton>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-start">
        {/* The queue, oldest first. */}
        <main className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
          {queue.map((o) => (
            <OrderCard key={o.id} order={o} station={station} minute={minute} fresh={fresh === o.id} stop={stop} onLine={(l) => tapLine(o, l)} onAll={() => allReady(o)} />
          ))}
          {!queue.length && (
            <div className="col-span-full grid place-items-center rounded-[28px] bg-g-fill px-6 py-20 text-center">
              <p className="text-[24px] font-bold">{tr("All caught up")}</p>
              <p className="mt-1 text-[15px] text-g-muted">{tr("New orders appear here with a chime")}</p>
            </div>
          )}
        </main>

        {/* Ready to serve: the waiter or runner takes it. */}
        <aside className="w-full shrink-0 rounded-[26px] bg-g-fill p-4 lg:sticky lg:top-[92px] lg:w-[300px]">
          <p className="flex items-center justify-between text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
            <span>{tr("Ready to serve")}</span>
            <span className="tabular-nums">{ready.length}</span>
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
            {ready.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-[20px] bg-g-card p-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#22c55e] text-[20px] font-bold text-white tabular-nums">{o.table}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{tr("Table {n}", { n: o.table })}</span>
                  <span className="block truncate text-[13px] text-g-muted">
                    @{o.waiter} · {tr("{n} item|{n} items", { n: o.lines.filter(mine).reduce((n, l) => n + l.qty, 0) })}
                  </span>
                </span>
                <button
                  onClick={() => {
                    haptic("success");
                    setServed((s) => [...s, o.id]);
                  }}
                  className="press h-11 shrink-0 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
                >
                  {tr("Served")}
                </button>
              </div>
            ))}
            {!ready.length && <p className="px-1 py-3 text-[14px] text-g-muted">{tr("Nothing waiting at the pass")}</p>}
          </div>
        </aside>
      </div>

      {sheet === "stop" && (
        <Sheet open onClose={() => setSheet(null)} label={tr("Stop-list")} title={false}>
          <div className="px-5 pt-1 pb-10">
            <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Stop-list")}</h2>
            <p className="mt-1 text-[14px] text-g-muted">{tr("Tap what ran out: guests and waiters stop seeing it at once")}</p>
            <div className="mt-4 divide-y divide-g-line rounded-[22px] bg-g-fill px-4">
              {stationItems.map((it) => {
                const off = stop.includes(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      haptic(off ? "light" : "success");
                      const next = off ? stop.filter((x) => x !== it.id) : [...stop, it.id];
                      saveStopList(next);
                    }}
                    aria-pressed={off}
                    className="press flex w-full items-center gap-3 py-3.5 text-left"
                  >
                    <DishName name={it.name} className={`min-w-0 flex-1 truncate text-[16px] ${off ? "text-g-muted line-through" : "font-medium"}`} />
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${off ? "bg-[#ef4444] text-white" : "bg-g-card text-g-muted"}`}>{off ? tr("Out") : tr("In stock")}</span>
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
          onFinish={(xp) => notify({ title: tr("Checklist closed · +{n} XP", { n: xp }), text: tr("{who} sees it in the admin panel", { who: "@huong" }), tone: "green", icon: <Check size={16} strokeWidth={2.6} /> })}
        />
      )}
    </div>
  );
}

function DishName({ name, className }: { name: I18nText; className?: string }) {
  const dish = useDish();
  return <span className={className}>{dish(name)}</span>;
}

function ToolButton({ label, onClick, children, badge, badgeTone = "blue" }: { label: string; onClick: () => void; children: React.ReactNode; badge?: number; badgeTone?: "blue" | "orange" }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="press relative grid size-12 place-items-center rounded-full bg-g-fill"
    >
      {children}
      {badge !== undefined && (
        <span className={`absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white tabular-nums ${badgeTone === "orange" ? "bg-g-orange" : "bg-[#ef4444]"}`}>{badge}</span>
      )}
    </button>
  );
}

/** One table's order for this station: big lines, live age, tap a line to move it on. */
function OrderCard({ order: o, station, minute, fresh, stop, onLine, onAll }: { order: KdsOrder; station: Station; minute: number; fresh: boolean; stop: string[]; onLine: (l: KdsLine) => void; onAll: () => void }) {
  const tr = useTr();
  const lines = o.lines.filter((l) => l.station === station);
  const other = o.lines.filter((l) => l.station !== station && l.state !== "ready");
  const min = Math.max(0, minute - Math.floor(secOf(o.at) / 60));
  const tone = ageTone(min);
  const ring = { ok: "", long: "ring-2 ring-g-orange/70", late: "ring-[3px] ring-[#ef4444]" }[tone];
  return (
    <section className={`flex min-w-0 flex-col rounded-[26px] bg-g-fill p-4 ${ring} ${fresh ? "animate-pop" : ""}`}>
      <header className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums">{tr("Table {n}", { n: o.table })}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] text-g-muted">
            <span>@{o.waiter}</span>
            <span>· {o.at}</span>
            {o.guest && <span className="rounded-full bg-g-tint-blue px-2 py-0.5 font-semibold text-g-blue">{tr("from the QR menu")}</span>}
          </span>
        </span>
        <Elapsed since={o.at} tone={tone} />
      </header>
      <div className="mt-3 grid gap-1.5">
        {lines.map((l) => {
          const out = stop.includes(l.itemId);
          return (
            <button
              key={l.id}
              onClick={() => onLine(l)}
              disabled={l.state === "ready"}
              className={`press flex min-h-14 items-center gap-3 rounded-[18px] px-3 py-2 text-left ${l.state === "ready" ? "bg-g-card opacity-60" : l.state === "making" ? "bg-g-tint-orange" : "bg-g-card"}`}
            >
              <span className="w-9 shrink-0 text-[22px] font-bold tabular-nums">{l.qty}×</span>
              <span className="min-w-0 flex-1">
                <DishLine line={l} done={l.state === "ready"} />
                {l.note && <span className="block text-[14px] font-semibold text-g-orange">{tr(l.note)}</span>}
                {out && <span className="block text-[13px] font-semibold text-[#ef4444]">{tr("In the stop-list")}</span>}
              </span>
              <StatePill state={l.state} />
            </button>
          );
        })}
      </div>
      {other.length > 0 && (
        <p className="mt-2 px-1 text-[13px] text-g-muted">
          {tr("Also on this order")}: {[...new Set(other.map((l) => l.station))].map((s) => `${tr(VENUE_STATIONS.find((v) => v.id === s)?.label ?? "")} ${other.filter((l) => l.station === s).reduce((n, l) => n + l.qty, 0)}`).join(" · ")}
        </p>
      )}
      <button
        onClick={() => {
          haptic("success");
          onAll();
        }}
        className="press mt-3 h-12 rounded-full bg-[#22c55e] text-[16px] font-semibold text-white"
      >
        {tr("All ready")}
      </button>
    </section>
  );
}

function DishLine({ line, done }: { line: KdsLine; done: boolean }) {
  return <DishName name={line.name} className={`block text-[19px] leading-snug font-semibold ${done ? "line-through decoration-2" : ""}`} />;
}

function StatePill({ state }: { state: KdsLine["state"] }) {
  const tr = useTr();
  if (state === "new") return <span className="shrink-0 rounded-full bg-g-tint-blue px-3 py-1.5 text-[13px] font-semibold text-g-blue">{tr("Start")}</span>;
  if (state === "making") return <span className="shrink-0 rounded-full bg-g-orange px-3 py-1.5 text-[13px] font-semibold text-white">{tr("Making")}</span>;
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#22c55e] px-3 py-1.5 text-[13px] font-semibold text-white">
      <Check size={14} strokeWidth={3} /> {tr("Ready")}
    </span>
  );
}

/** Live minutes:seconds since the order came in, with colour and an icon by age. */
function Elapsed({ since, tone }: { since: string; tone: "ok" | "long" | "late" }) {
  const now = useClock();
  const s = Math.max(0, now - secOf(since));
  const cls = { ok: "bg-g-card text-g-ink", long: "bg-g-orange text-white", late: "bg-[#ef4444] text-white" }[tone];
  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[18px] font-bold tabular-nums ${cls}`}>
      {tone === "late" ? <AlertTriangle size={17} strokeWidth={2.4} /> : <Clock size={17} strokeWidth={2.4} />}
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

/** First run on a tablet: which station is this screen. */
function StationPicker({ current, onPick }: { current: Station | null; onPick: (s: Station) => void }) {
  const tr = useTr();
  return (
    <div className="min-h-dvh bg-g-bg px-5 pt-[max(28px,env(safe-area-inset-top))] pb-10 text-g-ink">
      <div className="mx-auto max-w-[920px]">
        <p className="text-[13px] font-semibold tracking-[0.06em] text-g-blue uppercase">yanyin.kitchen · Samarkand</p>
        <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.025em]">{tr("Which station is this screen?")}</h1>
        <p className="mt-1 text-[15px] text-g-muted">{tr("The screen remembers it. Change it any time from the top bar.")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {VENUE_STATIONS.map((s) => {
            const people = TEAM.filter((p) => p.onShift && (p.stations.includes(s.id) || s.absorbs.some((a) => p.stations.includes(a))));
            return (
              <button key={s.id} onClick={() => onPick(s.id)} className={`press block text-left ${current === s.id ? "rounded-[28px] ring-2 ring-g-blue" : ""}`}>
                <ArtScene name={s.art} layout="stack" focal={64} className="h-full rounded-[28px] p-5">
                  <p className="mt-4 text-[22px] font-bold tracking-[-0.02em]">{tr(s.label)}</p>
                  <p className="mt-1 text-[13px] text-g-muted">{people.length ? people.map((p) => `@${p.handle}`).join(" · ") : tr("Nobody on shift")}</p>
                </ArtScene>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
