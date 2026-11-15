"use client";

import {
  Check,
  ChevronRight,
  MousePointer2,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import {
  ROLE_PERMISSIONS,
  type Permission,
  type Person,
  type StaffRole,
  type Station,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { Field, Switch, TextField } from "@/components/system/Kit";
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

/** A person's face: a rounded square with continuous corners, like the reference tiles. Initials until photos come. */
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
        borderRadius: Math.round(size * 0.3),
        fontSize: Math.round(size * 0.38),
        ...style,
      }}
    >
      {p.name.slice(0, 1)}
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

/* --------------------------------------------------------- On-shift grid */

type Slot = { row: number; col: number; x: number; d: number };

/**
 * The team as rounded squares on a soft honeycomb of empty dashed slots:
 * the venue in the middle, people on shift around it, people off today
 * faded further out. Two dark pointer labels name the manager on shift and
 * today's best. Tap a face to open the person.
 */
export function OnShiftGrid({
  team,
  venue,
  onOpen,
  best,
}: {
  team: Person[];
  venue: string;
  onOpen: (id: string) => void;
  best?: string;
}) {
  const tr = useTr();
  const cols = 7;
  const people = [...team].sort(
    (a, b) => Number(!!b.onShift) - Number(!!a.onShift),
  );
  // Rows grow in odd numbers so the venue stays in the middle; always some empty slots around the team.
  let rows = 3;
  while (rows * cols < people.length + 1 + 6) rows += 2;
  const mid = Math.floor(rows / 2);
  const slots: Slot[] = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = col + ((row - mid) % 2 ? 0.5 : 0);
      slots.push({
        row,
        col,
        x,
        d: Math.hypot(x - (cols - 1) / 2, (row - mid) * 0.95),
      });
    }
  slots.sort((a, b) => a.d - b.d);
  const [center, ...ring] = slots;
  // The manager on shift sits above the middle, today's best below it: their labels go above and below the grid.
  const lead = people.find((p) => p.onShift && groupOf(p) === "lead");
  const top = people.find((p) => p.id === best);
  const placed = new Map<string, Slot>();
  const free = [...ring];
  const take = (pred: (s: Slot) => boolean) => {
    const i = free.findIndex(pred);
    return i >= 0 ? free.splice(i, 1)[0] : undefined;
  };
  if (lead) placed.set(lead.id, take((s) => s.row === 0)!);
  if (top && top.id !== lead?.id)
    placed.set(top.id, take((s) => s.row === rows - 1)!);
  for (const p of people)
    if (!placed.has(p.id)) placed.set(p.id, free.shift()!);
  const W = cols + 0.5;
  const pos = (s: Slot): CSSProperties => ({
    left: `${((s.x + 0.08) / W) * 100}%`,
    top: `${((s.row + 0.08) / rows) * 100}%`,
    width: `${(0.84 / W) * 100}%`,
  });
  const label = (p: Person | undefined, text: string, above: boolean) => {
    const s = p && placed.get(p.id);
    if (!p || !s) return null;
    return (
      <button
        type="button"
        onClick={() => (haptic("light"), onOpen(p.id))}
        className={`press absolute z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap ${above ? "-translate-y-full flex-col-reverse" : "flex-col"}`}
        style={{
          left: `${((s.x + 0.5) / W) * 100}%`,
          top: `${((s.row + (above ? 0 : 1)) / rows) * 100}%`,
        }}
      >
        <MousePointer2
          size={14}
          strokeWidth={0}
          fill="currentColor"
          className={`text-[#3a3c42] ${above ? "rotate-180" : ""}`}
        />
        <span className="rounded-full bg-[#3a3c42] px-3 py-1.5 text-[12.5px] font-semibold text-white">
          {text}
        </span>
      </button>
    );
  };
  return (
    <div className="relative mx-auto w-full max-w-[420px] py-10">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${W} / ${rows}` }}
      >
        {/* Empty slots, fading out towards the edges. */}
        <div
          aria-hidden
          className="absolute inset-0 [mask-image:radial-gradient(closest-side,#000_55%,transparent)]"
        >
          {free.map((s) => (
            <span
              key={`${s.row}-${s.col}`}
              className="absolute aspect-square rounded-[30%] border border-dashed border-g-faint/40 [background:repeating-linear-gradient(135deg,rgba(128,130,140,0.12)_0_1px,transparent_1px_7px)]"
              style={pos(s)}
            />
          ))}
        </div>
        <span
          className="absolute grid aspect-square place-items-center rounded-[30%] bg-g-card text-[22px] font-bold text-g-ink shadow-[0_0_0_1px_var(--g-line),0_10px_24px_-14px_rgba(11,11,15,0.45)]"
          style={pos(center)}
        >
          {venue.slice(0, 1)}
        </span>
        {people.map((p) => {
          const s = placed.get(p.id)!;
          return (
            <button
              key={p.id}
              type="button"
              aria-label={`${p.name} @${p.handle}`}
              onClick={() => (haptic("light"), onOpen(p.id))}
              className="press absolute aspect-square [container-type:inline-size]"
              style={pos(s)}
            >
              <Face
                p={p}
                size={0}
                off={!p.onShift}
                className="!size-full !text-[38cqw]"
                style={{ borderRadius: "30%" }}
              />
            </button>
          );
        })}
        {label(
          lead,
          `${lead?.name} · ${tr(ROLE_NAMES[lead?.roles[0] ?? "admin"])}`,
          true,
        )}
        {top &&
          top.id !== lead?.id &&
          label(top, `${top.name} · ${tr("best today")}`, false)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Person page */

/** Everything about one person: level and XP, today's numbers, the week, quests, badges; write, edit. */
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
        <div className="flex gap-2.5">
          {!self && (
            <button
              type="button"
              onClick={onWrite}
              className="blue-grad press flex h-13 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
            >
              <Send size={17} strokeWidth={2.2} />{" "}
              {tr("Write to @{h}", { h: p.handle })}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className={`press h-13 rounded-full bg-g-fill px-6 text-[15px] font-semibold ${self ? "flex-1" : ""}`}
          >
            {tr("Edit")}
          </button>
        </div>
      }
    >
      <div className="px-5 pt-1 pb-10">
        <div className="flex items-center gap-4">
          <Face p={p} size={72} off={disabled} />
          <div className="min-w-0">
            <h2 className="truncate text-[26px] leading-tight font-bold tracking-[-0.02em]">
              {p.name}
            </h2>
            <p className="truncate text-[14px] text-g-muted">
              <span className="font-semibold text-g-blue">@{p.handle}</span> ·{" "}
              {roles}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-g-muted">
              <span
                className={`size-1.5 rounded-full ${disabled ? "bg-[#e5484d]" : p.onShift ? "bg-[#22c55e]" : "bg-g-faint"}`}
              />
              {disabled
                ? tr("Access is off")
                : st.since
                  ? tr("On shift since {t}", { t: st.since })
                  : tr("Off today")}
            </p>
          </div>
        </div>

        {/* Level: the number, the XP bar, what is left. */}
        <div className="mt-6 rounded-[24px] bg-g-fill p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[17px] font-bold">
              {tr("Level {n}", { n: st.level })}
            </p>
            <p className="text-[13px] text-g-muted tabular-nums">
              {st.xp.toLocaleString("ru-RU")} /{" "}
              {st.next.toLocaleString("ru-RU")} XP
            </p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-g-card">
            <div
              className="blue-grad h-full rounded-full"
              style={{ width: `${(st.xp / st.next) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[12.5px] text-g-muted">
            {tr("{n} XP to level {l}", {
              n: (st.next - st.xp).toLocaleString("ru-RU"),
              l: st.level + 1,
            })}
          </p>
        </div>

        <Heading>{tr("Today")}</Heading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {st.today.map((x) => (
            <Stat key={x.label} label={tr(x.label)} value={x.value} />
          ))}
        </div>

        <Heading>{tr("This week")}</Heading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={tr("Hours")} value={String(st.hoursWeek)} />
          <Stat label={tr("Shifts")} value={String(st.shiftsWeek)} />
          <Stat
            label={tr("Late")}
            value={String(st.late)}
            tone={st.late ? "text-g-orange" : undefined}
          />
          <Stat
            label={tr("Guest rating")}
            value={st.rating.toFixed(1)}
            icon={
              <Star
                size={14}
                className="fill-current text-[#f5a524]"
                strokeWidth={0}
              />
            }
          />
        </div>

        <Heading>{tr("Quests")}</Heading>
        <div className="grid gap-2">
          {st.quests.map((q) => (
            <div key={q.title} className="rounded-[22px] bg-g-fill px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] font-semibold">
                  {tr(q.title)}
                </p>
                <p className="shrink-0 text-[13px] font-semibold text-g-ink-2 tabular-nums">
                  {q.progress}/{q.goal}
                </p>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-g-card">
                <div
                  className="h-full rounded-full bg-g-blue"
                  style={{ width: `${(q.progress / q.goal) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] font-medium text-g-blue">
                {tr(q.reward)}
              </p>
            </div>
          ))}
        </div>

        <Heading>{tr("Badges and checklist")}</Heading>
        <div className="flex flex-wrap gap-2">
          {st.badges.map((b) => (
            <span
              key={b}
              className="rounded-full bg-g-fill px-3.5 py-2 text-[13.5px] font-semibold"
            >
              {tr(b)}
            </span>
          ))}
          <span className="rounded-full bg-g-fill px-3.5 py-2 text-[13.5px] text-g-muted">
            {tr("Checklist")}{" "}
            <b className="font-semibold text-g-ink tabular-nums">
              {st.checklist[0]}/{st.checklist[1]}
            </b>
          </span>
        </div>
      </div>
    </Sheet>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <h3 className="mt-7 mb-2.5 text-[17px] font-bold tracking-[-0.01em]">
      {children}
    </h3>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[22px] bg-g-fill px-4 py-3">
      <p className="truncate text-[12.5px] text-g-muted">{label}</p>
      <p
        className={`mt-0.5 flex items-center gap-1 text-[20px] leading-tight font-bold tracking-[-0.02em] tabular-nums ${tone ?? ""}`}
      >
        {value}
        {icon}
      </p>
    </div>
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

/** Roles, stations and access for one person; removing asks once more and keeps their history. */
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
    `press h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "blue-grad" : "bg-g-fill text-g-ink-2"}`;
  return (
    <Sheet open wide onClose={onClose} label={tr("Edit")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
          {p.name}
        </h2>
        <p className="mt-0.5 text-[14px] text-g-muted">
          @{p.handle} · {tr("the @ID is chosen by the person")}
        </p>

        <div className="mt-6">
          <Field label={tr("Name")}>
            <TextField
              value={p.name}
              onChange={(v) => onChange({ ...p, name: v })}
              maxLength={40}
            />
          </Field>
        </div>

        <Heading>{tr("Roles")}</Heading>
        <div className="flex flex-wrap gap-2">
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

        <Heading>{tr("Stations")}</Heading>
        <div className="flex flex-wrap gap-2">
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

        <Heading>{tr("Can")}</Heading>
        <div className="rounded-[24px] bg-g-fill p-1.5">
          {perms.map((pm) => (
            <p
              key={pm}
              className="flex items-center gap-3 rounded-full px-3 py-2 text-[14.5px]"
            >
              <Check
                size={16}
                strokeWidth={2.6}
                className="shrink-0 text-g-green"
              />
              {tr(PERM_NAMES[pm as Permission])}
            </p>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12.5px] text-g-muted">
          {tr("Rights add up across roles and are checked on the server.")}
        </p>

        <Heading>{tr("Access")}</Heading>
        <div className="flex items-center gap-3 rounded-full bg-g-fill py-2 pr-2 pl-5">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">
              {tr("Can sign in")}
            </span>
            <span className="block truncate text-[12.5px] text-g-muted">
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
          <div className="mt-4 rounded-[24px] bg-[#e5484d]/10 p-4">
            <p className="text-[15px] font-semibold">
              {tr("Remove {n} from the team?", { n: p.name })}
            </p>
            <p className="mt-1 text-[13px] text-g-muted">
              {tr(
                "Orders, tips and payroll history stay in reports. The @ID is freed in 30 days.",
              )}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="press h-11 flex-1 rounded-full bg-g-card text-[14px] font-semibold"
              >
                {tr("Cancel")}
              </button>
              <button
                type="button"
                onClick={() => (haptic("success"), onRemove())}
                className="press h-11 flex-1 rounded-full bg-[#e5484d] text-[14px] font-semibold text-white"
              >
                {tr("Remove")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (haptic("light"), setConfirm(true))}
            className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-[#e5484d]"
          >
            <Trash2 size={17} strokeWidth={2.2} /> {tr("Remove from the team")}
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
