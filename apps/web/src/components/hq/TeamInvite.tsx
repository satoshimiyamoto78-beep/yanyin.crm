"use client";

import {
  Check,
  Copy,
  Link2,
  RefreshCw,
  Send,
  Share2,
  Smartphone,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import {
  invitesStore,
  joinStore,
  rolesStore,
  teamLinkStore,
  type JoinRequest,
} from "@/lib/demo-hr";
import { Sheet } from "@/components/guest/ui";
import { BrandQr, Switch, TextField } from "@/components/system/Kit";
import { useTr } from "@/components/crew/prefs";

/*
 * Joining the team (docs/07 §93). One link for the whole venue: the person
 * installs the staff app, signs in with their phone, opens the link and asks
 * to join; an admin approves with the roles. Access stays until they are let
 * go. A personal invite sends the same link to one phone with the roles set
 * in advance, so it joins without waiting. The link can be paused or replaced
 * (the old one stops working) when it leaks.
 */

const tz = (tr: (s: string) => string, s: string) =>
  s.replace(/\b(today|yesterday)\b/g, (m) => tr(m));

function RolePills({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const tr = useTr();
  const roles = rolesStore.use().filter((r) => r.id !== "owner");
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => {
        const on = value.includes(r.id);
        return (
          <button
            key={r.id}
            type="button"
            aria-pressed={on}
            onClick={() => (
              haptic("tick"),
              onChange(
                on
                  ? value.length > 1
                    ? value.filter((x) => x !== r.id)
                    : value
                  : [...value, r.id],
              )
            )}
            className={`press flex h-9 items-center gap-1 rounded-full px-3.5 text-[13.5px] font-semibold ${on ? "blue-grad" : "bg-g-fill text-g-ink-2"}`}
          >
            {on && <Check size={14} strokeWidth={2.6} />}
            {tr(r.name)}
          </button>
        );
      })}
    </div>
  );
}

/** The role names for stored ids ("waiter,host" → "Waiter · Host"). */
export function useRoleNames() {
  const tr = useTr();
  const roles = rolesStore.use();
  return (ids: string) =>
    ids
      .split(",")
      .map((id) => tr(roles.find((r) => r.id === id)?.name ?? id))
      .join(" · ");
}

export function InviteSheet({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const tr = useTr();
  const link = teamLinkStore.use();
  const invites = invitesStore.use();
  const roleNames = useRoleNames();
  const [tab, setTab] = useState<"link" | "phone">("link");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState(["waiter"]);
  const url = `https://yanyin.app/join/samarkand-${link.code}`;
  const ok = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;
  const copy = () => {
    void navigator.clipboard?.writeText(url).catch(() => {});
    haptic("success");
    onSent("");
  };
  const send = () => {
    invitesStore.set([
      {
        id: `i${invites.length + 1}-${phone.replace(/\D/g, "").slice(-4)}`,
        name: name.trim(),
        phone: `+84 ${phone.trim()}`,
        role: roles.join(","),
        sent: "today",
        status: "sent",
      },
      ...invites,
    ]);
    haptic("success");
    onSent(name.trim());
  };
  const seg = (on: boolean) =>
    `h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${on ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Invite to the team")}
      title={false}
      footer={
        tab === "phone" ? (
          <button
            type="button"
            disabled={!ok}
            onClick={send}
            className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
          >
            <Send size={18} /> {tr("Send the invite")}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!link.open}
              onClick={copy}
              className="press flex h-14 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold disabled:opacity-40"
            >
              <Copy size={18} /> {tr("Copy")}
            </button>
            <button
              type="button"
              disabled={!link.open}
              onClick={() => {
                if (navigator.share)
                  void navigator
                    .share({ title: "Samarkand · yanyin", url })
                    .catch(() => {});
                else copy();
              }}
              className="blue-grad press flex h-14 items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
            >
              <Share2 size={18} /> {tr("Share")}
            </button>
          </div>
        )
      }
    >
      <div className="grid gap-5 px-5 pt-1 pb-10">
        <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
          {tr("Invite to the team")}
        </h2>
        <div className="flex rounded-full bg-g-fill p-1">
          <button
            type="button"
            aria-pressed={tab === "link"}
            onClick={() => (haptic("tick"), setTab("link"))}
            className={seg(tab === "link")}
          >
            {tr("Team link")}
          </button>
          <button
            type="button"
            aria-pressed={tab === "phone"}
            onClick={() => (haptic("tick"), setTab("phone"))}
            className={seg(tab === "phone")}
          >
            {tr("One person")}
          </button>
        </div>

        {tab === "link" ? (
          <>
            <div
              className={`card flex items-center gap-4 rounded-[26px] p-4 transition-opacity ${link.open ? "" : "opacity-45"}`}
            >
              <a href="join.html" className="press shrink-0">
                <BrandQr value={url} size={112} label={tr("Invite QR code")} />
              </a>
              <span className="min-w-0">
                <span className="block text-[16px] font-bold">
                  {tr("One link for the whole team")}
                </span>
                <span className="mt-1 flex items-center gap-1.5 truncate text-[13px] font-semibold text-g-blue">
                  <Link2 size={14} className="shrink-0" />
                  <span className="truncate">yanyin.app/join/…{link.code}</span>
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-g-muted">
                  {tr("{n} people joined with it", { n: link.joined })}
                </span>
              </span>
            </div>

            <div className="overflow-hidden rounded-[22px] bg-g-fill">
              <label className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">
                    {tr("The link works")}
                  </span>
                  <span className="block text-[12.5px] text-g-muted">
                    {tr("Pause it when you are not hiring")}
                  </span>
                </span>
                <Switch
                  on={link.open}
                  onChange={(v) => teamLinkStore.set({ ...link, open: v })}
                  label={tr("The link works")}
                />
              </label>
              <label className="flex items-center gap-3 border-t border-g-line px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">
                    {tr("I approve each person")}
                  </span>
                  <span className="block text-[12.5px] text-g-muted">
                    {link.approve
                      ? tr("They wait in Requests until you pick their roles")
                      : tr("They join at once as {role}", {
                          role: roleNames(link.role),
                        })}
                  </span>
                </span>
                <Switch
                  on={link.approve}
                  onChange={(v) => teamLinkStore.set({ ...link, approve: v })}
                  label={tr("I approve each person")}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const code = Math.random()
                    .toString(36)
                    .slice(2, 6)
                    .toUpperCase();
                  teamLinkStore.set({ ...link, code, joined: 0 });
                  haptic("light");
                }}
                className="press flex w-full items-center gap-3 border-t border-g-line px-4 py-3 text-left"
              >
                <RefreshCw size={17} className="text-g-orange" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">
                    {tr("Make a new link")}
                  </span>
                  <span className="block text-[12.5px] text-g-muted">
                    {tr("The old one stops working. The team keeps access.")}
                  </span>
                </span>
              </button>
            </div>

            <div>
              <p className="px-1 text-[13px] font-semibold text-g-ink-2">
                {tr("How a person joins")}
              </p>
              <ol className="mt-1.5 grid gap-px overflow-hidden rounded-[22px] bg-g-line">
                {[
                  [Smartphone, "Installs yanyin.crew and signs in with their phone"],
                  [Link2, "Opens the link or scans the QR"],
                  [UserPlus, "Asks to join Samarkand"],
                  [UserCheck, "You approve and pick the roles"],
                  [Check, "Works until you let them go: access closes at once"],
                ].map(([I, t], i) => {
                  const Icon = I as typeof Check;
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 bg-g-fill px-4 py-3"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-g-card text-[13px] font-bold text-g-blue tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-[14.5px] font-medium">
                        {tr(t as string)}
                      </span>
                      <Icon size={17} className="shrink-0 text-g-faint" />
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        ) : (
          <>
            <p className="-mt-1 px-1 text-[14px] text-g-muted">
              {tr(
                "They get the link by SMS or Zalo. The roles are set already, so they start the moment they sign in.",
              )}
            </p>
            <div className="grid gap-2">
              <TextField
                value={name}
                onChange={setName}
                placeholder={tr("Name")}
              />
              <TextField
                value={phone}
                onChange={(v) => setPhone(v.replace(/[^\d ]/g, ""))}
                prefix="+84"
                placeholder="905 000 000"
                type="tel"
                inputMode="tel"
              />
            </div>
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold text-g-ink-2">
                {tr("Roles")}
              </p>
              <RolePills value={roles} onChange={setRoles} />
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** People who opened the team link and wait for the roles. */
export function JoinRequests({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const list = joinStore.use();
  const link = teamLinkStore.use();
  const roleNames = useRoleNames();
  const [picking, setPicking] = useState<JoinRequest | null>(null);
  const open = list.filter((j) => j.status === "new");
  if (!open.length) return null;
  const decide = (j: JoinRequest, ok: boolean, roles?: string[]) => {
    joinStore.set(
      list.map((x) =>
        x.id === j.id ? { ...x, status: ok ? "ok" : "no" } : x,
      ),
    );
    if (ok) teamLinkStore.set({ ...link, joined: link.joined + 1 });
    haptic(ok ? "success" : "light");
    notify(
      ok
        ? tr("{name} joined as {role}", {
            name: j.name,
            role: roleNames((roles ?? [j.wants]).join(",")),
          })
        : tr("Declined · {name} gets a notification", { name: j.name }),
    );
  };
  return (
    <>
      <h3 className="px-1 text-[19px] font-bold tracking-[-0.02em]">
        {tr("Want to join")}
      </h3>
      <div className="stagger grid gap-2 md:grid-cols-2">
        {open.map((j) => (
          <div key={j.id} className="rounded-[22px] bg-g-fill p-3.5">
            <div className="flex items-center gap-3">
              <span className="blue-grad grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold">
                {j.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {j.name}{" "}
                  <span className="font-medium text-g-muted">@{j.handle}</span>
                </span>
                <span className="block truncate text-[12.5px] text-g-muted">
                  {j.phone} · {tz(tr, j.at)}
                </span>
              </span>
              <span className="chip-blue inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold">
                <Link2 size={13} /> {tr("team link")}
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] text-g-ink-2">
              {tr("Asks to work as {role}", { role: roleNames(j.wants) })}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => decide(j, false)}
                className="press h-10 rounded-full bg-g-card text-[14px] font-semibold"
              >
                {tr("Decline")}
              </button>
              <button
                type="button"
                onClick={() => (haptic("light"), setPicking(j))}
                className="blue-grad press flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold"
              >
                <Check size={15} /> {tr("Approve")}
              </button>
            </div>
          </div>
        ))}
      </div>
      {picking && (
        <ApproveSheet
          j={picking}
          onClose={() => setPicking(null)}
          onApprove={(roles) => (decide(picking, true, roles), setPicking(null))}
        />
      )}
    </>
  );
}

function ApproveSheet({
  j,
  onClose,
  onApprove,
}: {
  j: JoinRequest;
  onClose: () => void;
  onApprove: (roles: string[]) => void;
}) {
  const tr = useTr();
  const [roles, setRoles] = useState([j.wants]);
  return (
    <Sheet
      open
      onClose={onClose}
      label={j.name}
      footer={
        <button
          type="button"
          onClick={() => onApprove(roles)}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        >
          <UserCheck size={18} /> {tr("Let them in")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-1 pb-10">
        <p className="text-[14px] text-g-muted">
          {tr(
            "Pick what they do. Rights come from the roles; you can change them later on their page.",
          )}
        </p>
        <RolePills value={roles} onChange={setRoles} />
      </div>
    </Sheet>
  );
}
