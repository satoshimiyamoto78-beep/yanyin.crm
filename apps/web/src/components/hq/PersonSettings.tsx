"use client";

import {
  Check,
  ChefHat,
  ConciergeBell,
  Crown,
  IdCard,
  KeyRound,
  Phone,
  RotateCcw,
  Shield,
  Trash2,
  User,
  Utensils,
  Wine,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Person, StaffRole, Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { overridesStore, PERMS, rolesStore } from "@/lib/demo-hr";
import { Sheet } from "@/components/guest/ui";
import { Switch } from "@/components/system/Kit";
import { useTr } from "@/components/crew/prefs";
import { Face, ROLE_NAMES, STATION_NAMES } from "./People";

/*
 * Editing a person, like iOS settings (docs/07 §93): sections of rows, a
 * switch on every row, one Save. Profile (name; the @ID and phone are the
 * person's own), roles, stations, what they may do — every right can be
 * switched for this person alone, apart from their roles, and reset — and
 * access (sign in, remove from the team).
 */

const ROLE_ICON: Partial<Record<StaffRole, typeof User>> = {
  owner: Crown,
  admin: Shield,
  manager: Shield,
  waiter: ConciergeBell,
  bartender: Wine,
  cook: ChefHat,
  host: User,
  runner: Utensils,
  accountant: KeyRound,
};
const ALL_STATIONS: Station[] = [
  "hall",
  "bar",
  "hot",
  "cold",
  "grill",
  "pastry",
  "hookah",
];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5">
      <p className="mb-1.5 px-4 text-[12px] font-semibold tracking-[0.05em] text-g-muted uppercase">
        {title}
      </p>
      <div className="divide-y divide-g-line overflow-hidden rounded-[20px] bg-g-fill">
        {children}
      </div>
      {hint && <p className="mt-1.5 px-4 text-[12px] text-g-muted">{hint}</p>}
    </section>
  );
}
function SRow({
  icon: Icon,
  title,
  sub,
  right,
  tone,
}: {
  icon?: typeof User;
  title: string;
  sub?: string;
  right: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
      {Icon && (
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${tone ?? "bg-g-card text-g-blue"}`}
        >
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">
          {title}
        </span>
        {sub && (
          <span className="block truncate text-[12px] text-g-muted">{sub}</span>
        )}
      </span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

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
  const roleDefs = rolesStore.use();
  const allOverrides = overridesStore.use();
  const [draft, setDraft] = useState<Person>(p);
  const [over, setOver] = useState<Record<string, boolean>>(
    allOverrides[p.id] ?? {},
  );
  const [off, setOff] = useState(disabled);
  const [confirm, setConfirm] = useState(false);
  const byRole = new Set(
    draft.roles.flatMap(
      (r) =>
        roleDefs.find(
          (d) => d.id === r || (r === "manager" && d.id === "admin"),
        )?.perms ?? [],
    ),
  );
  const allowed = (id: string) => (id in over ? over[id]! : byRole.has(id));
  const changed =
    JSON.stringify([draft, over, off]) !==
    JSON.stringify([p, allOverrides[p.id] ?? {}, disabled]);
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const groups = [...new Set(PERMS.map((x) => x.group))];
  const save = () => {
    onChange({ ...draft, name: draft.name.trim() || p.name });
    overridesStore.set({ ...allOverrides, [p.id]: over });
    if (off !== disabled) onDisabled(off);
    haptic("success");
    onClose();
  };
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Edit")}
      footer={
        <button
          type="button"
          disabled={!changed}
          onClick={save}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        >
          <Check size={18} strokeWidth={2.6} />{" "}
          {changed ? tr("Save") : tr("No changes")}
        </button>
      }
    >
      <div className="mx-auto max-w-[560px] px-5 pt-1 pb-10">
        <div className="flex items-center gap-3.5">
          <Face p={draft} size={60} off={off} dot={false} />
          <div className="min-w-0">
            <h2 className="truncate text-[22px] leading-tight font-bold tracking-[-0.02em]">
              {draft.name || p.name}
            </h2>
            <p className="truncate text-[13px] text-g-muted">
              @{p.handle} ·{" "}
              {draft.roles.map((r) => tr(ROLE_NAMES[r])).join(", ")}
            </p>
          </div>
        </div>

        <Section
          title={tr("Profile")}
          hint={tr(
            "The @ID and the phone belong to the person: they change them in their app.",
          )}
        >
          <label className="flex min-h-[52px] items-center gap-3 px-4 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-g-card text-g-blue">
              <User size={16} />
            </span>
            <span className="w-20 shrink-0 text-[14px] text-g-muted">
              {tr("Name")}
            </span>
            <input
              value={draft.name}
              maxLength={40}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-10 min-w-0 flex-1 rounded-[12px] bg-g-card px-3 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-g-blue/40"
            />
          </label>
          <SRow
            icon={IdCard}
            title={`@${p.handle}`}
            sub={tr("@ID")}
            right={null}
          />
          <SRow
            icon={Phone}
            title="+84 905 ••• •••"
            sub={tr("Phone")}
            right={null}
          />
        </Section>

        <Section
          title={tr("Roles")}
          hint={tr("A person can have several roles; rights add up.")}
        >
          {(Object.keys(ROLE_NAMES) as StaffRole[])
            .filter((r) => r !== "owner" || p.roles.includes("owner"))
            .map((r) => (
              <SRow
                key={r}
                icon={ROLE_ICON[r]}
                title={tr(ROLE_NAMES[r])}
                right={
                  <Switch
                    on={draft.roles.includes(r)}
                    onChange={() => {
                      const roles = toggle(draft.roles, r);
                      if (roles.length) setDraft({ ...draft, roles });
                    }}
                    label={tr(ROLE_NAMES[r])}
                  />
                }
              />
            ))}
        </Section>

        <Section
          title={tr("Stations")}
          hint={tr("Tickets of a station reach everyone on it.")}
        >
          {ALL_STATIONS.map((st) => (
            <SRow
              key={st}
              title={tr(STATION_NAMES[st])}
              right={
                <Switch
                  on={draft.stations.includes(st)}
                  onChange={() =>
                    setDraft({ ...draft, stations: toggle(draft.stations, st) })
                  }
                  label={tr(STATION_NAMES[st])}
                />
              }
            />
          ))}
        </Section>

        {groups.map((g) => (
          <Section key={g} title={`${tr("May")} · ${tr(g)}`}>
            {PERMS.filter((x) => x.group === g).map((x) => (
              <SRow
                key={x.id}
                title={tr(x.label)}
                sub={
                  x.id in over
                    ? tr(
                        over[x.id]
                          ? "allowed for this person"
                          : "taken away from this person",
                      )
                    : tr(byRole.has(x.id) ? "by role" : "not in the role")
                }
                right={
                  <span className="flex items-center gap-1.5">
                    {x.id in over && (
                      <button
                        type="button"
                        aria-label={tr("Back to the role")}
                        onClick={() => {
                          const n = { ...over };
                          delete n[x.id];
                          setOver(n);
                          haptic("tick");
                        }}
                        className="press grid size-8 place-items-center rounded-full text-g-muted"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <Switch
                      on={allowed(x.id)}
                      onChange={(v) => setOver({ ...over, [x.id]: v })}
                      label={tr(x.label)}
                    />
                  </span>
                }
              />
            ))}
          </Section>
        ))}

        <Section title={tr("Access")}>
          <SRow
            icon={KeyRound}
            title={tr("Can sign in")}
            sub={
              off
                ? tr("Off: the app is closed for them, history stays")
                : tr("On: works in the app by role")
            }
            right={
              <Switch
                on={!off}
                onChange={(v) => setOff(!v)}
                label={tr("Can sign in")}
              />
            }
          />
        </Section>

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
