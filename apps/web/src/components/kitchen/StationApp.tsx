"use client";

import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ClipboardCheck,
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
import { PersonPic } from "@/components/system/PersonPic";
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
import {
  Island,
  startLoading,
  Reveal,
  type IslandNotice,
} from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { ArtScene, ArtTile } from "@/components/system/Art";
import { DishInfo, Picker } from "./KdsParts";
import { Board } from "./Board";
import { NorthSky } from "@/components/system/NorthSky";
import { BrandQr, OfflineBar, PinPad } from "@/components/system/Kit";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { ChecklistPage } from "@/components/crew/Checklist";
import {
  CrewPrefsProvider,
  useDish,
  useLocale,
  useTr,
} from "@/components/crew/prefs";

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
  const locale = useLocale();
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
  const [info2, setInfo2] = useState<string | null>(null);
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
    // A cook or bartender on their own phone is signed in personally: no tablet pairing (kitchen.html?me=chef_dima).
    const personal = new URLSearchParams(window.location.search).get("me");
    setPaired(personal ? true : read("yanyin:kds-paired", false));
    if (personal && !read<Station | null>("yanyin:kds-station", null))
      setStation(personal.includes("bar") ? "bar" : "hot");
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
  // A ticket whose last line is done lifts and fades first, then moves to "Ready to serve".
  const [leaving, setLeaving] = useState<string[]>([]);
  const commit = (o: KdsOrder, next: KdsOrder) => {
    const done = next.lines.filter(mine).every((x) => x.state === "ready");
    if (!done) {
      setOrders((os) => os.map((x) => (x.id === o.id ? next : x)));
      finishIfReady(next);
      return;
    }
    setLeaving((l) => [...l, o.id]);
    setTimeout(() => {
      setOrders((os) => os.map((x) => (x.id === o.id ? next : x)));
      finishIfReady(next);
      setLeaving((l) => l.filter((x) => x !== o.id));
    }, 320);
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
    commit(o, next);
  };
  const allReady = (o: KdsOrder) => {
    const next = {
      ...o,
      lines: o.lines.map((x) =>
        mine(x) ? { ...x, state: "ready" as const } : x,
      ),
    };
    commit(o, next);
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
  // Load per station for the picker: dishes waiting, the oldest ticket, what is at the pass.
  const loadOf = (st: Station) => {
    const qs = orders.filter(
      (o) =>
        !served.includes(o.id) &&
        o.lines.some((l) => l.station === st && l.state !== "ready"),
    );
    const oldest = qs.map((o) => o.at).sort()[0];
    return {
      queue: qs.reduce(
        (n, o) =>
          n +
          o.lines
            .filter((l) => l.station === st && l.state !== "ready")
            .reduce((q, l) => q + l.qty, 0),
        0,
      ),
      oldest: oldest
        ? Math.max(
            0,
            minute -
              (Number(oldest.slice(0, 2)) * 60 + Number(oldest.slice(3))),
          )
        : 0,
      ready: orders.filter(
        (o) =>
          !served.includes(o.id) &&
          o.lines.some((l) => l.station === st) &&
          o.lines
            .filter((l) => l.station === st)
            .every((l) => l.state === "ready"),
      ).length,
    };
  };
  if (!station || picking)
    return (
      <Picker
        current={station}
        load={loadOf}
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
          startLoading(420);
          setStation(s);
          write("yanyin:kds-station", s);
          if (picking) history.back();
          setPicking(false);
        }}
      />
    );

  const oldest = queue.map((o) => o.at).sort()[0];
  const oldestMin = oldest
    ? Math.max(0, minute - Math.floor(secOf(oldest) / 60))
    : 0;
  const stats: { label: string; value: string; tone?: string }[] = [
    { label: tr("New"), value: String(count("new")) },
    {
      label: tr("Making"),
      value: String(count("making")),
      tone: count("making") ? "text-[#ffd2a8]" : "",
    },
    {
      label: tr("At the pass"),
      value: String(ready.length),
      tone: ready.length ? "text-[#8ff0bf]" : "",
    },
    {
      label: tr("Longest"),
      value: oldestMin ? tr("{n} min", { n: oldestMin }) : "—",
      tone:
        oldestMin >= 15
          ? "text-[#ffb3b5]"
          : oldestMin >= 8
            ? "text-[#ffd2a8]"
            : "",
    },
    {
      label: tr("Checklist"),
      value: `${progress.done}/${progress.total}`,
      tone: progress.late.length ? "text-[#ffd2a8]" : "",
    },
  ];
  const itemOf = (id: string) => allItems(menu).find((i) => i.id === id);
  const infoLine = info2
    ? orders.flatMap((o) => o.lines).find((l) => l.id === info2)
    : undefined;

  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <OfflineBar
        text={tr(
          "No internet · the queue keeps working and syncs when it is back",
        )}
      />
      <Island notice={notice} />
      {/* Header in two calm rows: who and where with the clock and tools; then five figures in glass tiles. */}
      <section className="relative isolate pt-[max(12px,env(safe-area-inset-top))] pb-8 text-white">
        <NorthSky />
        <div className="flex items-center gap-2 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => (haptic("light"), setPicking(true))}
            className="press flex h-11 min-w-0 items-center gap-2 rounded-full bg-white/15 pr-3 pl-1.5"
          >
            <ArtTile name={info?.art ?? "kitchen"} size={32} bare />
            <span className="truncate text-[17px] font-bold">
              {tr(info?.label ?? "")}
            </span>
            <ChevronDown
              size={17}
              strokeWidth={2.4}
              className="shrink-0 text-white/60"
            />
          </button>
          <span className="hidden -space-x-2 sm:flex">
            {onShift.map((p) => (
              <span
                key={p.id}
                title={`@${p.handle}`}
                className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-white/20 text-[12px] font-bold ring-2 ring-white/20"
              >
                <PersonPic p={p} />
              </span>
            ))}
          </span>
          <span className="ml-auto hidden text-[22px] font-bold tracking-[-0.02em] tabular-nums sm:block">
            {hhmm(now)}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-2">
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
      </section>

      {/* Above the sky's soft lower edge, so the first rows are never washed out. */}
      {/* Above the sky's soft lower edge: the board, three columns. */}
      <Reveal
        key={station}
        as="main"
        className="relative z-10 px-3 pb-10 sm:px-5"
      >
        {/* A board bar, like the reference: the day and the shift on the left, what to watch on the right. */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border border-g-line bg-g-fill/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[17px] leading-tight font-bold">{tr("Today")}</p>
            <p className="text-[12.5px] text-g-muted">
              {(() => {
                const d = new Date(2026, 10, 14).toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                });
                return d.charAt(0).toUpperCase() + d.slice(1);
              })()}{" "}
              · {tr("shift is on")}
            </p>
          </div>
          <span className="hidden h-8 w-px bg-g-line sm:block" />
          <p className="flex items-baseline gap-2">
            <span className="live text-[26px] leading-none font-bold tabular-nums">
              {count("new") + count("making")}
            </span>
            <span className="text-[13px] text-g-muted">
              {tr("dish in work|dishes in work", {
                n: count("new") + count("making"),
              })}
            </span>
          </p>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {stats.slice(3).map((st, i) => (
              <button
                key={st.label}
                type="button"
                onClick={i === 1 ? () => setSheet("checklist") : undefined}
                className="flex h-9 items-center gap-1.5 rounded-full bg-g-card px-3 text-[13px] font-semibold"
              >
                <span className="text-g-muted">{st.label}</span>
                <span className={`live tabular-nums ${st.tone ?? ""}`}>
                  {st.value}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Board
          orders={orders.filter(
            (o) => !served.includes(o.id) && o.lines.some(mine),
          )}
          station={station}
          minute={minute}
          fresh={fresh}
          leaving={leaving}
          stop={stop}
          elapsed={(o) => (
            <Elapsed
              since={o.at}
              tone={ageTone(Math.max(0, minute - Math.floor(secOf(o.at) / 60)))}
            />
          )}
          onLine={tapLine}
          onAll={allReady}
          onInfo={(l) => setInfo2(l.id)}
          onServed={(id) => (haptic("success"), setServed((s) => [...s, id]))}
          notify={(t) =>
            notify({
              title: t,
              tone: "green",
              icon: <Check size={16} strokeWidth={2.6} />,
            })
          }
          empty={
            <ArtScene
              name={info?.art ?? "kitchen"}
              layout="row"
              focal={64}
              className="rounded-[26px] p-6"
            >
              <p className="text-[24px] leading-tight font-bold tracking-[-0.02em]">
                {tr("All caught up")}
              </p>
              <p className="mt-1 text-[15px] text-g-muted">
                {tr("New orders appear here with a chime")}
              </p>
            </ArtScene>
          }
        />
      </Reveal>

      {infoLine && (
        <DishInfo
          line={infoLine}
          item={itemOf(infoLine.itemId)}
          station={station}
          out={stop.includes(infoLine.itemId)}
          onStop={() =>
            saveStopList(
              stop.includes(infoLine.itemId)
                ? stop.filter((x) => x !== infoLine.itemId)
                : [...stop, infoLine.itemId],
            )
          }
          onClose={() => setInfo2(null)}
        />
      )}
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
  const ink = {
    ok: "text-g-muted",
    long: "text-g-orange",
    late: "text-[#e5484d]",
  }[tone];
  return (
    <span
      className={`flex shrink-0 items-center gap-1 text-[17px] font-semibold tabular-nums ${ink}`}
    >
      {tone === "late" && <AlertTriangle size={15} strokeWidth={2.4} />}
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
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
          <h1 className="mt-3 text-[32px] leading-tight font-bold tracking-[-0.025em]">
            {tr("Connect this tablet")}
          </h1>
          <p className="mt-1 max-w-[560px] text-[15px] text-white/75">
            {tr(
              "Enter the code from the admin console: Settings → Station tablets. Nobody signs in on a shared screen.",
            )}
          </p>
        </div>
      </section>
      <div className="relative z-10 px-5 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-[960px] items-start gap-6 md:grid-cols-[1fr_300px]">
          <div className="card rounded-[28px] px-5 py-8">
            <PinPad value={pin} onChange={setPin} error={bad} />
            <p
              className={`mt-6 text-center text-[14px] ${bad ? "font-semibold text-[#e5484d]" : "text-g-muted"}`}
            >
              {bad
                ? tr("Wrong code, try again")
                : tr("Demo code: {code}", { code: PAIR_CODE })}
            </p>
          </div>
          <div className="card flex flex-col items-center rounded-[28px] p-6 text-center">
            <BrandQr
              value="https://yanyin.app/pair/samarkand-4827"
              size={200}
              label={tr("Pairing QR code")}
            />
            <p className="mt-4 text-[16px] font-bold">
              {tr("Or scan with the admin's phone")}
            </p>
            <p className="mt-1 text-[13px] text-g-muted">
              {tr("Waiter app → Scan, or the admin console camera.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
