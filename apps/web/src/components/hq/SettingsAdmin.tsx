"use client";

import { Banknote, Check, Clock, CreditCard, FileCheck2, Globe2, Image as ImageIcon, MapPin, MonitorSmartphone, Percent, Printer, QrCode, Receipt, Store, Tablet, Wallet, Wifi } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { createStore } from "@/lib/store";
import { Sheet } from "@/components/guest/ui";
import { BrandQr, Choice, Field, Group, Row, Switch, TextField } from "@/components/system/Kit";
import { useTr } from "@/components/crew/prefs";

/*
 * Venue settings and the plan (docs/09 §16–17). Each group is a row that opens
 * its own page; changes save at once and say so. Station tablets show the
 * pairing code the wall tablet asks for (kitchen.html).
 */

type Settings = {
  name: string;
  address: string;
  hours: string;
  langs: string[];
  photo: string[];
  service: string[];
  wifiName: string;
  wifiPass: string;
  pay: Record<string, boolean>;
  einvoice: string[];
  tax: string;
  printers: Record<string, boolean>;
  tablets: { id: string; name: string; station: string; seen: string }[];
};
export const settingsStore = createStore<Settings>("yanyin:venue-settings", {
  name: "Samarkand",
  address: "38 An Thượng 4, Đà Nẵng",
  hours: "10:00 – 23:00",
  langs: ["en", "vi", "ru"],
  photo: ["landscape"],
  service: ["5"],
  wifiName: "Samarkand_Guest",
  wifiPass: "plov2026",
  pay: { cash: true, card: true, vietqr: true, momo: false },
  einvoice: ["misa"],
  tax: "0401234567",
  printers: { hall: true, kitchen: true, bar: true },
  tablets: [
    { id: "t1", name: "Kitchen tablet", station: "Hot kitchen", seen: "now" },
    { id: "t2", name: "Bar tablet", station: "Bar", seen: "now" },
  ],
});
const PAIR_CODE = "4827";

type Page = "venue" | "guests" | "wifi" | "pay" | "einvoice" | "printers" | "tablets" | "plan";

export function SettingsAdmin({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const s = settingsStore.use();
  const [page, setPage] = useState<Page | null>(null);
  const put = (p: Partial<Settings>) => {
    settingsStore.set({ ...s, ...p });
    haptic("tick");
  };
  const saved = () => notify(tr("Saved"));
  const pays = Object.entries(s.pay).filter(([, v]) => v).length;
  return (
    <div className="grid gap-5 md:grid-cols-2 md:items-start">
      <Group title={tr("Venue")}>
        <Row icon={Store} title={s.name} sub={`${s.address} · ${s.hours}`} onClick={() => setPage("venue")} />
        <Row icon={Globe2} title={tr("Guest menu")} sub={tr("{n} languages · service {p}%", { n: s.langs.length, p: s.service[0] ?? 0 })} onClick={() => setPage("guests")} />
        <Row icon={Wifi} title={tr("Wi-Fi for guests")} sub={s.wifiName} onClick={() => setPage("wifi")} />
      </Group>
      <Group title={tr("Money")}>
        <Row icon={Wallet} title={tr("Payments")} sub={tr("{n} ways to pay", { n: pays })} onClick={() => setPage("pay")} />
        <Row icon={FileCheck2} title={tr("E-invoices")} sub={s.einvoice[0] === "none" ? tr("Not connected") : `${s.einvoice[0]!.toUpperCase()} · ${tr("connected")}`} onClick={() => setPage("einvoice")} />
        <Row icon={Receipt} title={tr("Plan and billing")} sub={tr("Pro · next payment 1 Dec")} onClick={() => setPage("plan")} />
      </Group>
      <Group title={tr("Devices")}>
        <Row icon={Printer} title={tr("Printers")} sub={tr("{n} on", { n: Object.values(s.printers).filter(Boolean).length })} onClick={() => setPage("printers")} />
        <Row icon={Tablet} title={tr("Station tablets")} sub={tr("{n} connected", { n: s.tablets.length })} onClick={() => setPage("tablets")} />
      </Group>

      {page === "venue" && (
        <Page label={tr("Venue")} onClose={() => setPage(null)} onDone={saved}>
          <Field label={tr("Venue name")}>
            <TextField value={s.name} onChange={(v) => put({ name: v })} />
          </Field>
          <Field label={tr("Address")}>
            <TextField value={s.address} onChange={(v) => put({ address: v })} prefix={<MapPin size={17} />} />
          </Field>
          <Field label={tr("Opening hours")} hint={tr("Guests can look at the menu after hours, but not order.")}>
            <TextField value={s.hours} onChange={(v) => put({ hours: v })} prefix={<Clock size={17} />} />
          </Field>
        </Page>
      )}
      {page === "guests" && (
        <Page label={tr("Guest menu")} onClose={() => setPage(null)} onDone={saved}>
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Menu languages")}</p>
            <Choice multi value={s.langs} onChange={(v) => v.length && put({ langs: v })} options={[{ id: "en", label: "English" }, { id: "vi", label: "Tiếng Việt" }, { id: "ru", label: "Русский" }, { id: "ko", label: "한국어" }, { id: "zh", label: "中文" }]} />
          </div>
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Photos in the menu list")}</p>
            <Choice value={s.photo} onChange={(v) => put({ photo: v })} options={[{ id: "landscape", label: tr("Landscape 4:3"), icon: ImageIcon }, { id: "portrait", label: tr("Portrait 3:4") }, { id: "square", label: tr("Square") }]} />
          </div>
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Service charge")}</p>
            <Choice value={s.service} onChange={(v) => put({ service: v })} options={["0", "5", "10"].map((p) => ({ id: p, label: `${p}%`, icon: Percent }))} />
          </div>
        </Page>
      )}
      {page === "wifi" && (
        <Page label={tr("Wi-Fi for guests")} onClose={() => setPage(null)} onDone={saved}>
          <Field label={tr("Network")}>
            <TextField value={s.wifiName} onChange={(v) => put({ wifiName: v })} prefix={<Wifi size={17} />} />
          </Field>
          <Field label={tr("Password")} hint={tr("Guests see it on the Wi-Fi card of the menu, with a QR to join.")}>
            <TextField value={s.wifiPass} onChange={(v) => put({ wifiPass: v })} />
          </Field>
        </Page>
      )}
      {page === "pay" && (
        <Page label={tr("Payments")} onClose={() => setPage(null)} onDone={saved}>
          <Group>
            {(
              [
                ["cash", Banknote, tr("Cash"), tr("The waiter takes it at the table")],
                ["card", CreditCard, tr("Card"), tr("On the venue's terminal")],
                ["vietqr", QrCode, "VietQR", tr("Any banking app, straight to the venue's account")],
                ["momo", Wallet, "MoMo", tr("E-wallet")],
              ] as const
            ).map(([id, Icon, t, sub]) => (
              <Row key={id} icon={Icon} title={t} sub={sub} right={<Switch on={!!s.pay[id]} onChange={(v) => put({ pay: { ...s.pay, [id]: v } })} label={t} />} />
            ))}
          </Group>
        </Page>
      )}
      {page === "einvoice" && (
        <Page label={tr("E-invoices")} onClose={() => setPage(null)} onDone={saved}>
          <p className="rounded-[24px] bg-g-tint-blue px-4 py-3.5 text-[13.5px] leading-snug text-g-ink-2">{tr("Since 2025 every bill in Vietnam needs a POS e-invoice sent to the tax office. We send it for you when a bill is paid.")}</p>
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("E-invoice provider")}</p>
            <Choice value={s.einvoice} onChange={(v) => put({ einvoice: v })} options={[{ id: "misa", label: "MISA" }, { id: "viettel", label: "Viettel" }, { id: "vnpt", label: "VNPT" }, { id: "bkav", label: "BKAV" }, { id: "none", label: tr("Not yet") }]} />
          </div>
          <Field label={tr("Tax code")}>
            <TextField value={s.tax} onChange={(v) => put({ tax: v.replace(/[^\d-]/g, "") })} inputMode="numeric" />
          </Field>
          {s.einvoice[0] !== "none" && (
            <Group>
              <Row icon={Check} title={tr("Connected")} sub={tr("Last e-invoice: 12:05, bill #1042")} />
            </Group>
          )}
        </Page>
      )}
      {page === "printers" && (
        <Page label={tr("Printers")} onClose={() => setPage(null)} onDone={saved}>
          <Group>
            {(
              [
                ["hall", tr("Hall printer"), tr("Bills and receipts · 80 mm")],
                ["kitchen", tr("Kitchen printer"), tr("Tickets if the screen is off · 80 mm")],
                ["bar", tr("Bar printer"), tr("Drink tickets · 58 mm")],
              ] as const
            ).map(([id, t, sub]) => (
              <Row key={id} icon={Printer} title={t} sub={sub} right={<Switch on={!!s.printers[id]} onChange={(v) => put({ printers: { ...s.printers, [id]: v } })} label={t} />} />
            ))}
          </Group>
          <button type="button" onClick={() => (haptic("success"), notify(tr("Test page sent to every printer")))} className="press h-12 rounded-full bg-g-fill text-[15px] font-semibold">
            {tr("Print a test page")}
          </button>
        </Page>
      )}
      {page === "tablets" && (
        <Page label={tr("Station tablets")} onClose={() => setPage(null)} onDone={saved}>
          <div className="card flex items-center gap-4 rounded-[26px] p-4">
            <BrandQr value={`https://yanyin.app/pair/samarkand-${PAIR_CODE}`} size={112} label={tr("Pairing QR code")} />
            <div className="min-w-0">
              <p className="text-[14px] text-g-muted">{tr("Code for a new tablet")}</p>
              <p className="text-[40px] leading-none font-bold tracking-[0.12em] tabular-nums">{PAIR_CODE}</p>
              <p className="mt-1.5 text-[12.5px] leading-snug text-g-muted">{tr("Open kitchen.html on the tablet and enter it. The code changes every hour.")}</p>
            </div>
          </div>
          <Group title={tr("Connected")}>
            {s.tablets.map((t) => (
              <Row
                key={t.id}
                icon={MonitorSmartphone}
                title={tr(t.name)}
                sub={`${tr(t.station)} · ${tr("online now")}`}
                right={
                  <button type="button" onClick={() => (put({ tablets: s.tablets.filter((x) => x.id !== t.id) }), notify(tr("Tablet disconnected")))} className="press h-9 rounded-full bg-g-card px-3.5 text-[13px] font-semibold text-[#e5484d]">
                    {tr("Disconnect")}
                  </button>
                }
              />
            ))}
          </Group>
        </Page>
      )}
      {page === "plan" && <PlanPage onClose={() => setPage(null)} notify={notify} />}
    </div>
  );
}

function Page({ label, onClose, onDone, children }: { label: string; onClose: () => void; onDone: () => void; children: React.ReactNode }) {
  const tr = useTr();
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={label}
      footer={
        <button
          type="button"
          onClick={() => {
            haptic("success");
            onDone();
            onClose();
          }}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Done")}
        </button>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">{label}</h2>
        {children}
      </div>
    </Sheet>
  );
}

function PlanPage({ onClose, notify }: { onClose: () => void; notify: (t: string) => void }) {
  const tr = useTr();
  const [plan, setPlan] = useState("pro");
  const plans = [
    { id: "free", name: "Free", price: "0 ₫", what: [tr("QR menu"), tr("Menu editor")] },
    { id: "starter", name: "Starter", price: "690k ₫", what: [tr("Orders and station screens"), tr("Basic reports"), tr("Food Roulette")] },
    { id: "pro", name: "Pro", price: "1.49M ₫", what: [tr("Team, quests, checklists"), tr("Reports and exports"), tr("E-invoices")] },
    { id: "ultimate", name: "Ultimate", price: "2.99M ₫", what: [tr("Yan for the manager"), tr("Several venues"), tr("API")] },
  ];
  return (
    <Sheet open wide onClose={onClose} label={tr("Plan and billing")}>
      <div className="grid gap-5 px-5 pt-2 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">{tr("Plan and billing")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const on = plan === p.id;
            return (
              <button key={p.id} type="button" onClick={() => (haptic("light"), setPlan(p.id), p.id !== "pro" && notify(tr("Plan change requested · from the next month")))} className={`press flex flex-col rounded-[24px] p-4 text-left transition-colors ${on ? "spin-ring bg-g-blue-soft" : "bg-g-fill"}`}>
                <span className="flex items-center justify-between">
                  <span className={`text-[18px] font-bold ${on ? "text-g-blue" : ""}`}>{p.name}</span>
                  {on && <span className="blue-grad rounded-full px-2.5 py-1 text-[11.5px] font-bold">{tr("Your plan")}</span>}
                </span>
                <span className="mt-2 text-[24px] font-bold tracking-[-0.02em] tabular-nums">{p.price}</span>
                <span className="text-[12.5px] text-g-muted">{tr("per venue a month")}</span>
                <span className="mt-3 grid gap-1.5">
                  {p.what.map((w) => (
                    <span key={w} className="flex items-center gap-1.5 text-[13px]">
                      <Check size={14} strokeWidth={2.8} className="shrink-0 text-g-green" /> {w}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <Group title={tr("Invoices")}>
          {["1 Nov", "1 Oct", "1 Sep"].map((d) => (
            <Row key={d} icon={Receipt} title={`Pro · 1,490,000 ₫`} sub={`${tr(d)} · ${tr("paid by card ·· 4242")}`} right={<span className="chip-green rounded-full px-2.5 py-1 text-[12px] font-semibold">{tr("Paid")}</span>} />
          ))}
        </Group>
      </div>
    </Sheet>
  );
}
