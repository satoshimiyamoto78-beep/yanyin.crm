"use client";

import { Bell, Camera, ChevronRight, Coffee, Globe, HelpCircle, Lock, LogOut, Moon, Plus, Printer, ScanFace, Smartphone, Trophy, Type, UserRound, Volume2, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { BADGE_ICON } from "./CrewBoard";

type Prefs = {
  newOrders: boolean;
  kitchenReady: boolean;
  bills: boolean;
  bookings: boolean;
  sound: boolean;
  vibration: boolean;
  onBreak: boolean;
  pin: boolean;
  faceId: boolean;
};

const LANGS = ["English", "Русский", "Tiếng Việt"];

/** Waiter settings, laid out like a native settings screen: grouped rows, switches, values. */
export type Me = { first: string; last: string; phone: string; email: string; photo?: string; role: string };

/**
 * The waiter's profile, opened from the avatar: a big round photo, name and role,
 * the level with earned badges, then personal info and every setting.
 */
export function ProfilePage({
  me,
  level,
  badges,
  onPersonal,
  onAllBadges,
  onClose,
  onNotify,
  dark,
  onTheme,
}: {
  me: Me;
  level: { level: number; title: string; xpIntoLevel: number; xpForNext: number };
  badges: { id: string; name: string; earned: boolean }[];
  onPersonal: () => void;
  onAllBadges: () => void;
  onClose: () => void;
  onNotify: (title: string, text?: string) => void;
  dark: boolean;
  onTheme: () => void;
}) {
  const [p, setP] = useState<Prefs>({ newOrders: true, kitchenReady: true, bills: true, bookings: false, sound: true, vibration: true, onBreak: false, pin: true, faceId: false });
  const [lang, setLang] = useState(0);
  const [zone, setZone] = useState<"Hall" | "Terrace">("Hall");
  const [text, setText] = useState<"Default" | "Large">("Default");
  const flip = (k: keyof Prefs, label: string) => {
    const v = !p[k];
    setP((x) => ({ ...x, [k]: v }));
    onNotify(`${label} ${v ? "on" : "off"}`);
  };
  return (
    <Sheet open onClose={onClose} label="Profile">
    <div className="px-5 pb-6">
      <div className="flex flex-col items-center pt-2 text-center">
        <button onClick={onPersonal} aria-label="Edit photo and personal info" className="press relative">
          <Avatar me={me} size={104} />
          <span className="blue-grad absolute right-0 bottom-0 grid size-8 place-items-center rounded-full ring-4 ring-white">
            <Camera size={15} strokeWidth={2.2} />
          </span>
        </button>
        <p className="mt-4 text-[24px] leading-tight font-bold tracking-[-0.02em]">
          {me.first} {me.last}
        </p>
        <p className="mt-1 text-[15px] text-g-muted">{me.role}</p>
      </div>

      {/* Level and earned badges; the plus opens every badge. */}
      <section className="mt-6 rounded-[24px] bg-g-fill p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[16px] font-semibold">
            Level {level.level} <span className="font-medium text-g-muted">· {level.title}</span>
          </p>
          <p className="text-[13px] text-g-muted tabular-nums">
            {level.xpIntoLevel} / {level.xpForNext} XP
          </p>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-g-fill-2">
          <div className="bar-grad h-full rounded-full" style={{ width: `${Math.round((level.xpIntoLevel / level.xpForNext) * 100)}%` }} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          {badges
            .filter((b) => b.earned)
            .map((b) => {
              const Icon = BADGE_ICON[b.id] ?? Trophy;
              return (
                <span key={b.id} title={b.name} className="blue-grad grid size-10 place-items-center rounded-full">
                  <Icon size={18} strokeWidth={1.9} />
                </span>
              );
            })}
          <button
            onClick={() => {
              haptic("light");
              onAllBadges();
            }}
            aria-label="All badges"
            className="press grid size-10 place-items-center rounded-full border-[1.5px] border-dashed border-g-faint text-g-muted"
          >
            <Plus size={18} strokeWidth={2.2} />
          </button>
        </div>
      </section>

      <Group title="Account">
        <Row icon={UserRound} label="Personal info" hint={`${me.phone} · ${me.email}`} onClick={onPersonal}>
          <ChevronRight size={18} className="text-g-faint" />
        </Row>
      </Group>

      <Group title="Shift">
        <Row icon={Coffee} label="On break" hint={p.onBreak ? "Guests see “back in 10 min”" : "Tables can call you"}>
          <Switch on={p.onBreak} onChange={() => flip("onBreak", "Break")} label="On break" />
        </Row>
        <Row icon={LogOut} label="End shift" hint="Started 10:00 · 4 tables closed">
          <button
            onClick={() => {
              haptic("light");
              onNotify("Shift report sent", "Your manager gets today's totals and tips");
            }}
            className="press h-9 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
          >
            End
          </button>
        </Row>
      </Group>

      <Group title="Notifications">
        <Row icon={Bell} label="New orders from tables">
          <Switch on={p.newOrders} onChange={() => flip("newOrders", "New order alerts")} label="New orders" />
        </Row>
        <Row icon={Bell} label="Dish ready in the kitchen">
          <Switch on={p.kitchenReady} onChange={() => flip("kitchenReady", "Kitchen alerts")} label="Kitchen ready" />
        </Row>
        <Row icon={Bell} label="Bill and waiter calls">
          <Switch on={p.bills} onChange={() => flip("bills", "Call alerts")} label="Bill and calls" />
        </Row>
        <Row icon={Bell} label="New bookings">
          <Switch on={p.bookings} onChange={() => flip("bookings", "Booking alerts")} label="New bookings" />
        </Row>
        <Row icon={Volume2} label="Sound">
          <Switch on={p.sound} onChange={() => flip("sound", "Sound")} label="Sound" />
        </Row>
        <Row icon={Smartphone} label="Vibration">
          <Switch on={p.vibration} onChange={() => flip("vibration", "Vibration")} label="Vibration" />
        </Row>
      </Group>

      <Group title="Work">
        <Row icon={Globe} label="Language">
          <button
            onClick={() => {
              haptic("tick");
              const n = (lang + 1) % LANGS.length;
              setLang(n);
              onNotify("Language", LANGS[n]);
            }}
            className="press flex items-center gap-1 text-[15px] text-g-muted"
          >
            {LANGS[lang]} <ChevronRight size={18} className="text-g-faint" />
          </button>
        </Row>
        <Row icon={Moon} label="Dark theme" hint="Same choice as the guest menu on this phone">
          <Switch on={dark} onChange={onTheme} label="Dark theme" />
        </Row>
        <Row icon={Type} label="Text size">
          <Segmented value={text} options={["Default", "Large"]} onChange={(v) => { setText(v); onNotify("Text size", v); }} />
        </Row>
        <Row icon={Globe} label="My zone">
          <Segmented value={zone} options={["Hall", "Terrace"]} onChange={(v) => { setZone(v); onNotify("Zone", `${v} tables come first`); }} />
        </Row>
        <Row icon={Printer} label="Check printer" hint="Sunmi V2 · Hall">
          <span className="chip-green inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold">Connected</span>
        </Row>
      </Group>

      <Group title="Security">
        <Row icon={Lock} label="PIN on open">
          <Switch on={p.pin} onChange={() => flip("pin", "PIN lock")} label="PIN on open" />
        </Row>
        <Row icon={ScanFace} label="Face ID">
          <Switch on={p.faceId} onChange={() => flip("faceId", "Face ID")} label="Face ID" />
        </Row>
      </Group>

      <Group title="About">
        <Row icon={HelpCircle} label="Help and support" onClick={() => onNotify("Support", "Write to us in Zalo or Telegram")}>
          <ChevronRight size={18} className="text-g-faint" />
        </Row>
        <Row icon={Smartphone} label="App version">
          <span className="text-[15px] text-g-muted">yanyin crew 0.7 · demo</span>
        </Row>
      </Group>

      <button onClick={() => onNotify("Signed out", "Demo: nothing changed")} className="press mt-8 h-14 w-full rounded-full bg-g-fill text-[16px] font-semibold text-[#e5484d]">
        Sign out
      </button>
      <p className="mt-6 mb-4 text-center text-[12px] text-g-faint">Settings save on this phone and sync with your account later.</p>
    </div>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-1 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{title}</h2>
      <div className="divide-y divide-g-line">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, hint, children, onClick }: { icon: LucideIcon; label: string; hint?: string; children: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="chip-blue grid size-9 shrink-0 place-items-center rounded-full">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {hint && <span className="block truncate text-[13px] text-g-muted">{hint}</span>}
      </span>
      {children}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="press flex min-h-[60px] w-full items-center gap-3.5 py-2.5 text-left">
      {body}
    </button>
  ) : (
    <div className="flex min-h-[60px] items-center gap-3.5 py-2.5">{body}</div>
  );
}

/** Flat switch: blue gradient track when on, white knob. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        haptic("tick");
        onChange();
      }}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 ${on ? "blue-grad" : "bg-g-fill-2"}`}
    >
      <span className={`absolute top-[3px] left-[3px] size-6 rounded-full bg-[#fff] transition-transform duration-200 ease-out ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full bg-g-fill p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => {
            haptic("tick");
            onChange(o);
          }}
          aria-pressed={value === o}
          className={`h-8 rounded-full px-3 text-[13px] font-semibold ${value === o ? "bg-g-ink text-white" : "text-g-muted"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Round avatar: the photo, or the first letter on ink. */
export function Avatar({ me, size }: { me: Me; size: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-g-ink font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local photo the waiter picked */}
      {me.photo ? <img src={me.photo} alt="" className="size-full object-cover" /> : me.first[0]}
    </span>
  );
}

/** Personal info: photo, first and last name, phone and email. */
export function PersonalInfoPage({ me, onSave, onClose }: { me: Me; onSave: (m: Me) => void; onClose: () => void }) {
  const [d, setD] = useState(me);
  const changed = JSON.stringify(d) !== JSON.stringify(me);
  const ok = d.first.trim().length > 0 && d.phone.trim().length > 5 && /.+@.+\..+/.test(d.email);
  const field = "h-12 w-full rounded-[16px] bg-g-fill px-4 text-[16px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30";
  const set = (k: keyof Me) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Sheet
      open
      onClose={onClose}
      label="Personal info"
      footer={
        <button disabled={!changed || !ok} onClick={() => onSave({ ...d, first: d.first.trim(), last: d.last.trim() })} className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold disabled:opacity-40">
          Save
        </button>
      }
    >
      <div className="px-5 pt-2 pb-8">
        <div className="flex flex-col items-center">
          <Avatar me={d} size={104} />
          <div className="mt-4 flex gap-2">
            <label className="press flex h-10 cursor-pointer items-center gap-2 rounded-full bg-g-fill px-4 text-[14px] font-semibold">
              <Camera size={16} strokeWidth={2} /> {d.photo ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setD((x) => ({ ...x, photo: URL.createObjectURL(f) }));
                }}
              />
            </label>
            {d.photo && (
              <button onClick={() => setD((x) => ({ ...x, photo: undefined }))} className="press h-10 rounded-full px-4 text-[14px] font-semibold text-g-muted">
                Remove
              </button>
            )}
          </div>
        </div>
        <div className="mt-8 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">First name</span>
            <input value={d.first} onChange={set("first")} autoComplete="given-name" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">Last name</span>
            <input value={d.last} onChange={set("last")} autoComplete="family-name" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">Phone or Zalo</span>
            <input value={d.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">Email</span>
            <input value={d.email} onChange={set("email")} inputMode="email" autoComplete="email" className={field} />
          </label>
        </div>
        <p className="mt-4 text-[13px] text-g-muted">Your role and venue are set by the manager.</p>
      </div>
    </Sheet>
  );
}
