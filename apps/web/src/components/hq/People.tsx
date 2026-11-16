"use client";

import { Check, ChevronRight, Send, Star, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ROLE_PERMISSIONS,
  type Permission,
  type Person,
  type StaffRole,
  type Station,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { PersonPic } from "@/components/system/PersonPic";
import { Sheet } from "@/components/guest/ui";
import { Switch } from "@/components/system/Kit";
import { useTr } from "@/components/crew/prefs";
import { compactMoney } from "@/components/crew/CrewApp";

/*
 * People in the admin console: the on-shift grid on the overview (after the
 * founder's reference: rounded-square portraits on a soft grid of empty
 * slots, two pointer labels), a person's page with level, today's numbers,
 * quests and badges, and the edit page (roles, stations, access, remove).
 * Numbers are demo, steady per person; the backend fills them from events.
 */

export const ROLE_NAMES: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  waiter: "Waiter",
  bartender: "Bartender",
  cook: "Cook",
  host: "Host",
  runner: "Runner",
  accountant: "Accountant",
};
export const STATION_NAMES: Record<Station, string> = {
  hall: "Hall",
  bar: "Bar",
  hot: "Hot kitchen",
  cold: "Cold kitchen",
  grill: "Grill",
  pastry: "Pastry",
  hookah: "Hookah",
};
export const PERM_NAMES: Record<Permission, string> = {
  "orders.take": "Take orders",
  "orders.void": "Cancel dishes",
  "orders.discount": "Give discounts",
  "payments.take": "Take payments",
  "kds.bump": "Work the station screen",
  "menu.edit": "Edit the menu",
  "stoplist.edit": "Edit the stop-list",
  "staff.manage": "Manage the team",
  "news.post": "Post news to groups",
  "reports.view": "See reports",
  "checklists.manage": "Set up checklists",
  "billing.manage": "Billing and plan",
};
export const LEAD_ROLES: StaffRole[] = [
  "owner",
  "admin",
  "manager",
  "accountant",
];
export type Group = "hall" | "bar" | "kitchen" | "lead";
export const GROUP_NAMES: Record<Group, string> = {
  hall: "Hall",
  bar: "Bar",
  kitchen: "Kitchen",
  lead: "Management",
};
/** Where a person sits in the team list: management first by role, the rest by their first station. */
export const groupOf = (p: Person): Group =>
  p.roles.some((r) => LEAD_ROLES.includes(r))
    ? "lead"
    : p.stations.some((s) => s === "bar" || s === "hookah")
      ? "bar"
      : p.stations.some((s) => s !== "hall")
        ? "kitchen"
        : "hall";

/** A person's face: a circle; initials until photos come. */
export function Face({
  p,
  size = 48,
  off = false,
  dot = true,
  className = "",
  style,
}: {
  p: Person;
  size?: number;
  off?: boolean;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const lead = groupOf(p) === "lead";
  const on = p.onShift && !off;
  return (
    <span
      className={`relative grid shrink-0 place-items-center font-semibold ${on ? (lead ? "bg-[#17181c] text-white [[data-scheme=dark]_&]:bg-[#3a3c44]" : "blue-grad") : "bg-g-fill text-g-muted"} ${on ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_-10px_rgba(11,11,15,0.55)]" : ""} ${off ? "opacity-50" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        fontSize: Math.round(size * 0.38),
        ...style,
      }}
    >
      <PersonPic p={p} />
      {dot && on && (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[var(--g-bg)] bg-[#22c55e]" />
      )}
    </span>
  );
}

/* ------------------------------------------------------------ Demo numbers */

export type StaffStats = {
  level: number;
  xp: number;
  next: number;
  since?: string;
  rating: number;
  hoursWeek: number;
  shiftsWeek: number;
  late: number;
  checklist: [number, number];
  today: { label: string; value: string }[];
  quests: { title: string; progress: number; goal: number; reward: string }[];
  badges: string[];
};

const seed = (id: string) =>
  [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);

/** Steady demo numbers per person and kind of work. */
export function staffStats(p: Person): StaffStats {
  const s = seed(p.id);
  const g = groupOf(p);
  const level = 3 + (s % 7);
  const next = 500 + level * 250;
  const base = {
    level,
    xp: Math.round(next * (0.35 + (s % 50) / 100)),
    next,
    since: p.onShift ? ["09:52", "10:05", "10:30", "11:00"][s % 4] : undefined,
    rating: 4.5 + (s % 5) / 10,
    hoursWeek: 28 + (s % 14),
    shiftsWeek: 4 + (s % 2),
    late: s % 3 === 0 ? 1 : 0,
    checklist: [4 + (s % 5), 10] as [number, number],
  };
  if (g === "hall")
    return {
      ...base,
      today: [
        { label: "Orders", value: String(6 + (s % 9)) },
        { label: "Sales", value: compactMoney(3_200_000 + (s % 40) * 95_000) },
        { label: "Tips", value: compactMoney(120_000 + (s % 30) * 9_000) },
        {
          label: "Average check",
          value: compactMoney(380_000 + (s % 20) * 21_000),
        },
      ],
      quests: [
        { title: "Plov master", progress: 3, goal: 5, reward: "+150 XP" },
        { title: "Sweet finale", progress: 6, goal: 8, reward: "+120 XP" },
      ],
      badges: ["Upsell king", "Lightning"],
    };
  if (g === "lead")
    return {
      ...base,
      today: [
        { label: "Checklists checked", value: "11/23" },
        { label: "Tasks set", value: String(2 + (s % 4)) },
        { label: "Refunds approved", value: String(s % 3) },
        { label: "Team on shift", value: "7/9" },
      ],
      quests: [
        {
          title: "Team goal of the week",
          progress: 69,
          goal: 100,
          reward: "+300 thousand ₫ each",
        },
      ],
      badges: ["Mentor"],
    };
  return {
    ...base,
    today: [
      { label: "Dishes made", value: String(18 + (s % 25)) },
      { label: "Average time, min", value: String(7 + (s % 6)) },
      { label: "Late tickets", value: String(s % 3) },
      { label: "Stop-list marks", value: String(s % 4) },
    ],
    quests: [
      {
        title: g === "bar" ? "Lemonade week" : "Shashlik Sunday",
        progress: 4 + (s % 5),
        goal: 10,
        reward: "+200 XP",
      },
    ],
    badges: g === "bar" ? ["Mixologist"] : ["Clean station", "No returns"],
  };
}

/* --------------------------------------------------------- On-shift field */

/** Hex positions in rings around the middle (axial coordinates), nearest first. */
function hexRings(n: number) {
  const out: { q: number; r: number }[] = [{ q: 0, r: 0 }];
  const dirs = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  for (let k = 1; out.length < n; k++) {
    let q = -k,
      r = k;
    for (const [dq, dr] of dirs)
      for (let i = 0; i < k && out.length < n; i++) {
        out.push({ q, r });
        q += dq!;
        r += dr!;
      }
  }
  return out;
}

/**
 * The team as round faces on a honeycomb, like the Apple Watch home screen:
 * drag it any way, it glides on and settles; faces shrink and fade towards
 * the edges, the one in the middle is named under the field. Tap a face to
 * open the person. Only transform and opacity change, set straight on the
 * nodes in one animation frame, so it stays smooth.
 */
export function OnShiftGrid({
  team,
  onOpen,
}: {
  team: Person[];
  onOpen: (id: string) => void;
}) {
  const tr = useTr();
  const people = useMemo(() => {
    const on = team.filter((p) => p.onShift);
    const lead = on.filter((p) => groupOf(p) === "lead");
    return [
      ...lead,
      ...on.filter((p) => !lead.includes(p)),
      ...team.filter((p) => !p.onShift),
    ];
  }, [team]);
  const B = 46; // face size
  const S = 56; // distance between neighbours
  const spots = useMemo(
    () =>
      hexRings(people.length).map(({ q, r }) => ({
        x: S * (q + r / 2),
        y: S * r * 0.866,
      })),
    [people.length],
  );
  const field = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const caption = useRef<HTMLSpanElement>(null);
  const st = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    drag: false,
    moved: 0,
    px: 0,
    py: 0,
    t: 0,
    raf: 0,
  });
  const reach = useMemo(
    () => Math.max(S, ...spots.map((p) => Math.hypot(p.x, p.y))),
    [spots],
  );

  const paint = useCallback(() => {
    const el = field.current;
    if (!el) return;
    const w = el.clientWidth / 2,
      h = el.clientHeight / 2;
    const s = st.current;
    let best = -1,
      bestD = Infinity;
    spots.forEach((p, i) => {
      const n = nodes.current[i];
      if (!n) return;
      const x = p.x + s.x,
        y = p.y + s.y;
      // Fisheye: full size in the middle, smaller and fainter towards the edges.
      const d = Math.hypot(x / w, y / h);
      const k = Math.max(0.35, Math.min(1, 1.18 - d * 0.62));
      n.style.transform = `translate(${x - B / 2}px, ${y - B / 2}px) scale(${k.toFixed(3)})`;
      n.style.opacity = String(Math.max(0, Math.min(1, 1.6 - d)).toFixed(3));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const p = people[best];
    if (caption.current && p)
      caption.current.textContent = `${p.name} · ${p.onShift ? tr(GROUP_NAMES[groupOf(p)]) : tr("Day off")}`;
  }, [spots, people, tr]);

  // Glide after release, then settle back inside the honeycomb.
  const glide = useCallback(() => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    const step = () => {
      s.vx *= 0.92;
      s.vy *= 0.92;
      s.x += s.vx;
      s.y += s.vy;
      const lim = reach * 0.4;
      const r = Math.hypot(s.x, s.y);
      if (r > lim) {
        const pull = ((r - lim) / r) * 0.18;
        s.x -= s.x * pull;
        s.y -= s.y * pull;
      }
      paint();
      if (Math.abs(s.vx) + Math.abs(s.vy) > 0.05 || r > lim + 0.5)
        s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }, [paint, reach]);

  useEffect(() => {
    paint();
    const el = field.current;
    if (!el) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(el);
    const s = st.current;
    return () => {
      ro.disconnect();
      cancelAnimationFrame(s.raf);
    };
  }, [paint]);

  const down = (e: React.PointerEvent) => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    Object.assign(s, {
      drag: true,
      moved: 0,
      px: e.clientX,
      py: e.clientY,
      t: e.timeStamp,
      vx: 0,
      vy: 0,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.px,
      dy = e.clientY - s.py;
    const dt = Math.max(1, e.timeStamp - s.t);
    s.moved += Math.abs(dx) + Math.abs(dy);
    // Past the edge it follows the finger at half speed (rubber band).
    const r = Math.hypot(s.x, s.y);
    const f = r > reach * 0.4 ? 0.45 : 1;
    s.x += dx * f;
    s.y += dy * f;
    s.vx = (dx / dt) * 16 * f;
    s.vy = (dy / dt) * 16 * f;
    s.px = e.clientX;
    s.py = e.clientY;
    s.t = e.timeStamp;
    paint();
  };
  const up = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    if (s.moved < 6) {
      // A tap: open the face under the finger.
      const hit = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((n) => (n as HTMLElement).dataset?.person);
      const id = (hit as HTMLElement | undefined)?.dataset.person;
      if (id) {
        haptic("light");
        onOpen(id);
      }
      return;
    }
    glide();
  };

  return (
    <div>
      <div
        ref={field}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative h-[196px] cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing [mask-image:radial-gradient(ellipse_at_center,#000_55%,transparent_96%)]"
      >
        <div className="absolute top-1/2 left-1/2">
          {people.map((p, i) => (
            <button
              key={p.id}
              ref={(n) => {
                nodes.current[i] = n;
              }}
              type="button"
              data-person={p.id}
              aria-label={`${p.name} @${p.handle}`}
              onKeyDown={(e) => e.key === "Enter" && onOpen(p.id)}
              onClick={(e) => e.detail === 0 && onOpen(p.id)}
              className="absolute top-0 left-0 will-change-transform"
              style={{ width: B, height: B }}
            >
              <span
                className="block size-full animate-[bubble-in_0.6s_cubic-bezier(0.22,1,0.36,1)_both]"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <Face
                  p={p}
                  size={B}
                  off={!p.onShift}
                  className="pointer-events-none"
                />
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-center text-[13px] text-g-muted">
        <span ref={caption} className="font-medium text-g-ink-2" />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Person page */

/** The face inside a thin ring that fills with XP towards the next level. */
function LevelRing({
  p,
  st,
  off,
}: {
  p: Person;
  st: StaffStats;
  off: boolean;
}) {
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative grid size-[100px] place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--g-line)"
          strokeWidth="3.5"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--g-blue)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - st.xp / st.next)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <Face p={p} size={78} off={off} dot={false} />
      <span className="blue-grad absolute -bottom-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-2 ring-[var(--g-bg)]">
        {st.level}
      </span>
    </span>
  );
}

/** Small grey caption over a group, like iOS settings. */
function Caption({
  children,
  aside,
}: {
  children: string;
  aside?: React.ReactNode;
}) {
  return (
    <p className="mt-6 mb-2 flex items-baseline justify-between px-1 text-[12.5px] font-semibold tracking-[0.04em] text-g-muted uppercase">
      {children}
      {aside}
    </p>
  );
}

/** Numbers in one card, split by hairlines, the figure over its label. */
function Figures({
  items,
  cols,
}: {
  items: { label: string; value: React.ReactNode }[];
  cols: 2 | 4;
}) {
  return (
    <div
      className={`grid gap-px overflow-hidden rounded-[22px] bg-g-line ${cols === 4 ? "grid-cols-4" : "grid-cols-2"}`}
    >
      {items.map((x) => (
        <div
          key={x.label}
          className={`min-w-0 bg-g-fill ${cols === 4 ? "px-2 py-3 text-center" : "px-4 py-3.5"}`}
        >
          <p
            className={`flex items-center gap-1 leading-tight font-bold tracking-[-0.02em] tabular-nums ${cols === 4 ? "justify-center text-[17px]" : "text-[21px]"}`}
          >
            {x.value}
          </p>
          <p
            className={`mt-0.5 truncate text-g-muted ${cols === 4 ? "text-[11px]" : "text-[12.5px]"}`}
          >
            {x.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Everything about one person: level, today, the week, quests, badges; write, edit. */
export function PersonPage({
  p,
  disabled,
  onClose,
  onEdit,
  onWrite,
  self,
}: {
  p: Person;
  disabled: boolean;
  onClose: () => void;
  onEdit: () => void;
  onWrite: () => void;
  self: boolean;
}) {
  const tr = useTr();
  const st = staffStats(p);
  const roles = [
    ...p.roles.map((r) => tr(ROLE_NAMES[r])),
    ...p.stations.map((s) => tr(STATION_NAMES[s])),
  ].join(" · ");
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={p.name}
      title={false}
      footer={
        <div className="mx-auto flex max-w-[520px] gap-2">
          {!self && (
            <button
              type="button"
              onClick={onWrite}
              className="blue-grad press flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
            >
              <Send size={16} strokeWidth={2.2} /> {tr("Write")}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="press h-12 flex-1 rounded-full bg-g-fill text-[15px] font-semibold"
          >
            {tr("Edit")}
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-[520px] px-5 pt-1 pb-10">
        {/* Who: the face in its level ring, the name, the @ID and the work, where they are now. */}
        <div className="flex flex-col items-center text-center">
          <LevelRing p={p} st={st} off={disabled} />
          <h2 className="mt-3 text-[24px] leading-tight font-bold tracking-[-0.02em]">
            {p.name}
          </h2>
          <p className="mt-0.5 text-[13.5px] text-g-muted">
            <span className="font-semibold text-g-blue">@{p.handle}</span> ·{" "}
            {roles}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-g-ink-2">
            <span
              className={`size-1.5 rounded-full ${disabled ? "bg-[#e5484d]" : p.onShift ? "bg-[#22c55e]" : "bg-g-faint"}`}
            />
            {disabled
              ? tr("Access is off")
              : st.since
                ? tr("On shift since {t}", { t: st.since })
                : tr("Off today")}
            <span className="text-g-faint">·</span>
            <span className="text-g-muted">
              {tr("{n} XP to level {l}", {
                n: (st.next - st.xp).toLocaleString("ru-RU"),
                l: st.level + 1,
              })}
            </span>
          </p>
        </div>

        <Caption>{tr("Today")}</Caption>
        <Figures
          cols={2}
          items={st.today.map((x) => ({ label: tr(x.label), value: x.value }))}
        />

        <Caption>{tr("This week")}</Caption>
        <Figures
          cols={4}
          items={[
            { label: tr("Hours"), value: st.hoursWeek },
            { label: tr("Shifts"), value: st.shiftsWeek },
            {
              label: tr("Late"),
              value: (
                <span className={st.late ? "text-g-orange" : ""}>
                  {st.late}
                </span>
              ),
            },
            {
              label: tr("Rating"),
              value: (
                <>
                  {st.rating.toFixed(1)}
                  <Star
                    size={12}
                    className="fill-current text-[#f5a524]"
                    strokeWidth={0}
                  />
                </>
              ),
            },
          ]}
        />

        <Caption
          aside={
            <span className="normal-case tracking-normal">
              {tr("Checklist")} {st.checklist[0]}/{st.checklist[1]}
            </span>
          }
        >
          {tr("Quests")}
        </Caption>
        <div className="divide-y divide-g-line rounded-[22px] bg-g-fill px-4">
          {st.quests.map((q) => (
            <div key={q.title} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[14.5px] font-semibold">
                  {tr(q.title)}
                </p>
                <p className="shrink-0 text-[12.5px] text-g-muted tabular-nums">
                  {q.progress}/{q.goal} ·{" "}
                  <span className="font-semibold text-g-blue">
                    {tr(q.reward)}
                  </span>
                </p>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-g-card">
                <div
                  className="h-full rounded-full bg-g-blue transition-[width] duration-700"
                  style={{ width: `${(q.progress / q.goal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Caption>{tr("Badges")}</Caption>
        <div className="flex flex-wrap gap-1.5">
          {st.badges.map((b) => (
            <span
              key={b}
              className="rounded-full bg-g-fill px-3 py-1.5 text-[13px] font-medium"
            >
              {tr(b)}
            </span>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------- Edit page */

const ALL_STATIONS: Station[] = [
  "hall",
  "bar",
  "hot",
  "cold",
  "grill",
  "pastry",
  "hookah",
];

/** Name, roles, stations, rights and access, grouped like iOS settings; removing asks once more and keeps their history. */
export function PersonEdit({
  p,
  disabled,
  onClose,
  onChange,
  onDisabled,
  onRemove,
}: {
  p: Person;
  disabled: boolean;
  onClose: () => void;
  onChange: (p: Person) => void;
  onDisabled: (off: boolean) => void;
  onRemove: () => void;
}) {
  const tr = useTr();
  const [confirm, setConfirm] = useState(false);
  const perms = [...new Set(p.roles.flatMap((r) => ROLE_PERMISSIONS[r]))];
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const chip = (on: boolean) =>
    `press h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${on ? "blue-grad" : "bg-g-card text-g-ink-2"}`;
  return (
    <Sheet open wide onClose={onClose} label={tr("Edit")} title={false}>
      <div className="mx-auto max-w-[520px] px-5 pt-1 pb-10">
        <div className="flex items-center gap-3.5">
          <Face p={p} size={56} off={disabled} dot={false} />
          <div className="min-w-0">
            <h2 className="truncate text-[22px] leading-tight font-bold tracking-[-0.02em]">
              {p.name}
            </h2>
            <p className="truncate text-[13px] text-g-muted">
              @{p.handle} · {tr("the @ID is chosen by the person")}
            </p>
          </div>
        </div>

        <Caption>{tr("Profile")}</Caption>
        <label className="flex h-12 items-center gap-3 rounded-full bg-g-fill px-5">
          <span className="w-16 shrink-0 text-[14px] text-g-muted">
            {tr("Name")}
          </span>
          <input
            value={p.name}
            maxLength={40}
            onChange={(e) => onChange({ ...p, name: e.target.value })}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
          />
        </label>

        <Caption>{tr("Roles")}</Caption>
        <div className="flex flex-wrap gap-1.5 rounded-[22px] bg-g-fill p-2.5">
          {(Object.keys(ROLE_NAMES) as StaffRole[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={p.roles.includes(r)}
              onClick={() => {
                haptic("tick");
                const roles = toggle(p.roles, r);
                if (roles.length) onChange({ ...p, roles });
              }}
              className={chip(p.roles.includes(r))}
            >
              {tr(ROLE_NAMES[r])}
            </button>
          ))}
        </div>

        <Caption>{tr("Stations")}</Caption>
        <div className="flex flex-wrap gap-1.5 rounded-[22px] bg-g-fill p-2.5">
          {ALL_STATIONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={p.stations.includes(s)}
              onClick={() => (
                haptic("tick"),
                onChange({ ...p, stations: toggle(p.stations, s) })
              )}
              className={chip(p.stations.includes(s))}
            >
              {tr(STATION_NAMES[s])}
            </button>
          ))}
        </div>

        <Caption>{tr("Can")}</Caption>
        <div className="divide-y divide-g-line rounded-[22px] bg-g-fill px-4">
          {perms.map((pm) => (
            <p
              key={pm}
              className="flex items-center gap-2.5 py-2.5 text-[14px]"
            >
              <Check
                size={15}
                strokeWidth={2.6}
                className="shrink-0 text-g-green"
              />
              {tr(PERM_NAMES[pm as Permission])}
            </p>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-[12px] text-g-muted">
          {tr("Rights add up across roles and are checked on the server.")}
        </p>

        <Caption>{tr("Access")}</Caption>
        <div className="flex items-center gap-3 rounded-full bg-g-fill py-2 pr-2 pl-5">
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold">
              {tr("Can sign in")}
            </span>
            <span className="block truncate text-[12px] text-g-muted">
              {disabled
                ? tr("Off: the app is closed for them, history stays")
                : tr("On: works in the app by role")}
            </span>
          </span>
          <Switch
            on={!disabled}
            onChange={(v) => onDisabled(!v)}
            label={tr("Can sign in")}
          />
        </div>

        {confirm ? (
          <div className="animate-rise mt-5 rounded-[22px] bg-[#e5484d]/10 p-4">
            <p className="text-[15px] font-semibold">
              {tr("Remove {n} from the team?", { n: p.name })}
            </p>
            <p className="mt-1 text-[12.5px] text-g-muted">
              {tr(
                "Orders, tips and payroll history stay in reports. The @ID is freed in 30 days.",
              )}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="press h-10 flex-1 rounded-full bg-g-card text-[14px] font-semibold"
              >
                {tr("Cancel")}
              </button>
              <button
                type="button"
                onClick={() => (haptic("success"), onRemove())}
                className="press h-10 flex-1 rounded-full bg-[#e5484d] text-[14px] font-semibold text-white"
              >
                {tr("Remove")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (haptic("light"), setConfirm(true))}
            className="press mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold text-[#e5484d]"
          >
            <Trash2 size={16} strokeWidth={2.2} /> {tr("Remove from the team")}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** One row in the team list: face, name and @ID, roles, and where they are now. */
export function PersonRow({
  p,
  disabled,
  onOpen,
}: {
  p: Person;
  disabled: boolean;
  onOpen: () => void;
}) {
  const tr = useTr();
  const st = staffStats(p);
  const status = disabled
    ? tr("Access off")
    : st.since
      ? tr("since {t}", { t: st.since })
      : tr("Day off");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="press flex w-full items-center gap-3 rounded-full py-2 pr-3 pl-2 text-left"
    >
      <Face p={p} size={44} off={disabled} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="shrink-0 text-[15px] font-semibold">{p.name}</span>
          <span className="truncate text-[13px] text-g-blue">@{p.handle}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-g-muted">
          <span
            className={`font-medium ${disabled ? "text-[#e5484d]" : p.onShift ? "text-g-green" : ""}`}
          >
            {status}
          </span>
          {" · "}
          {[
            ...p.roles.map((r) => tr(ROLE_NAMES[r])),
            ...p.stations.map((s) => tr(STATION_NAMES[s])),
          ].join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-[12px] font-medium text-g-faint tabular-nums">
        {tr("Lv {n}", { n: st.level })}
      </span>
      <ChevronRight size={17} className="shrink-0 text-g-faint" />
    </button>
  );
}
