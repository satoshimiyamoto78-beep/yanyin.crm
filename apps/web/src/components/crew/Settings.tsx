"use client";

import { Bell, ChevronRight, Coffee, Globe, HelpCircle, Lock, LogOut, Moon, Printer, ScanFace, Smartphone, Type, Volume2, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { PageHead } from "./CrewApp";

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
export function SettingsView({ onNotify, dark, onTheme }: { onNotify: (title: string, text?: string) => void; dark: boolean; onTheme: () => void }) {
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
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Settings" />

      <button onClick={() => onNotify("Profile", "Editing comes with accounts in Phase 0")} className="press mt-6 flex w-full items-center gap-4 rounded-[24px] bg-g-fill p-4 text-left">
        <span className="ink-grad grid size-14 shrink-0 place-items-center rounded-[18px] text-[22px] font-bold">L</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[18px] font-semibold">Linh</span>
          <span className="block text-[14px] text-g-muted">Waiter · Samarkand</span>
        </span>
        <ChevronRight size={20} className="text-g-faint" />
      </button>

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
      <span className="chip-blue grid size-9 shrink-0 place-items-center rounded-[12px]">
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
      <span className={`absolute top-[3px] left-[3px] size-6 rounded-full bg-white transition-transform duration-200 ease-out ${on ? "translate-x-5" : ""}`} />
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
