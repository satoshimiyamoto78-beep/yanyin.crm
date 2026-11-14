"use client";

import {
  Armchair,
  BadgeCheck,
  Bell,
  BellRing,
  CalendarCheck,
  CalendarPlus,
  Camera,
  Check,
  ChefHat,
  ChevronRight,
  Coffee,
  CreditCard,
  DoorOpen,
  Info,
  Languages,
  LifeBuoy,
  Lock,
  MapPin,
  Moon,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  ScanFace,
  Smartphone,
  Trophy,
  Type,
  UserRound,
  UtensilsCrossed,
  Vibrate,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { BADGE_ICON, BADGE_TIER } from "./CrewBoard";
import { BadgeEmblem } from "./Emblems";
import { CREW_LANGS, usePrefs, type CrewLang, type NotifyPrefs } from "./prefs";

export type Me = { first: string; last: string; phone: string; email: string; photo?: string; role: string };

type Sub = "notifications" | "printer" | "language" | null;

/**
 * The waiter's profile, opened from the avatar: a big round photo, name and role,
 * the level with earned badges, then settings grouped by what they are about.
 * Notifications, printer and language open their own pages.
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
  handle,
  onHandle,
  onRoles,
}: {
  /** Opens "I am now…": the person's other roles. */
  onRoles?: () => void;
  me: Me;
  level: { level: number; title: string; xpIntoLevel: number; xpForNext: number };
  badges: { id: string; name: string; earned: boolean }[];
  onPersonal: () => void;
  onAllBadges: () => void;
  onClose: () => void;
  onNotify: (title: string, text?: string) => void;
  dark: boolean;
  onTheme: () => void;
  /** My @ID and how to change it. */
  handle?: string;
  onHandle?: () => void;
}) {
  const { prefs, set, tr } = usePrefs();
  const [sub, setSub] = useState<Sub>(null);
  const on = Object.entries(prefs.notify).filter(([k, v]) => v && k !== "sound" && k !== "vibration").length;
  const total = Object.keys(prefs.notify).length - 2;
  const printer = PRINTERS.find((x) => x.id === prefs.printer.id) ?? PRINTERS[0]!;
  return (
    <Sheet open onClose={onClose} label={tr("Profile")}>
      <div className="px-5 pb-6">
        <div className="flex flex-col items-center pt-2 text-center">
          <button onClick={onPersonal} aria-label={tr("Edit photo and personal info")} className="press relative">
            <Avatar me={me} size={104} />
            <span className="blue-grad absolute right-0 bottom-0 grid size-8 place-items-center rounded-full ring-4 ring-white">
              <Camera size={15} strokeWidth={2.2} />
            </span>
          </button>
          <p className="mt-4 text-[24px] leading-tight font-bold tracking-[-0.02em]">
            {me.first} {me.last}
          </p>
          {handle && (
            <button onClick={onHandle} className="press mt-1 rounded-full bg-g-tint-blue px-3 py-1 text-[15px] font-semibold text-g-blue">
              @{handle}
            </button>
          )}
          <p className="mt-1 text-[15px] text-g-muted">{tr(me.role)}</p>
        </div>

        {/* Level and earned badges; the plus opens every badge. */}
        <section className="mt-6 rounded-[24px] bg-g-fill p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[16px] font-semibold">
              {tr("Level {n}", { n: level.level })} <span className="font-medium text-g-muted">· {tr(level.title)}</span>
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
                  <span key={b.id} title={b.name}>
                    <BadgeEmblem tier={BADGE_TIER[b.id] ?? "silver"} icon={Icon} earned size={44} />
                  </span>
                );
              })}
            <button
              onClick={() => {
                haptic("light");
                onAllBadges();
              }}
              aria-label={tr("All badges")}
              className="press grid size-10 place-items-center rounded-full border-[1.5px] border-dashed border-g-faint text-g-muted"
            >
              <Plus size={18} strokeWidth={2.2} />
            </button>
          </div>
        </section>

        <Group title={tr("Account")}>
          <Row icon={UserRound} label={tr("Personal info")} hint={`${me.phone} · ${me.email}`} onClick={onPersonal}>
            <ChevronRight size={18} className="text-g-faint" />
          </Row>
          <Row icon={Languages} label={tr("Language")} onClick={() => setSub("language")}>
            <span className="flex items-center gap-1 text-[15px] text-g-muted">
              {CREW_LANGS[prefs.lang]} <ChevronRight size={18} className="text-g-faint" />
            </span>
          </Row>
        </Group>

        <Group title={tr("Shift")}>
          <Row icon={Coffee} label={tr("On break")} hint={prefs.onBreak ? tr("Guests see “back in 10 min”") : tr("Tables can call you")}>
            <Switch
              on={prefs.onBreak}
              onChange={() => {
                set({ onBreak: !prefs.onBreak });
                onNotify(prefs.onBreak ? tr("Break over") : tr("Break started"));
              }}
              label={tr("On break")}
            />
          </Row>
          <Row icon={MapPin} label={tr("My zone")} hint={tr("Your tables come first")}>
            <Segmented
              value={prefs.zone}
              options={["Hall", "Terrace"]}
              render={(v) => tr(v)}
              onChange={(v) => {
                set({ zone: v });
                onNotify(tr("Zone"), tr(v));
              }}
            />
          </Row>
          <Row icon={DoorOpen} label={tr("End shift")} hint={tr("Started 10:00 · 4 tables closed")}>
            <button
              onClick={() => {
                haptic("light");
                onNotify(tr("Shift report sent"), tr("Your manager gets today's totals and tips"));
              }}
              className="press h-9 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
            >
              {tr("End")}
            </button>
          </Row>
        </Group>

        <Group title={tr("Notifications")}>
          <Row icon={BellRing} label={tr("Notifications")} hint={`${tr("{a} of {b} on", { a: on, b: total })} · ${prefs.notify.sound ? tr("sound") : tr("silent")}`} onClick={() => setSub("notifications")}>
            <ChevronRight size={18} className="text-g-faint" />
          </Row>
        </Group>

        <Group title={tr("Appearance")}>
          <Row icon={Moon} label={tr("Dark theme")} hint={tr("Same choice as the guest menu on this phone")}>
            <Switch on={dark} onChange={onTheme} label={tr("Dark theme")} />
          </Row>
          <Row icon={Type} label={tr("Text size")}>
            <Segmented
              value={prefs.text}
              options={["default", "large"]}
              render={(v) => (v === "default" ? tr("Default") : tr("Large"))}
              onChange={(v) => set({ text: v })}
            />
          </Row>
        </Group>

        <Group title={tr("Devices")}>
          <Row icon={Printer} label={tr("Check printer")} hint={`${printer.name} · ${tr(printer.place)}`} onClick={() => setSub("printer")}>
            <span className="flex items-center gap-2">
              <span className="chip-green inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold">{tr("Connected")}</span>
              <ChevronRight size={18} className="text-g-faint" />
            </span>
          </Row>
        </Group>

        <Group title={tr("Security")}>
          <Row icon={Lock} label={tr("PIN on open")}>
            <Switch on={prefs.pin} onChange={() => set({ pin: !prefs.pin })} label={tr("PIN on open")} />
          </Row>
          <Row icon={ScanFace} label="Face ID">
            <Switch on={prefs.faceId} onChange={() => set({ faceId: !prefs.faceId })} label="Face ID" />
          </Row>
        </Group>

        <Group title={tr("About")}>
          <Row icon={LifeBuoy} label={tr("Help and support")} onClick={() => onNotify(tr("Support"), tr("Write to us in Zalo or Telegram"))}>
            <ChevronRight size={18} className="text-g-faint" />
          </Row>
          <Row icon={Info} label={tr("App version")}>
            <span className="text-[15px] text-g-muted">yanyin crew 0.8 · demo</span>
          </Row>
        </Group>

        {onRoles && (
          <button onClick={onRoles} className="press mt-8 h-14 w-full rounded-full bg-g-fill text-[16px] font-semibold">
            {tr("Switch role")}
          </button>
        )}
        <a href="login.html" className="press mt-3 flex h-14 w-full items-center justify-center rounded-full bg-g-fill text-[16px] font-semibold text-[#e5484d]">
          {tr("Sign out")}
        </a>
        <p className="mt-6 mb-4 text-center text-[12px] text-g-faint">{tr("Settings save on this phone and sync with your account later.")}</p>
      </div>

      {sub === "notifications" && <NotificationSettings onClose={() => setSub(null)} />}
      {sub === "printer" && <PrinterPage onClose={() => setSub(null)} onNotify={onNotify} />}
      {sub === "language" && <LanguagePage onClose={() => setSub(null)} />}
    </Sheet>
  );
}

/** Notification settings by category, each with its own icon; sound and vibration last. */
function NotificationSettings({ onClose }: { onClose: () => void }) {
  const { prefs, set, tr } = usePrefs();
  const n = prefs.notify;
  const flip = (k: keyof NotifyPrefs) => set({ notify: { ...n, [k]: !n[k] } });
  const groups: { title: string; rows: { k: keyof NotifyPrefs; icon: LucideIcon; label: string; hint: string; chip: string }[] }[] = [
    {
      title: tr("Orders"),
      rows: [
        { k: "qrOrders", icon: QrCode, label: tr("Orders from the QR menu"), hint: tr("Guests ordered at the table"), chip: "chip-blue" },
        { k: "newOrders", icon: UtensilsCrossed, label: tr("New orders on my tables"), hint: tr("Any new item on your tables"), chip: "chip-blue" },
      ],
    },
    { title: tr("Kitchen"), rows: [{ k: "kitchenReady", icon: ChefHat, label: tr("Dish is ready"), hint: tr("Pick it up at the pass"), chip: "chip-green" }] },
    {
      title: tr("Bills and calls"),
      rows: [
        { k: "bills", icon: ReceiptText, label: tr("Bill requests"), hint: tr("A table asked for the check"), chip: "chip-orange" },
        { k: "calls", icon: Bell, label: tr("Waiter calls"), hint: tr("A guest pressed “Waiter”"), chip: "chip-orange" },
        { k: "payments", icon: CreditCard, label: tr("Payments"), hint: tr("Paid by QR or card"), chip: "chip-green" },
      ],
    },
    {
      title: tr("Bookings"),
      rows: [
        { k: "bookings", icon: CalendarPlus, label: tr("New bookings"), hint: tr("Someone booked a table"), chip: "chip-teal" },
        { k: "arrivals", icon: CalendarCheck, label: tr("Guest arrived"), hint: tr("A booked guest is at the door"), chip: "chip-teal" },
      ],
    },
    { title: tr("Team"), rows: [{ k: "quests", icon: BadgeCheck, label: tr("Quests and badges"), hint: tr("New quests, rewards, levels"), chip: "chip-blue" }] },
  ];
  return (
    <Sheet open onClose={onClose} label={tr("Notifications")}>
      <div className="px-5 pb-10">
        {groups.map((g) => (
          <Group key={g.title} title={g.title}>
            {g.rows.map((r) => (
              <Row key={r.k} icon={r.icon} chip={r.chip} label={r.label} hint={r.hint}>
                <Switch on={n[r.k]} onChange={() => flip(r.k)} label={r.label} />
              </Row>
            ))}
          </Group>
        ))}
        <Group title={tr("How they arrive")}>
          <Row icon={Volume2} label={tr("Sound")} hint={tr("A short chime")}>
            <Switch on={n.sound} onChange={() => flip("sound")} label={tr("Sound")} />
          </Row>
          <Row icon={Vibrate} label={tr("Vibration")} hint={tr("Feel it in your pocket")}>
            <Switch on={n.vibration} onChange={() => flip("vibration")} label={tr("Vibration")} />
          </Row>
        </Group>
      </div>
    </Sheet>
  );
}

const PRINTERS = [
  { id: "hall", name: "Sunmi V2", place: "Hall", kind: "Bluetooth" },
  { id: "bar", name: "Xprinter XP-58", place: "Bar", kind: "Wi-Fi" },
  { id: "kitchen", name: "Epson TM-T20", place: "Kitchen", kind: "Wi-Fi" },
];

/** The check printer: status, test print, which printer, and how checks print. */
function PrinterPage({ onClose, onNotify }: { onClose: () => void; onNotify: (title: string, text?: string) => void }) {
  const { prefs, set, tr } = usePrefs();
  const pr = prefs.printer;
  const cur = PRINTERS.find((x) => x.id === pr.id) ?? PRINTERS[0]!;
  return (
    <Sheet open onClose={onClose} label={tr("Check printer")}>
      <div className="px-5 pb-10">
        <section className="flex items-center gap-4 rounded-[24px] bg-g-fill p-4">
          <span className="blue-grad grid size-14 shrink-0 place-items-center rounded-full">
            <Printer size={24} strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[18px] font-semibold">{cur.name}</span>
            <span className="block text-[14px] text-g-muted">
              {tr(cur.place)} · {cur.kind} · {tr("paper OK")}
            </span>
          </span>
          <span className="chip-green inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold">{tr("Online")}</span>
        </section>
        <button
          onClick={() => {
            haptic("success");
            onNotify(tr("Test page sent"), `${cur.name} · ${tr(cur.place)}`);
          }}
          className="press mt-3 h-12 w-full rounded-full bg-g-ink text-[15px] font-semibold text-white"
        >
          {tr("Print a test page")}
        </button>

        <Group title={tr("Printers nearby")}>
          {PRINTERS.map((x) => (
            <Row
              key={x.id}
              icon={Printer}
              label={x.name}
              hint={`${tr(x.place)} · ${x.kind}`}
              onClick={() => {
                haptic("tick");
                set({ printer: { ...pr, id: x.id } });
                onNotify(tr("Printer connected"), `${x.name} · ${tr(x.place)}`);
              }}
            >
              {x.id === pr.id ? <Check size={20} strokeWidth={2.5} className="text-g-blue" /> : <span className="text-[14px] font-semibold text-g-blue">{tr("Connect")}</span>}
            </Row>
          ))}
        </Group>

        <Group title={tr("Checks")}>
          <Row icon={ReceiptText} label={tr("Print the check automatically")} hint={tr("When a table asks for the bill")}>
            <Switch on={pr.autoPrint} onChange={() => set({ printer: { ...pr, autoPrint: !pr.autoPrint } })} label={tr("Print the check automatically")} />
          </Row>
          <Row icon={Armchair} label={tr("Copies")}>
            <Segmented value={String(pr.copies) as "1" | "2"} options={["1", "2"]} onChange={(v) => set({ printer: { ...pr, copies: Number(v) as 1 | 2 } })} />
          </Row>
          <Row icon={Smartphone} label={tr("Paper width")}>
            <Segmented value={String(pr.width) as "58" | "80"} options={["58", "80"]} render={(v) => `${v} mm`} onChange={(v) => set({ printer: { ...pr, width: Number(v) as 58 | 80 } })} />
          </Row>
        </Group>
      </div>
    </Sheet>
  );
}

/** Interface language for the waiter app. */
function LanguagePage({ onClose }: { onClose: () => void }) {
  const { prefs, set, tr } = usePrefs();
  return (
    <Sheet open onClose={onClose} label={tr("Language")}>
      <div className="px-5 pb-10">
        <div className="divide-y divide-g-line">
          {(Object.keys(CREW_LANGS) as CrewLang[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                haptic("tick");
                set({ lang: l });
              }}
              className="press flex h-16 w-full items-center gap-3 text-left"
            >
              <span className="flex-1 text-[17px] font-semibold">{CREW_LANGS[l]}</span>
              {prefs.lang === l && <Check size={22} strokeWidth={2.5} className="text-g-blue" />}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-g-muted">{tr("Menu items keep the language the venue wrote them in.")}</p>
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

function Row({ icon: Icon, label, hint, children, onClick, chip = "chip-blue" }: { icon: LucideIcon; label: string; hint?: string; children: ReactNode; onClick?: () => void; chip?: string }) {
  const body = (
    <>
      <span className={`${chip} grid size-9 shrink-0 place-items-center rounded-full`}>
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
function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
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

function Segmented<T extends string>({ value, options, onChange, render = (v) => v }: { value: T; options: T[]; onChange: (v: T) => void; render?: (v: T) => string }) {
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
          {render(o)}
        </button>
      ))}
    </div>
  );
}

/** Round avatar: the photo, or the first letter on ink. */
function Avatar({ me, size }: { me: Me; size: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-g-ink font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local photo the waiter picked */}
      {me.photo ? <img src={me.photo} alt="" className="size-full object-cover" /> : me.first[0]}
    </span>
  );
}

/** Personal info: photo, first and last name, phone and email. */
export function PersonalInfoPage({ me, onSave, onClose }: { me: Me; onSave: (m: Me) => void; onClose: () => void }) {
  const { tr } = usePrefs();
  const [d, setD] = useState(me);
  const changed = JSON.stringify(d) !== JSON.stringify(me);
  const ok = d.first.trim().length > 0 && d.phone.trim().length > 5 && /.+@.+\..+/.test(d.email);
  const field = "h-12 w-full rounded-[16px] bg-g-fill px-4 text-[16px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30";
  const set = (k: keyof Me) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Personal info")}
      footer={
        <button disabled={!changed || !ok} onClick={() => onSave({ ...d, first: d.first.trim(), last: d.last.trim() })} className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold disabled:opacity-40">
          {tr("Save")}
        </button>
      }
    >
      <div className="px-5 pt-2 pb-8">
        <div className="flex flex-col items-center">
          <Avatar me={d} size={104} />
          <div className="mt-4 flex gap-2">
            <label className="press flex h-10 cursor-pointer items-center gap-2 rounded-full bg-g-fill px-4 text-[14px] font-semibold">
              <Camera size={16} strokeWidth={2} /> {d.photo ? tr("Change photo") : tr("Add photo")}
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
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">{tr("First name")}</span>
            <input value={d.first} onChange={set("first")} autoComplete="given-name" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">{tr("Last name")}</span>
            <input value={d.last} onChange={set("last")} autoComplete="family-name" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">{tr("Phone or Zalo")}</span>
            <input value={d.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-g-muted">Email</span>
            <input value={d.email} onChange={set("email")} inputMode="email" autoComplete="email" className={field} />
          </label>
        </div>
        <p className="mt-4 text-[13px] text-g-muted">{tr("Your role and venue are set by the manager.")}</p>
      </div>
    </Sheet>
  );
}
