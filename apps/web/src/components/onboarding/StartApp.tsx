"use client";

import { ArrowRight, Banknote, Camera, Check, ChevronLeft, Copy, CreditCard, FileUp, Minus, Plus, QrCode, Share2, Smartphone, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { ArtScene, type ArtName } from "@/components/system/Art";
import { NorthSky } from "@/components/system/NorthSky";
import { BrandQr, Choice, Field, PhotoPick, Row, Switch, TextField, useStepHistory } from "@/components/system/Kit";
import { CrewPrefsProvider, useTr } from "@/components/crew/prefs";

/*
 * Connecting a venue in one sitting (docs/09, wave 1): the venue → the menu
 * (Yan reads a photo of the paper menu) → halls and tables → the team →
 * payments and e-invoices. Every answer is kept on this device, so closing
 * the page loses nothing. Back walks the steps. The end screen opens the
 * admin console.
 */

type Zone = { id: string; name: string; tables: number };
type Invite = { id: string; name: string; phone: string; role: string };
type Setup = {
  name: string;
  kind: string[];
  city: string;
  langs: string[];
  menu: "photo" | "file" | "empty" | null;
  menuDone: boolean;
  zones: Zone[];
  invites: Invite[];
  pay: Record<string, boolean>;
  service: string[];
  einvoice: string[];
  tax: string;
};

const KEY = "yanyin:onboarding";
const START: Setup = {
  name: "",
  kind: ["restaurant"],
  city: "Da Nang",
  langs: ["en", "vi", "ru"],
  menu: null,
  menuDone: false,
  zones: [
    { id: "z1", name: "Hall", tables: 8 },
    { id: "z2", name: "Terrace", tables: 4 },
  ],
  invites: [],
  pay: { cash: true, card: true, vietqr: true, momo: false, zalopay: false },
  service: ["5"],
  einvoice: ["misa"],
  tax: "",
};

export function StartApp() {
  return (
    <CrewPrefsProvider>
      <Start />
    </CrewPrefsProvider>
  );
}

function Start() {
  const tr = useTr();
  const { step, go, back } = useStepHistory();
  const [s, setS] = useState<Setup>(START);
  // Answers survive a closed tab.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved answers once
      if (raw) setS({ ...START, ...(JSON.parse(raw) as Partial<Setup>) });
    } catch {}
  }, []);
  const put = (p: Partial<Setup>) =>
    setS((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const steps = [tr("Venue"), tr("Menu"), tr("Tables"), tr("Team"), tr("Payments")];
  const titles = [tr("Your venue"), tr("Your menu"), tr("Halls and tables"), tr("Your team"), tr("Payments and receipts")];
  const subs = [
    tr("Name, type and the languages guests read the menu in."),
    tr("Snap the paper menu: Yan turns it into cards with photos, prices and translations."),
    tr("Each table gets its own QR code; guests order from it."),
    tr("Invite people now or later; each picks their @ID on the first sign-in."),
    tr("How guests pay and who issues e-invoices to the tax office."),
  ];
  const ok = [s.name.trim().length > 1, s.menuDone || s.menu === "empty", s.zones.some((z) => z.tables > 0), true, Object.values(s.pay).some(Boolean)][step] ?? true;
  const tables = s.zones.reduce((n, z) => n + z.tables, 0);

  if (step === 5) return <Ready s={s} tables={tables} onEdit={(i) => go(i)} />;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-white pb-28 text-g-ink">
      <section className="relative isolate px-5 pt-[max(16px,env(safe-area-inset-top))] pb-8 text-white">
        <NorthSky />
        <div className="mx-auto max-w-[560px]">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button type="button" aria-label={tr("Back")} onClick={back} className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
            ) : (
              <a href="login.html" aria-label={tr("Close")} className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
                <X size={20} strokeWidth={2} />
              </a>
            )}
            <span className="ml-1 text-[15px] font-semibold">{tr("New venue")}</span>
            <span className="ml-auto text-[13px] font-semibold text-white/70 tabular-nums">
              {step + 1}/{steps.length}
            </span>
          </div>
          {/* Progress on the sky: one segment per step. */}
          <div className="mt-6 flex gap-1.5">
            {steps.map((st, i) => (
              <span key={st} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <span className="block h-full rounded-full bg-white transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: i < step ? "100%" : i === step ? "45%" : "0%" }} />
              </span>
            ))}
          </div>
          <div key={step} className="animate-tab mt-8">
            <p className="text-[14px] font-semibold text-white/70">{steps[step]}</p>
            <h1 className="mt-1 text-[30px] leading-tight font-bold tracking-[-0.025em]">{titles[step]}</h1>
            <p className="mt-1.5 text-[15px] leading-snug text-white/75">{subs[step]}</p>
          </div>
        </div>
      </section>

      <div key={`b${step}`} className="animate-tab relative z-10 mx-auto max-w-[560px] px-5">
        {step === 0 && <VenueStep s={s} put={put} />}
        {step === 1 && <MenuStep s={s} put={put} />}
        {step === 2 && <TablesStep s={s} put={put} tables={tables} />}
        {step === 3 && <TeamStep s={s} put={put} />}
        {step === 4 && <PayStep s={s} put={put} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-g-line bg-white/95 px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[560px] gap-3">
          {((step === 1 && !s.menuDone) || (step === 3 && !s.invites.length)) && (
            <button
              type="button"
              onClick={() => {
                if (step === 1) put({ menu: "empty" });
                go(step + 1);
              }}
              className="press h-14 rounded-full bg-g-fill px-5 text-[15px] font-semibold text-g-ink-2"
            >
              {tr("Later")}
            </button>
          )}
          <button type="button" disabled={!ok} onClick={() => go(step + 1)} className="blue-grad press flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40">
            {step === 4 ? tr("Finish") : tr("Continue")} <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </main>
  );
}

type StepProps = { s: Setup; put: (p: Partial<Setup>) => void };

function VenueStep({ s, put }: StepProps) {
  const tr = useTr();
  return (
    <div className="grid gap-6">
      <Field label={tr("Venue name")} hint={tr("Guests see it on the menu and the receipt.")}>
        <TextField value={s.name} onChange={(v) => put({ name: v })} placeholder="Samarkand" autoFocus />
      </Field>
      <div>
        <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Type")}</p>
        <Choice
          value={s.kind}
          onChange={(v) => put({ kind: v })}
          options={[
            { id: "restaurant", label: tr("Restaurant") },
            { id: "cafe", label: tr("Café") },
            { id: "bar", label: tr("Bar") },
            { id: "hookah", label: tr("Hookah lounge") },
            { id: "hotel", label: tr("Hotel") },
          ]}
        />
      </div>
      <Field label={tr("City")}>
        <TextField value={s.city} onChange={(v) => put({ city: v })} placeholder="Da Nang" />
      </Field>
      <div>
        <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Menu languages")}</p>
        <Choice
          multi
          value={s.langs}
          onChange={(v) => v.length && put({ langs: v })}
          options={[
            { id: "en", label: "English" },
            { id: "vi", label: "Tiếng Việt" },
            { id: "ru", label: "Русский" },
            { id: "ko", label: "한국어" },
            { id: "zh", label: "中文" },
          ]}
        />
        <p className="mt-2 px-1 text-[13px] text-g-muted">{tr("Yan translates every dish; you check the drafts.")}</p>
      </div>
      <Group>
        <Row icon={Wallet} title={tr("Currency")} sub={tr("Vietnamese dong, from the city")} right={<span className="text-[15px] font-semibold">VND ₫</span>} />
      </Group>
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="card rounded-[24px] p-1.5">{children}</div>;
}

/** Three ways in; the photo one shows Yan reading the menu, then what it found. */
function MenuStep({ s, put }: StepProps) {
  const tr = useTr();
  const [photo, setPhoto] = useState<string>();
  const [reading, setReading] = useState(0);
  useEffect(() => {
    if (!reading || reading >= 100) return;
    const t = setTimeout(() => setReading((r) => Math.min(100, r + 4 + Math.round(Math.random() * 6))), 90);
    return () => clearTimeout(t);
  }, [reading]);
  useEffect(() => {
    if (reading >= 100 && !s.menuDone) {
      haptic("success");
      put({ menuDone: true });
    }
  }, [reading, s.menuDone, put]);
  const ways: { id: Setup["menu"]; art: ArtName; title: string; sub: string; icon: typeof Camera }[] = [
    { id: "photo", art: "menu", title: tr("Snap the paper menu"), sub: tr("Yan reads dishes, prices and categories"), icon: Camera },
    { id: "file", art: "orders", title: tr("Upload a file"), sub: tr("PDF, Excel or a photo from the gallery"), icon: FileUp },
    { id: "empty", art: "pizza", title: tr("Start from scratch"), sub: tr("Add dishes one by one in the menu editor"), icon: Plus },
  ];
  if (s.menuDone)
    return (
      <div className="grid gap-3">
        <ArtScene name="menu" layout="row" focal={56} className="rounded-[26px] p-5" footer={<p className="mt-3 text-[13.5px] text-g-muted">{tr("Drafts: check them in the menu editor before guests see them.")}</p>}>
          <p className="text-[14px] font-semibold text-g-ink-2">{tr("Yan found")}</p>
          <p className="text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums">
            97 <span className="text-[17px] text-g-muted">{tr("dishes in 12 categories")}</span>
          </p>
        </ArtScene>
        <Group>
          {[
            ["Soups", 6],
            ["Salads", 9],
            ["Plov", 5],
            ["Grill", 14],
            ["Drinks", 21],
          ].map(([c, n]) => (
            <Row key={c} icon={Check} title={tr(String(c))} right={<span className="text-[14px] font-semibold text-g-muted tabular-nums">{n}</span>} />
          ))}
        </Group>
        <button
          type="button"
          onClick={() => {
            haptic("light");
            setReading(0);
            setPhoto(undefined);
            put({ menuDone: false, menu: null });
          }}
          className="press h-12 rounded-full bg-g-fill text-[15px] font-semibold text-g-ink-2"
        >
          {tr("Read another photo")}
        </button>
      </div>
    );
  if (reading > 0)
    return (
      <div className="grid gap-4">
        <div className="relative overflow-hidden rounded-[26px] bg-g-fill">
          {/* eslint-disable-next-line @next/next/no-img-element -- the photo the owner just took */}
          {photo && <img src={photo} alt="" className="block max-h-[280px] w-full object-cover opacity-80" />}
          <span className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-g-blue/30 to-transparent" style={{ top: `${reading * 0.9}%`, transition: "top 90ms linear" }} />
        </div>
        <div className="flex items-center gap-3 rounded-full bg-g-fill p-1.5 pr-4">
          <span className="blue-grad grid size-11 shrink-0 place-items-center rounded-full">
            <Sparkles size={19} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{tr("Yan is reading the menu…")}</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-g-card">
              <span className="block h-full rounded-full bg-g-blue transition-[width] duration-100" style={{ width: `${reading}%` }} />
            </span>
          </span>
          <span className="text-[14px] font-semibold text-g-muted tabular-nums">{reading}%</span>
        </div>
      </div>
    );
  return (
    <div className="grid gap-3">
      {ways.map((w) => {
        const on = s.menu === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => {
              haptic("light");
              put({ menu: w.id });
            }}
            aria-pressed={on}
            className={`press relative block rounded-[26px] text-left ${on ? "ring-2 ring-g-blue" : ""}`}
          >
            <ArtScene name={w.art} layout="row" focal={44} className="rounded-[26px] p-4">
              <p className="text-[17px] leading-tight font-bold">{w.title}</p>
              <p className="mt-0.5 text-[13px] text-g-muted">{w.sub}</p>
            </ArtScene>
            {on && (
              <span className="blue-grad absolute top-3 right-3 grid size-7 place-items-center rounded-full">
                <Check size={15} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
      {(s.menu === "photo" || s.menu === "file") && (
        <div className="animate-rise mt-2 grid gap-3">
          <PhotoPick value={photo} onChange={setPhoto} label={s.menu === "photo" ? tr("Take a photo of the menu") : tr("Pick a file")} />
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setReading(1);
            }}
            className="blue-grad press flex h-14 items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
          >
            <Sparkles size={18} strokeWidth={2.2} /> {photo ? tr("Read the menu") : tr("Try with our demo menu")}
          </button>
        </div>
      )}
    </div>
  );
}

function TablesStep({ s, put, tables }: StepProps & { tables: number }) {
  const tr = useTr();
  const set = (id: string, p: Partial<Zone>) => put({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...p } : z)) });
  let no = 0;
  return (
    <div className="grid gap-3">
      {s.zones.map((z) => (
        <div key={z.id} className="card rounded-[24px] p-4">
          <div className="flex items-center gap-2">
            <input value={tr(z.name)} onChange={(e) => set(z.id, { name: e.target.value })} aria-label={tr("Zone name")} className="h-11 min-w-0 flex-1 rounded-full bg-g-card px-4 text-[16px] font-semibold outline-none focus:ring-2 focus:ring-g-blue/40" />
            {s.zones.length > 1 && (
              <button
                type="button"
                aria-label={tr("Remove zone")}
                onClick={() => {
                  haptic("light");
                  put({ zones: s.zones.filter((x) => x.id !== z.id) });
                }}
                className="press grid size-11 shrink-0 place-items-center rounded-full bg-g-card text-g-muted"
              >
                <Trash2 size={17} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <span className="text-[15px] text-g-muted">{tr("Tables")}</span>
            <span className="flex items-center gap-1 rounded-full bg-g-card p-1">
              <button type="button" aria-label={tr("Fewer")} onClick={() => (haptic("tick"), set(z.id, { tables: Math.max(0, z.tables - 1) }))} className="press grid size-10 place-items-center rounded-full">
                <Minus size={18} strokeWidth={2.2} />
              </button>
              <span className="w-8 text-center text-[18px] font-bold tabular-nums">{z.tables}</span>
              <button type="button" aria-label={tr("More")} onClick={() => (haptic("tick"), set(z.id, { tables: Math.min(60, z.tables + 1) }))} className="press grid size-10 place-items-center rounded-full">
                <Plus size={18} strokeWidth={2.2} />
              </button>
            </span>
          </div>
          {/* Preview: the numbers the QR codes will carry. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: z.tables }, () => ++no).map((n) => (
              <span key={n} className="grid size-9 place-items-center rounded-full bg-g-card text-[13px] font-bold tabular-nums">
                {n}
              </span>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          haptic("light");
          put({ zones: [...s.zones, { id: `z${Date.now()}`, name: tr("New zone"), tables: 4 }] });
        }}
        className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
      >
        <Plus size={17} strokeWidth={2.4} className="text-g-blue" /> {tr("Add a zone")}
      </button>
      <p className="px-1 text-center text-[13px] text-g-muted">{tr("{n} tables in total. You print the QR codes from the admin console.", { n: tables })}</p>
    </div>
  );
}

function TeamStep({ s, put }: StepProps) {
  const tr = useTr();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(["Waiter"]);
  const [copied, setCopied] = useState(false);
  const link = "yanyin.app/join/samarkand-8F2K";
  return (
    <div className="grid gap-6">
      <div className="card flex items-center gap-4 rounded-[26px] p-4">
        <BrandQr value={`https://${link}`} size={112} label={tr("Invite QR code")} />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold">{tr("One link for the whole team")}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-g-muted">{tr("They scan it, sign in and wait for your approval.")}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                haptic("success");
                navigator.clipboard?.writeText(`https://${link}`).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="press flex h-10 items-center gap-1.5 rounded-full bg-g-card px-3.5 text-[13px] font-semibold"
            >
              {copied ? <Check size={15} strokeWidth={2.6} className="text-g-green" /> : <Copy size={15} strokeWidth={2.2} />} {copied ? tr("Copied") : tr("Copy")}
            </button>
            <button
              type="button"
              onClick={() => {
                haptic("light");
                navigator.share?.({ title: "yanyin", url: `https://${link}` }).catch(() => undefined);
              }}
              className="press flex h-10 items-center gap-1.5 rounded-full bg-g-card px-3.5 text-[13px] font-semibold"
            >
              <Share2 size={15} strokeWidth={2.2} /> {tr("Share")}
            </button>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Or invite by phone")}</p>
        <div className="grid gap-2">
          <TextField value={name} onChange={setName} placeholder={tr("Name")} />
          <TextField value={phone} onChange={(v) => setPhone(v.replace(/[^\d ]/g, ""))} prefix="+84" placeholder="905 000 000" type="tel" inputMode="tel" />
          <Choice value={role} onChange={setRole} options={["Waiter", "Bartender", "Cook", "Host", "Manager"].map((r) => ({ id: r, label: tr(r) }))} />
          <button
            type="button"
            disabled={!name.trim() || phone.replace(/\D/g, "").length < 9}
            onClick={() => {
              haptic("success");
              put({ invites: [...s.invites, { id: `i${Date.now()}`, name: name.trim(), phone, role: role[0]! }] });
              setName("");
              setPhone("");
            }}
            className="blue-grad press mt-1 flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-opacity disabled:opacity-40"
          >
            <Smartphone size={17} strokeWidth={2.2} /> {tr("Send the invite")}
          </button>
        </div>
      </div>
      {s.invites.length > 0 && (
        <div className="grid gap-2">
          {s.invites.map((i) => (
            <div key={i.id} className="animate-rise flex items-center gap-3 rounded-full bg-g-fill p-1.5 pr-1.5">
              <span className="blue-grad grid size-11 shrink-0 place-items-center rounded-full text-[17px] font-bold">{i.name[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{i.name}</span>
                <span className="block truncate text-[12.5px] text-g-muted">
                  {tr(i.role)} · +84 {i.phone} · {tr("invite sent")}
                </span>
              </span>
              <button type="button" aria-label={tr("Cancel the invite")} onClick={() => put({ invites: s.invites.filter((x) => x.id !== i.id) })} className="press grid size-10 shrink-0 place-items-center rounded-full bg-g-card text-g-muted">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayStep({ s, put }: StepProps) {
  const tr = useTr();
  const methods: [string, typeof Banknote, string, string][] = [
    ["cash", Banknote, tr("Cash"), tr("The waiter takes it at the table")],
    ["card", CreditCard, tr("Card"), tr("On the venue's terminal")],
    ["vietqr", QrCode, "VietQR", tr("Any banking app, straight to the venue's account")],
    ["momo", Wallet, "MoMo", tr("E-wallet")],
    ["zalopay", Wallet, "ZaloPay", tr("E-wallet")],
  ];
  return (
    <div className="grid gap-6">
      <Group>
        {methods.map(([id, Icon, title, sub]) => (
          <Row key={id} icon={Icon} title={title} sub={sub} right={<Switch on={!!s.pay[id]} onChange={(v) => put({ pay: { ...s.pay, [id]: v } })} label={title} />} />
        ))}
      </Group>
      <div>
        <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Service charge")}</p>
        <Choice value={s.service} onChange={(v) => put({ service: v })} options={["0", "5", "10"].map((p) => ({ id: p, label: `${p}%` }))} />
        <p className="mt-2 px-1 text-[13px] text-g-muted">{tr("Guests see it on the menu before they order.")}</p>
      </div>
      <div>
        <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("E-invoice provider")}</p>
        <Choice
          value={s.einvoice}
          onChange={(v) => put({ einvoice: v })}
          options={[
            { id: "misa", label: "MISA" },
            { id: "viettel", label: "Viettel" },
            { id: "vnpt", label: "VNPT" },
            { id: "bkav", label: "BKAV" },
            { id: "none", label: tr("Not yet") },
          ]}
        />
        <p className="mt-2 px-1 text-[13px] text-g-muted">{tr("Since 2025 every bill in Vietnam needs a POS e-invoice sent to the tax office. We send it for you.")}</p>
      </div>
      {s.einvoice[0] !== "none" && (
        <Field label={tr("Tax code")} hint={tr("10 or 13 digits, from the business registration.")}>
          <TextField value={s.tax} onChange={(v) => put({ tax: v.replace(/[^\d-]/g, "").slice(0, 14) })} placeholder="0401234567" inputMode="numeric" />
        </Field>
      )}
    </div>
  );
}

/** The end: what is set, what is left, and the way into the console. */
function Ready({ s, tables, onEdit }: { s: Setup; tables: number; onEdit: (step: number) => void }) {
  const tr = useTr();
  const items: [string, string, boolean, number][] = [
    [tr("Venue"), `${s.name || "—"} · ${s.city}`, s.name.trim().length > 1, 0],
    [tr("Menu"), s.menuDone ? tr("97 dishes, drafts to check") : tr("Add dishes in the menu editor"), s.menuDone, 1],
    [tr("Tables"), tr("{n} tables, QR codes ready to print", { n: tables }), tables > 0, 2],
    [tr("Team"), s.invites.length ? tr("{n} invite sent|{n} invites sent", { n: s.invites.length }) : tr("Invite people from the console"), s.invites.length > 0, 3],
    [tr("Payments"), Object.entries(s.pay).filter(([, v]) => v).map(([k]) => (k === "vietqr" ? "VietQR" : k === "momo" ? "MoMo" : k === "zalopay" ? "ZaloPay" : tr(k[0]!.toUpperCase() + k.slice(1)))).join(", "), true, 4],
  ];
  const done = items.filter((i) => i[2]).length;
  return (
    <main className="min-h-dvh bg-white text-g-ink">
      <section className="relative isolate px-5 pt-[max(48px,env(safe-area-inset-top))] pb-10 text-white">
        <NorthSky />
        <div className="mx-auto max-w-[560px]">
          <span className="animate-pop grid size-16 place-items-center rounded-full bg-white text-g-blue">
            <Check size={32} strokeWidth={2.8} />
          </span>
          <h1 className="mt-5 text-[32px] leading-tight font-bold tracking-[-0.025em]">{tr("{name} is ready for its first shift", { name: s.name || tr("Your venue") })}</h1>
          <p className="mt-1.5 text-[15px] text-white/75">{tr("{a} of {b} steps done. The rest can wait; everything is in the console.", { a: done, b: items.length })}</p>
        </div>
      </section>
      <div className="relative z-10 mx-auto grid max-w-[560px] gap-2 px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        {items.map(([title, sub, ok, step]) => (
          <button key={title} type="button" onClick={() => onEdit(step)} className="press flex items-center gap-3 rounded-full bg-g-fill p-1.5 pr-4 text-left">
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${ok ? "chip-green" : "chip-orange"}`}>{ok ? <Check size={19} strokeWidth={2.8} /> : <span className="text-[17px] font-bold">!</span>}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{title}</span>
              <span className="block truncate text-[12.5px] text-g-muted">{sub}</span>
            </span>
            <span className="text-[13px] font-semibold text-g-blue">{tr("Edit")}</span>
          </button>
        ))}
        <a href="hq.html" onClick={() => haptic("success")} className="blue-grad press mt-4 flex h-14 items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
          {tr("Open the admin console")} <ArrowRight size={18} strokeWidth={2.2} />
        </a>
        <a href="samarkand.html?table=1" onClick={() => haptic("light")} className="press flex h-12 items-center justify-center rounded-full bg-g-fill text-[15px] font-semibold">
          {tr("See the menu as a guest")}
        </a>
      </div>
    </main>
  );
}
