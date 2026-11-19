"use client";

import {
  AlertTriangle,
  Ban,
  Check,
  Coins,
  FileText,
  Lock,
  MessageSquare,
  Plus,
  Repeat,
  Send,
  ShieldCheck,
  Stethoscope,
  Sun,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import type { Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import {
  hrStore,
  invitesStore,
  joinStore,
  overridesStore,
  PERMS,
  requestsStore,
  rolesStore,
  type HR,
  type LedgerRow,
  type Request,
  type RoleDef,
} from "@/lib/demo-hr";
import { Sheet } from "@/components/guest/ui";
import { PersonPic } from "@/components/system/PersonPic";
import { Switch } from "@/components/system/Kit";
import { compactMoney } from "@/components/crew/CrewApp";
import { useTr } from "@/components/crew/prefs";
import { JoinRequests, useRoleNames } from "./TeamInvite";
import {
  DocSheet,
  ExtrasChips,
  monthOf,
  PAY,
  PayEdit,
} from "./TeamDocsPay";

/*
 * Team in depth (docs/11, docs/07 §91). The Team section gets four tabs:
 * Departments (the cards), Requests (time off, sick days, swaps; invitations
 * and onboarding), Access (what each role may do, own roles), Documents
 * (expiring health certificates, contracts, work permits). Each person gets
 * an HR page: pay terms and their history, advances / bonuses / fines,
 * vacation balance, documents, onboarding, 1:1 notes, and letting go.
 */

type Tab = "groups" | "requests" | "access" | "docs";
/** Demo dates ("Sat 21 Nov", "yesterday", "Jan 2025") in the reader's language. */
const dt = (tr: (s: string) => string, s: string) =>
  s.replace(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun|today|yesterday)\b/g,
    (m) => tr(m),
  );
const seg = (on: boolean) =>
  `h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`;
const KIND: Record<
  Request["kind"],
  { label: string; icon: typeof Sun; cls: string }
> = {
  vacation: { label: "Vacation", icon: Sun, cls: "chip-blue" },
  sick: { label: "Sick day", icon: Stethoscope, cls: "chip-red" },
  swap: { label: "Shift swap", icon: Repeat, cls: "chip-teal" },
  dayoff: { label: "Day off", icon: Sun, cls: "chip-orange" },
};

function Face({ p, size = 40 }: { p?: Person; size?: number }) {
  if (!p) return null;
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-g-card font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      <PersonPic p={p} />
    </span>
  );
}

export function TeamTabs({
  team,
  groups,
  notify,
  onInvite,
  onPerson,
}: {
  team: Person[];
  groups: ReactNode;
  notify: (t: string) => void;
  onInvite: () => void;
  onPerson: (id: string) => void;
}) {
  const tr = useTr();
  const [tab, setTab] = useState<Tab>("groups");
  const reqs = requestsStore.use();
  const hr = hrStore.use();
  const joins = joinStore.use();
  const newReqs =
    reqs.filter((r) => r.status === "new").length +
    joins.filter((j) => j.status === "new").length;
  const docIssues = Object.values(hr)
    .flatMap((h) => h.docs)
    .filter(
      (d) =>
        d.kind !== "Passport or ID" &&
        (d.daysLeft === undefined || d.daysLeft < 30),
    ).length;
  return (
    <div className="grid gap-5">
      <div className="no-scrollbar -mx-5 flex overflow-x-auto px-5">
        <div className="flex rounded-full bg-g-fill p-1">
          {(
            [
              ["groups", tr("Departments"), 0],
              ["requests", tr("Requests"), newReqs],
              ["access", tr("Access"), 0],
              ["docs", tr("Documents"), docIssues],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => (haptic("tick"), setTab(id))}
              className={`${seg(tab === id)} flex items-center gap-1.5`}
            >
              {label}
              {n > 0 && (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-g-orange px-1 text-[10.5px] font-bold text-white tabular-nums">
                  {n}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div key={tab} className="animate-rise grid gap-4">
        {tab === "groups" && groups}
        {tab === "requests" && (
          <Requests
            team={team}
            notify={notify}
            onInvite={onInvite}
            onPerson={onPerson}
          />
        )}
        {tab === "access" && <Access team={team} notify={notify} />}
        {tab === "docs" && (
          <Docs team={team} notify={notify} onPerson={onPerson} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Requests */

function Requests({
  team,
  notify,
  onInvite,
  onPerson,
}: {
  team: Person[];
  notify: (t: string) => void;
  onInvite: () => void;
  onPerson: (id: string) => void;
}) {
  const tr = useTr();
  const reqs = requestsStore.use();
  const invites = invitesStore.use();
  const hr = hrStore.use();
  const who = (id: string) => team.find((p) => p.id === id);
  const decide = (r: Request, ok: boolean) => {
    requestsStore.set(
      reqs.map((x) => (x.id === r.id ? { ...x, status: ok ? "ok" : "no" } : x)),
    );
    if (ok && r.kind === "vacation" && hr[r.person])
      hrStore.set({
        ...hr,
        [r.person]: {
          ...hr[r.person]!,
          vacation: {
            ...hr[r.person]!.vacation,
            used: hr[r.person]!.vacation.used + r.days,
          },
        },
      });
    haptic(ok ? "success" : "light");
    notify(
      ok
        ? tr("Approved · {name} gets a notification", {
            name: who(r.person)?.name ?? "",
          })
        : tr("Declined · {name} gets a notification", {
            name: who(r.person)?.name ?? "",
          }),
    );
  };
  const roleNames = useRoleNames();
  const open = reqs.filter((r) => r.status === "new");
  const done = reqs.filter((r) => r.status !== "new");
  const row = (r: Request) => {
    const p = who(r.person);
    const K = KIND[r.kind];
    const h = hr[r.person];
    return (
      <div key={r.id} className="rounded-[22px] bg-g-fill p-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPerson(r.person)}
            className="press"
          >
            <Face p={p} />
          </button>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">
              {p?.name}
            </span>
            <span className="block truncate text-[12.5px] text-g-muted">
              {dt(tr, r.at)}
            </span>
          </span>
          <span
            className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold ${K.cls}`}
          >
            <K.icon size={13} /> {tr(K.label)}
          </span>
        </div>
        <p className="mt-2.5 text-[15px] font-semibold">{dt(tr, r.when)}</p>
        {r.kind === "swap" && r.with && (
          <p className="mt-1 flex items-center gap-2 text-[13.5px] text-g-muted">
            <Repeat size={14} />{" "}
            {tr("{a} takes it", { a: who(r.with)?.name ?? "" })} ·{" "}
            {tr("agreed")}
          </p>
        )}
        {r.kind === "vacation" && h && (
          <p className="mt-1 text-[13px] text-g-muted">
            {tr("{n} of {m} vacation days left", {
              n: h.vacation.total - h.vacation.used,
              m: h.vacation.total,
            })}
          </p>
        )}
        {r.note && (
          <p className="mt-1 text-[13.5px] text-g-ink-2">«{r.note}»</p>
        )}
        {r.status === "new" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => decide(r, false)}
              className="press h-10 rounded-full bg-g-card text-[14px] font-semibold"
            >
              {tr("Decline")}
            </button>
            <button
              type="button"
              onClick={() => decide(r, true)}
              className="blue-grad press flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold"
            >
              <Check size={15} /> {tr("Approve")}
            </button>
          </div>
        ) : (
          <p
            className={`mt-2 text-[13px] font-semibold ${r.status === "ok" ? "text-g-green" : "text-g-muted"}`}
          >
            {tr(r.status === "ok" ? "Approved" : "Declined")}
          </p>
        )}
      </div>
    );
  };
  return (
    <>
      <JoinRequests notify={notify} />
      {open.length ? (
        <div className="stagger grid gap-2 md:grid-cols-2">{open.map(row)}</div>
      ) : (
        <p className="rounded-[20px] bg-g-fill p-4 text-[14px] text-g-muted">
          {tr("No new requests.")}
        </p>
      )}
      <p className="px-1 text-[12.5px] text-g-muted">
        {tr(
          "People ask from their app. An approved vacation or swap changes the schedule by itself.",
        )}
      </p>

      <div className="mt-2 flex items-center justify-between px-1">
        <h3 className="text-[19px] font-bold tracking-[-0.02em]">
          {tr("Invitations")}
        </h3>
        <button
          type="button"
          onClick={() => (haptic("light"), onInvite())}
          className="press flex h-9 items-center gap-1.5 rounded-full bg-g-fill px-3.5 text-[13.5px] font-semibold"
        >
          <UserPlus size={15} className="text-g-blue" /> {tr("Invite")}
        </button>
      </div>
      <div className="grid gap-2">
        {invites.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-[20px] bg-g-fill p-3"
          >
            <span className="blue-grad grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold">
              {i.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">
                {i.name}
              </span>
              <span className="block truncate text-[12.5px] text-g-muted">
                {roleNames(i.role)} · {i.phone} · {dt(tr, i.sent)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${i.status === "opened" ? "chip-blue" : "chip-gray"}`}
            >
              {tr(i.status === "opened" ? "opened the link" : "sent")}
            </span>
            <button
              type="button"
              aria-label={tr("Send again")}
              onClick={() => (
                haptic("success"),
                notify(tr("Sent again to {p}", { p: i.phone }))
              )}
              className="press grid size-9 shrink-0 place-items-center rounded-full bg-g-card"
            >
              <Send size={15} className="text-g-blue" />
            </button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h3 className="mt-2 px-1 text-[19px] font-bold tracking-[-0.02em]">
            {tr("Earlier")}
          </h3>
          <div className="grid gap-2 opacity-80 md:grid-cols-2">
            {done.map(row)}
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------ Access */

function Access({
  team,
  notify,
}: {
  team: Person[];
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const roles = rolesStore.use();
  const overrides = overridesStore.use();
  const holders = (id: string) =>
    team.filter((p) => (p.roles as string[]).includes(id));
  const exceptions = Object.values(overrides).reduce(
    (n, o) => n + Object.keys(o).length,
    0,
  );
  const [edit, setEdit] = useState<RoleDef | null>(null);
  const groups = [...new Set(PERMS.map((p) => p.group))];
  return (
    <>
      <p className="px-1 text-[13px] text-g-muted">
        {tr(
          "What each role may do. The server checks it on every action, not only the screen. Money actions are marked with a coin.",
        )}
      </p>
      {/* Computers: the whole matrix at once. */}
      <div className="hidden overflow-x-auto rounded-[22px] bg-g-fill p-2 lg:block">
        <table className="w-full border-separate border-spacing-0 text-[13.5px]">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-g-muted uppercase" />
              {roles.map((r) => (
                <th key={r.id} className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => (haptic("light"), setEdit(r))}
                    className="press rounded-full px-2.5 py-1 text-[12.5px] font-bold hover:bg-g-card"
                  >
                    {tr(r.name)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g}>
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="px-3 pt-3 pb-1 text-[11.5px] font-semibold tracking-[0.05em] text-g-muted uppercase"
                  >
                    {tr(g)}
                  </td>
                </tr>
                {PERMS.filter((p) => p.group === g).map((p) => (
                  <tr key={p.id} className="hover:bg-g-card/50">
                    <td className="border-t border-g-line px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {tr(p.label)}{" "}
                        {p.money && (
                          <Coins size={13} className="text-g-orange" />
                        )}
                      </span>
                    </td>
                    {roles.map((r) => (
                      <td
                        key={r.id}
                        className="border-t border-g-line px-2 py-2 text-center"
                      >
                        {r.perms.includes(p.id) ? (
                          <Check
                            size={16}
                            strokeWidth={2.6}
                            className="mx-auto text-g-green"
                          />
                        ) : (
                          <span className="mx-auto block size-1.5 rounded-full bg-g-line" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {exceptions > 0 && (
        <p className="chip-blue flex items-center gap-2 rounded-[18px] px-3.5 py-2.5 text-[13px] font-semibold">
          <ShieldCheck size={15} className="shrink-0" />
          {tr("{n} personal exceptions: see the person's page", {
            n: exceptions,
          })}
        </p>
      )}
      {/* Phones: a card per role, what it may do group by group and who holds it. */}
      <div className="stagger grid gap-2 md:grid-cols-2 lg:hidden">
        {roles.map((r) => {
          const people = holders(r.id);
          const money = PERMS.filter(
            (p) => p.money && r.perms.includes(p.id),
          ).length;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => (haptic("light"), setEdit(r))}
              className="press rounded-[22px] bg-g-fill p-3.5 text-left"
            >
              <span className="flex items-center gap-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${r.id === "owner" ? "chip-orange" : "chip-blue"}`}
                >
                  {r.id === "owner" ? (
                    <Lock size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {tr(r.name)}{" "}
                    {r.custom && (
                      <span className="text-[12px] font-medium text-g-blue">
                        · {tr("own role")}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[12.5px] text-g-muted">
                    {tr("{n} of {m} actions", {
                      n: r.perms.length,
                      m: PERMS.length,
                    })}
                    {money > 0 && (
                      <span className="text-g-orange">
                        {" "}
                        · {tr("{n} with money", { n: money })}
                      </span>
                    )}
                  </span>
                </span>
                {people.length > 0 && (
                  <span className="flex shrink-0 -space-x-2">
                    {people.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="relative grid size-7 place-items-center overflow-hidden rounded-full bg-g-card text-[11px] font-bold ring-2 ring-[var(--g-fill)]"
                      >
                        <PersonPic p={p} />
                      </span>
                    ))}
                    {people.length > 3 && (
                      <span className="relative grid size-7 place-items-center rounded-full bg-g-card text-[11px] font-bold ring-2 ring-[var(--g-fill)]">
                        +{people.length - 3}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span className="mt-3 grid grid-cols-5 gap-1.5">
                {groups.map((g) => {
                  const all = PERMS.filter((p) => p.group === g);
                  const n = all.filter((p) => r.perms.includes(p.id)).length;
                  return (
                    <span key={g} className="min-w-0">
                      <span className="flex h-1.5 gap-0.5">
                        {all.map((p) => (
                          <span
                            key={p.id}
                            className={`flex-1 rounded-full ${r.perms.includes(p.id) ? "bg-g-blue" : "bg-g-line"}`}
                          />
                        ))}
                      </span>
                      <span
                        className={`mt-1 block truncate text-[10.5px] font-semibold ${n ? "text-g-ink-2" : "text-g-faint"}`}
                      >
                        {tr(g)}
                      </span>
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => (
          haptic("light"),
          setEdit({
            id: `role-${roles.length}`,
            name: "",
            perms: ["orders.take"],
            custom: true,
          })
        )}
        className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
      >
        <Plus size={17} className="text-g-blue" /> {tr("Own role")}
      </button>
      {edit && (
        <RoleSheet
          role={edit}
          onClose={() => setEdit(null)}
          onSave={(r) => {
            rolesStore.set(
              roles.some((x) => x.id === r.id)
                ? roles.map((x) => (x.id === r.id ? r : x))
                : [...roles, r],
            );
            haptic("success");
            notify(tr("Saved · works from the next action"));
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

function RoleSheet({
  role,
  onClose,
  onSave,
}: {
  role: RoleDef;
  onClose: () => void;
  onSave: (r: RoleDef) => void;
}) {
  const tr = useTr();
  const [name, setName] = useState(role.name);
  const [perms, setPerms] = useState(role.perms);
  const locked = role.id === "owner";
  const groups = [...new Set(PERMS.map((p) => p.group))];
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr(role.name || "Own role")}
      footer={
        locked ? undefined : (
          <button
            type="button"
            disabled={name.trim().length < 2}
            onClick={() => onSave({ ...role, name: name.trim(), perms })}
            className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
          >
            {tr("Save")}
          </button>
        )
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        {role.custom ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr("Senior waiter")}
            className="h-14 w-full rounded-[20px] bg-g-fill px-4 text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint"
          />
        ) : (
          <h2 className="text-[26px] font-bold tracking-[-0.025em]">
            {tr(role.name)}
          </h2>
        )}
        {locked && (
          <p className="chip-orange rounded-[16px] p-3 text-[13.5px] font-semibold">
            {tr("The owner can do everything; this role cannot be changed.")}
          </p>
        )}
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 px-1 text-[12px] font-semibold tracking-[0.05em] text-g-muted uppercase">
              {tr(g)}
            </p>
            <div className="overflow-hidden rounded-[20px] bg-g-fill">
              {PERMS.filter((p) => p.group === g).map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i ? "border-t border-g-line" : ""}`}
                >
                  <span className="flex items-center gap-1.5 text-[14.5px] font-semibold">
                    {tr(p.label)}{" "}
                    {p.money && <Coins size={13} className="text-g-orange" />}
                  </span>
                  <Switch
                    on={perms.includes(p.id)}
                    onChange={(v) =>
                      !locked &&
                      setPerms(
                        v ? [...perms, p.id] : perms.filter((x) => x !== p.id),
                      )
                    }
                    label={tr(p.label)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ Documents */

function Docs({
  team,
  notify,
  onPerson,
}: {
  team: Person[];
  notify: (t: string) => void;
  onPerson: (id: string) => void;
}) {
  const tr = useTr();
  const hr = hrStore.use();
  const [open, setOpen] = useState<{ id: string; kind: string } | null>(null);
  const rows = Object.entries(hr)
    .flatMap(([id, h]) =>
      h.docs.filter((d) => d.kind !== "Passport or ID").map((d) => ({ id, d })),
    )
    .sort((a, b) => (a.d.daysLeft ?? -999) - (b.d.daysLeft ?? -999));
  return (
    <>
      <p className="px-1 text-[13px] text-g-muted">
        {tr(
          "Expired and missing first. Yan reminds the person 30 days before and the admin on the day.",
        )}
      </p>
      <div className="stagger grid gap-2 md:grid-cols-2">
        {rows.map(({ id, d }) => {
          const p = team.find((x) => x.id === id);
          const st =
            d.daysLeft === undefined
              ? ["chip-gray", tr("not uploaded")]
              : d.daysLeft < 0
                ? ["chip-red", tr("expired {n} days ago", { n: -d.daysLeft })]
                : d.daysLeft < 30
                  ? ["chip-orange", tr("{n} days left", { n: d.daysLeft })]
                  : [
                      "chip-green",
                      tr("until {d}", { d: dt(tr, d.expires ?? "") }),
                    ];
          return (
            <div
              key={id + d.kind}
              className="flex items-center gap-3 rounded-[20px] bg-g-fill p-3"
            >
              <button
                type="button"
                onClick={() => onPerson(id)}
                className="press"
              >
                <Face p={p} />
              </button>
              <button
                type="button"
                onClick={() => (haptic("light"), setOpen({ id, kind: d.kind }))}
                className="press min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[14.5px] font-semibold">
                  {p?.name}
                </span>
                <span className="flex items-center gap-1 truncate text-[12.5px] text-g-muted">
                  {d.file && <FileText size={12} className="shrink-0" />}
                  {tr(d.kind)}
                </span>
              </button>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${st[0]}`}
              >
                {st[1]}
              </span>
              {(d.daysLeft === undefined || d.daysLeft < 30) && (
                <button
                  type="button"
                  aria-label={tr("Remind")}
                  onClick={() => (
                    haptic("success"),
                    notify(tr("Reminder sent to {who}", { who: p?.name ?? "" }))
                  )}
                  className="press grid size-9 shrink-0 place-items-center rounded-full bg-g-card"
                >
                  <Send size={15} className="text-g-blue" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {open &&
        (() => {
          const h = hr[open.id]!;
          const k = h.docs.findIndex((x) => x.kind === open.kind);
          const name = team.find((x) => x.id === open.id)?.name ?? "";
          return (
            <DocSheet
              doc={h.docs[k]}
              name={name}
              taken={h.docs.map((x) => x.kind)}
              notify={notify}
              onClose={() => setOpen(null)}
              onSave={(d) => (
                hrStore.set({
                  ...hr,
                  [open.id]: {
                    ...h,
                    docs: h.docs.map((x, j) => (j === k ? d : x)),
                  },
                }),
                haptic("success"),
                notify(tr("Saved")),
                setOpen(null)
              )}
            />
          );
        })()}
    </>
  );
}

/* ------------------------------------------------------------ HR page */


export function HRPage({
  p,
  onClose,
  notify,
}: {
  p: Person;
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const all = hrStore.use();
  const reqs = requestsStore.use();
  const h: HR = all[p.id] ?? {
    joined: "—",
    pay: "hourly",
    rate: 50_000,
    rates: [],
    ledger: [],
    docs: [],
    vacation: { total: 12, used: 0 },
    notes: [],
  };
  const put = (patch: Partial<HR>) =>
    hrStore.set({ ...all, [p.id]: { ...h, ...patch } });
  const [payEdit, setPayEdit] = useState(false);
  const [entry, setEntry] = useState<LedgerRow["kind"] | null>(null);
  const [note, setNote] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [doc, setDoc] = useState<number | null>(null);
  const left = h.vacation.total - h.vacation.used;
  return (
    <Sheet open wide onClose={onClose} label={tr("Employment")}>
      <div className="grid gap-4 px-5 pt-2 pb-10 md:grid-cols-2 md:items-start">
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <Face p={p} size={56} />
            <div className="min-w-0">
              <h2 className="truncate text-[24px] leading-tight font-bold tracking-[-0.02em]">
                {p.name}
              </h2>
              <p className="text-[13px] text-g-muted">
                {tr("in the team since {d}", { d: dt(tr, h.joined) })}
                {h.probationUntil
                  ? ` · ${tr("probation until {d}", { d: dt(tr, h.probationUntil) })}`
                  : ""}
                {h.left ? ` · ${tr("left {d}", { d: h.left })}` : ""}
              </p>
            </div>
          </div>

          {/* Pay terms and their history. */}
          <section className="rounded-[22px] bg-g-fill p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-g-muted">
                  {tr(PAY[h.pay])}
                </p>
                <p className="live text-[24px] leading-tight font-bold tabular-nums">
                  {compactMoney(h.rate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => (haptic("light"), setPayEdit(true))}
                className="press h-9 rounded-full bg-g-card px-3.5 text-[13px] font-semibold text-g-blue"
              >
                {tr("Change")}
              </button>
            </div>
            <ExtrasChips extras={h.extras} />
            <p className="mt-2 text-[12.5px] text-g-muted">
              {tr("A usual month comes to")}{" "}
              <span className="font-semibold text-g-ink tabular-nums">
                ≈ {compactMoney(monthOf(h.pay, h.rate, h.extras))}
              </span>
            </p>
            {h.rates.length > 1 && (
              <div className="mt-3 flex items-end gap-1.5">
                {h.rates.map((r) => (
                  <span
                    key={r.from}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span
                      className="w-full rounded-[6px] bg-g-blue/60"
                      style={{ height: `${(r.rate / h.rate) * 44}px` }}
                    />
                    <span className="text-[10.5px] text-g-muted">
                      {dt(tr, r.from)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Advances, bonuses, fines: they land on the next payslip. */}
          <section className="rounded-[22px] bg-g-fill p-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold">
                {tr("Advances, bonuses, fines")}
              </p>
            </div>
            {h.ledger.length > 0 && (
              <div className="mt-2 grid gap-1.5">
                {h.ledger.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[13.5px]"
                  >
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${l.kind === "bonus" ? "chip-green" : l.kind === "fine" ? "chip-red" : "chip-blue"}`}
                    >
                      {tr(
                        l.kind === "bonus"
                          ? "Bonus"
                          : l.kind === "fine"
                            ? "Fine"
                            : "Advance",
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {tr(l.note)}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {l.kind === "bonus" ? "+" : "−"}
                      {compactMoney(l.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {(["advance", "bonus", "fine"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => (haptic("light"), setEntry(k))}
                  className="press h-9 rounded-full bg-g-card text-[12.5px] font-semibold"
                >
                  +{" "}
                  {tr(
                    k === "bonus" ? "Bonus" : k === "fine" ? "Fine" : "Advance",
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Vacation balance and the person's requests. */}
          <section className="rounded-[22px] bg-g-fill p-4">
            <p className="text-[15px] font-bold">{tr("Time off")}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-g-card">
                <span
                  className="block h-full rounded-full bg-g-blue"
                  style={{
                    width: `${(h.vacation.used / h.vacation.total) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[13px] font-semibold tabular-nums">
                {tr("{n} of {m} days left", { n: left, m: h.vacation.total })}
              </span>
            </div>
            {reqs
              .filter((r) => r.person === p.id)
              .map((r) => (
                <p
                  key={r.id}
                  className="mt-2 flex items-center justify-between gap-2 text-[13.5px]"
                >
                  <span className="truncate">
                    {tr(KIND[r.kind].label)} · {dt(tr, r.when)}
                  </span>
                  <span
                    className={`shrink-0 text-[12px] font-semibold ${r.status === "ok" ? "text-g-green" : r.status === "no" ? "text-g-muted" : "text-g-orange"}`}
                  >
                    {tr(
                      r.status === "ok"
                        ? "Approved"
                        : r.status === "no"
                          ? "Declined"
                          : "waiting",
                    )}
                  </span>
                </p>
              ))}
          </section>
        </div>

        <div className="grid gap-4">
          {h.onboarding && (
            <section className="rounded-[22px] bg-g-fill p-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold">{tr("Onboarding")}</p>
                <span className="text-[13px] font-semibold text-g-blue tabular-nums">
                  {h.onboarding.filter((s) => s.done).length}/
                  {h.onboarding.length}
                </span>
              </div>
              <div className="mt-2 grid gap-1">
                {h.onboarding.map((s, i) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => (
                      haptic("tick"),
                      put({
                        onboarding: h.onboarding!.map((x, k) =>
                          k === i ? { ...x, done: !x.done } : x,
                        ),
                      })
                    )}
                    className="press flex items-center gap-2.5 py-1.5 text-left text-[14px]"
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full ${s.done ? "bg-g-green text-white" : "border-2 border-g-line"}`}
                    >
                      {s.done && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span
                      className={
                        s.done ? "text-g-muted line-through" : "font-semibold"
                      }
                    >
                      {tr(s.step)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[22px] bg-g-fill p-4">
            <p className="text-[15px] font-bold">{tr("Documents")}</p>
            <div className="mt-2 grid gap-1">
              {h.docs.map((d, i) => (
                <button
                  key={d.kind}
                  type="button"
                  onClick={() => (haptic("light"), setDoc(i))}
                  className="press flex items-center gap-2.5 rounded-[14px] py-1.5 text-left text-[14px]"
                >
                  {d.file && !d.file.type.includes("pdf") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.file.url}
                      alt=""
                      className="h-10 w-8 shrink-0 rounded-[6px] bg-white object-cover ring-1 ring-g-line"
                    />
                  ) : (
                    <span
                      className={`grid h-10 w-8 shrink-0 place-items-center rounded-[6px] ${d.file ? "bg-g-card" : "border border-dashed border-g-line"}`}
                    >
                      <FileText size={14} className="text-g-muted" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {tr(d.kind)}
                    </span>
                    <span className="block truncate text-[12px] text-g-muted">
                      {d.file ? d.file.name : tr("no file yet")}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[12.5px] font-semibold ${d.daysLeft === undefined ? (d.number ? "text-g-muted" : "text-g-orange") : d.daysLeft < 0 ? "text-[#e5484d]" : d.daysLeft < 30 ? "text-g-orange" : "text-g-green"}`}
                  >
                    {d.number ??
                      (d.daysLeft === undefined
                        ? tr("not uploaded")
                        : d.daysLeft < 0
                          ? tr("expired")
                          : dt(tr, d.expires ?? ""))}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (haptic("light"), setDoc(-1))}
              className="press mt-3 flex h-9 items-center gap-1.5 rounded-full bg-g-card px-3.5 text-[13px] font-semibold"
            >
              <Plus size={14} className="text-g-blue" /> {tr("Add a document")}
            </button>
          </section>

          <section className="rounded-[22px] bg-g-fill p-4">
            <p className="flex items-center gap-1.5 text-[15px] font-bold">
              <MessageSquare size={15} className="text-g-blue" />{" "}
              {tr("1:1 notes")}
            </p>
            <p className="text-[12px] text-g-muted">
              {tr("Only the owner and the admin see these.")}
            </p>
            {h.notes.map((n, i) => (
              <p
                key={i}
                className="mt-2 rounded-[14px] bg-g-card p-2.5 text-[13.5px]"
              >
                <span className="text-g-muted">{dt(tr, n.at)} · </span>
                {tr(n.text)}
              </p>
            ))}
            <div className="mt-2 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={tr("What you talked about, what is next")}
                className="h-10 min-w-0 flex-1 rounded-full bg-g-card px-3.5 text-[14px] outline-none"
              />
              <button
                type="button"
                disabled={!note.trim()}
                onClick={() => (
                  put({
                    notes: [{ at: "14 Nov", text: note.trim() }, ...h.notes],
                  }),
                  setNote(""),
                  haptic("success")
                )}
                className="blue-grad press grid size-10 shrink-0 place-items-center rounded-full"
              >
                <Plus size={16} />
              </button>
            </div>
          </section>

          {!h.left && (
            <button
              type="button"
              onClick={() => (haptic("light"), setLeaving(true))}
              className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[14.5px] font-semibold text-[#e5484d]"
            >
              <UserMinus size={16} /> {tr("Let go")}
            </button>
          )}
        </div>
      </div>

      {payEdit && (
        <PayEdit
          h={h}
          onClose={() => setPayEdit(false)}
          onSave={(pay, rate, extras) => (
            put({
              pay,
              rate,
              extras,
              rates:
                rate === h.rate
                  ? h.rates
                  : [...h.rates, { from: "Dec 2026", rate }],
            }),
            haptic("success"),
            notify(tr("New rate from 1 December")),
            setPayEdit(false)
          )}
        />
      )}
      {doc !== null && (
        <DocSheet
          doc={doc >= 0 ? h.docs[doc] : undefined}
          name={p.name}
          taken={h.docs.map((d) => d.kind)}
          notify={notify}
          onClose={() => setDoc(null)}
          onRemove={
            doc >= 0
              ? () => (
                  put({ docs: h.docs.filter((_, k) => k !== doc) }),
                  setDoc(null)
                )
              : undefined
          }
          onSave={(d) => (
            put({
              docs:
                doc >= 0
                  ? h.docs.map((x, k) => (k === doc ? d : x))
                  : [...h.docs, d],
            }),
            haptic("success"),
            notify(tr("Saved")),
            setDoc(null)
          )}
        />
      )}
      {entry && (
        <LedgerSheet
          kind={entry}
          onClose={() => setEntry(null)}
          onSave={(amount, n) => (
            put({
              ledger: [
                { at: "14 Nov", kind: entry, amount, note: n },
                ...h.ledger,
              ],
            }),
            haptic("success"),
            notify(tr("Added · it goes to the next payslip")),
            setEntry(null)
          )}
        />
      )}
      {leaving && (
        <Sheet
          open
          onClose={() => setLeaving(false)}
          label={tr("Let go")}
          footer={
            <button
              type="button"
              onClick={() => (
                put({ left: "14 Nov" }),
                haptic("success"),
                notify(
                  tr("{name}'s access is closed · the final payslip is ready", {
                    name: p.name,
                  }),
                ),
                setLeaving(false)
              )}
              className="press h-14 w-full rounded-full bg-[#e5484d] text-[16px] font-semibold text-white"
            >
              {tr("Confirm")}
            </button>
          }
        >
          <div className="grid gap-3 px-5 pt-2 pb-10">
            <h2 className="text-[26px] font-bold tracking-[-0.025em]">
              {tr("Let {name} go", { name: p.name })}
            </h2>
            {[
              [
                Ban,
                tr(
                  "Access to every app closes at once, the @ID stays in history",
                ),
              ],
              [
                Coins,
                tr(
                  "Final payslip: hours to today, tips, unused vacation {n} days, minus advances",
                  { n: left },
                ),
              ],
              [FileText, tr("Documents and history are kept, as the law asks")],
              [
                AlertTriangle,
                tr("Future shifts in the schedule become gaps to fill"),
              ],
            ].map(([I, t], i) => {
              const Icon = I as typeof Ban;
              return (
                <p
                  key={i}
                  className="flex items-start gap-3 rounded-[18px] bg-g-fill p-3.5 text-[14px]"
                >
                  <Icon size={17} className="mt-0.5 shrink-0 text-g-muted" />{" "}
                  {t as string}
                </p>
              );
            })}
          </div>
        </Sheet>
      )}
    </Sheet>
  );
}

function LedgerSheet({
  kind,
  onClose,
  onSave,
}: {
  kind: LedgerRow["kind"];
  onClose: () => void;
  onSave: (amount: number, note: string) => void;
}) {
  const tr = useTr();
  const [sum, setSum] = useState("");
  const [note, setNote] = useState("");
  const title = tr(
    kind === "bonus" ? "Bonus" : kind === "fine" ? "Fine" : "Advance",
  );
  return (
    <Sheet
      open
      onClose={onClose}
      label={title}
      footer={
        <button
          type="button"
          disabled={!Number(sum) || note.trim().length < 3}
          onClick={() => onSave(Number(sum), note.trim())}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <h2 className="text-[26px] font-bold tracking-[-0.025em]">{title}</h2>
        <span className="flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
          <input
            autoFocus
            inputMode="numeric"
            value={Number(sum) ? Number(sum).toLocaleString("en-US") : ""}
            onChange={(e) => setSum(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none tabular-nums"
          />
          <span className="text-g-muted">₫</span>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr(
            kind === "fine" ? "What for (the person sees it)" : "What for",
          )}
          className="h-12 w-full rounded-[20px] bg-g-fill px-4 text-[15px] outline-none"
        />
        {kind === "fine" && (
          <p className="flex items-center gap-1.5 px-1 text-[12.5px] text-g-muted">
            <X size={13} />{" "}
            {tr(
              "A fine is shown to the person with the reason; it cannot be larger than the law allows.",
            )}
          </p>
        )}
      </div>
    </Sheet>
  );
}
