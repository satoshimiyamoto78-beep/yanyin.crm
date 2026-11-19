"use client";

import {
  CalendarDays,
  FileText,
  Moon,
  Percent,
  Send,
  ShieldCheck,
  Sun,
  Timer,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import { useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import type {
  Doc,
  HR,
  PayExtra,
  PayExtraKind,
  PayType,
} from "@/lib/demo-hr";
import { Sheet } from "@/components/guest/ui";
import { Switch } from "@/components/system/Kit";
import { compactMoney } from "@/components/crew/CrewApp";
import { useTr } from "@/components/crew/prefs";

/*
 * Documents and pay terms (docs/07 §93).
 * Documents: a photo or a PDF is uploaded, kept with the person and opened
 * in a viewer; number and expiry date sit beside it, and the expiry feeds the
 * reminders. In the demo the file stays in the browser; the backend keeps it
 * in private storage (Supabase Storage, signed links, owner and admin only).
 * Pay: a base (per hour, per shift, monthly) plus extras that add up: share
 * of own sales, a per-shift bonus, night, weekend and overtime rates, and a
 * monthly minimum. The sheet shows what a usual month comes to.
 */

const TODAY = new Date(2026, 10, 19);
const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "2026-12-08" → { expires: "8 Dec", daysLeft: 19 } (the year is shown when it is not this one). */
function expiryOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return {};
  const at = new Date(y, m - 1, d);
  const daysLeft = Math.round((at.getTime() - TODAY.getTime()) / 86_400_000);
  const expires =
    y === TODAY.getFullYear() ? `${d} ${MON[m - 1]}` : `${MON[m - 1]} ${y}`;
  return { expires, daysLeft };
}

export const DOC_KINDS = [
  "Passport or ID",
  "Health certificate",
  "Work contract",
  "Work permit (foreigner)",
  "Food safety training",
  "Bank details",
];

const tdate = (tr: (s: string) => string, s: string) =>
  s.replace(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|today)\b/g,
    (m) => tr(m),
  );

/** One document: the file in a viewer, its number and expiry, upload or replace. */
export function DocSheet({
  doc,
  name,
  taken,
  onClose,
  onSave,
  onRemove,
  notify,
}: {
  doc?: Doc;
  name: string;
  taken: string[];
  onClose: () => void;
  onSave: (d: Doc) => void;
  onRemove?: () => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const input = useRef<HTMLInputElement>(null);
  const kinds = DOC_KINDS.filter((k) => !taken.includes(k));
  const [d, setD] = useState<Doc>(doc ?? { kind: kinds[0] ?? "Other" });
  const [iso, setIso] = useState("");
  const isNew = !doc;
  const pick = (f: File | undefined) => {
    if (!f) return;
    setD({
      ...d,
      file: {
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type,
        at: "today",
      },
    });
    haptic("success");
  };
  const f = d.file;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr(d.kind)}
      footer={
        <button
          type="button"
          onClick={() => onSave({ ...d, ...(iso ? expiryOf(iso) : {}) })}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-1 pb-10">
        <div>
          <p className="text-[13px] font-semibold text-g-blue">{name}</p>
          <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
            {tr(d.kind)}
          </h2>
        </div>
        {isNew && (
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={d.kind === k}
                onClick={() => (haptic("tick"), setD({ ...d, kind: k }))}
                className={`press h-9 rounded-full px-3.5 text-[13.5px] font-semibold ${d.kind === k ? "blue-grad" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(k)}
              </button>
            ))}
          </div>
        )}

        {/* The file itself: a photo shows as is, a PDF opens in a frame. */}
        {f ? (
          <div className="overflow-hidden rounded-[22px] bg-g-fill">
            {f.type === "application/pdf" ? (
              <iframe
                src={f.url}
                title={f.name}
                className="h-[420px] w-full bg-white"
              />
            ) : (
              <a href={f.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={tr(d.kind)}
                  className="mx-auto max-h-[420px] w-auto object-contain"
                />
              </a>
            )}
            <div className="flex items-center gap-2.5 border-t border-g-line px-4 py-3">
              <FileText size={16} className="shrink-0 text-g-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">
                  {f.name}
                </span>
                <span className="block text-[12px] text-g-muted">
                  {tr("uploaded {d}", { d: tdate(tr, f.at) })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="press h-9 shrink-0 rounded-full bg-g-card px-3.5 text-[13px] font-semibold text-g-blue"
              >
                {tr("Replace")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="press grid place-items-center gap-2 rounded-[22px] border-2 border-dashed border-g-line bg-g-fill px-4 py-8 text-center"
          >
            <span className="blue-grad grid size-12 place-items-center rounded-full">
              <Upload size={20} />
            </span>
            <span className="text-[15px] font-semibold">
              {tr("Upload a photo or a PDF")}
            </span>
            <span className="text-[12.5px] text-g-muted">
              {tr("Kept privately: only the owner and the admin open it")}
            </span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="overflow-hidden rounded-[22px] bg-g-fill">
          <label className="flex items-center gap-3 px-4 py-3">
            <span className="w-28 shrink-0 text-[14.5px] font-semibold">
              {tr("Number")}
            </span>
            <input
              value={d.number ?? ""}
              onChange={(e) => setD({ ...d, number: e.target.value })}
              placeholder="—"
              className="min-w-0 flex-1 bg-transparent text-right text-[15px] outline-none"
            />
          </label>
          {d.kind !== "Passport or ID" && d.kind !== "Bank details" && (
            <label className="relative flex items-center gap-3 border-t border-g-line px-4 py-3">
              <span className="w-28 shrink-0 text-[14.5px] font-semibold">
                {tr("Valid until")}
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[15px]">
                <span className={iso || d.expires ? "" : "text-g-faint"}>
                  {iso
                    ? tdate(tr, expiryOf(iso).expires ?? "")
                    : d.expires
                      ? tdate(tr, d.expires)
                      : "—"}
                </span>
                <CalendarDays size={16} className="shrink-0 text-g-blue" />
              </span>
              {/* The native date picker opens over the whole row. */}
              <input
                type="date"
                aria-label={tr("Valid until")}
                value={iso}
                onChange={(e) => setIso(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          )}
        </div>
        <p className="flex items-start gap-2 px-1 text-[12.5px] text-g-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          {tr(
            "Yan reminds the person 30 days before it ends and you on the day.",
          )}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => (
              haptic("success"),
              notify(tr("Ask {name} to upload it from the app", { name }))
            )}
            className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-g-fill text-[13.5px] font-semibold"
          >
            <Send size={15} className="text-g-blue" /> {tr("Ask the person")}
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-g-fill text-[13.5px] font-semibold text-[#e5484d]"
            >
              <Trash2 size={15} /> {tr("Remove")}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ Pay */

export const PAY: Record<PayType, string> = {
  hourly: "Per hour",
  shift: "Per shift",
  salary: "Monthly salary",
};
const EXTRAS: {
  kind: PayExtraKind;
  label: string;
  hint: string;
  unit: "%" | "₫";
  icon: typeof Sun;
  def: number;
}[] = [
  {
    kind: "sales",
    label: "Share of own sales",
    hint: "Of the bills they closed",
    unit: "%",
    icon: Percent,
    def: 2,
  },
  {
    kind: "perShift",
    label: "Bonus per shift",
    hint: "On top of the base, for each shift",
    unit: "₫",
    icon: Wallet,
    def: 50_000,
  },
  {
    kind: "night",
    label: "Night hours",
    hint: "After 22:00, on top of the rate",
    unit: "%",
    icon: Moon,
    def: 30,
  },
  {
    kind: "weekend",
    label: "Weekends and holidays",
    hint: "On top of the rate",
    unit: "%",
    icon: CalendarDays,
    def: 20,
  },
  {
    kind: "overtime",
    label: "Overtime",
    hint: "Hours above 8 in a shift",
    unit: "%",
    icon: Timer,
    def: 50,
  },
  {
    kind: "minimum",
    label: "Monthly minimum",
    hint: "Paid even in a slow month",
    unit: "₫",
    icon: ShieldCheck,
    def: 6_000_000,
  },
];

/** A usual month for the estimate: 22 shifts, 176 hours, 24 night hours, 6 weekend shifts, 10 overtime hours, 140M of own sales. */
export function monthOf(pay: PayType, rate: number, extras: PayExtra[] = []) {
  const shifts = 22;
  const hours = 176;
  const hourRate =
    pay === "hourly" ? rate : pay === "shift" ? rate / 8 : rate / 176;
  let sum = pay === "hourly" ? rate * hours : pay === "shift" ? rate * shifts : rate;
  const x = (k: PayExtraKind) => extras.find((e) => e.kind === k)?.value;
  if (x("sales")) sum += (140_000_000 * x("sales")!) / 100;
  if (x("perShift")) sum += x("perShift")! * shifts;
  if (x("night")) sum += (hourRate * 24 * x("night")!) / 100;
  if (x("weekend")) sum += (hourRate * 6 * 8 * x("weekend")!) / 100;
  if (x("overtime")) sum += (hourRate * 10 * (100 + x("overtime")!)) / 100;
  if (x("minimum")) sum = Math.max(sum, x("minimum")!);
  return Math.round(sum / 1000) * 1000;
}

/** The extras as short chips: "+2% of sales", "night +30%". */
export function ExtrasChips({ extras }: { extras?: PayExtra[] }) {
  const tr = useTr();
  if (!extras?.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {extras.map((e) => {
        const E = EXTRAS.find((x) => x.kind === e.kind)!;
        return (
          <span
            key={e.kind}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-g-card px-2.5 text-[12px] font-semibold"
          >
            <E.icon size={12} className="text-g-blue" /> {tr(E.label)}{" "}
            <span className="tabular-nums">
              {E.unit === "%" ? `+${e.value}%` : compactMoney(e.value)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function PayEdit({
  h,
  onClose,
  onSave,
}: {
  h: HR;
  onClose: () => void;
  onSave: (pay: PayType, rate: number, extras: PayExtra[]) => void;
}) {
  const tr = useTr();
  const [pay, setPay] = useState(h.pay);
  const [rate, setRate] = useState(String(h.rate));
  const [extras, setExtras] = useState<PayExtra[]>(h.extras ?? []);
  const on = (k: PayExtraKind) => extras.find((e) => e.kind === k);
  const toggle = (k: PayExtraKind, v: boolean, def: number) =>
    setExtras(
      v
        ? [...extras, { kind: k, value: def }]
        : extras.filter((e) => e.kind !== k),
    );
  const setVal = (k: PayExtraKind, v: number) =>
    setExtras(extras.map((e) => (e.kind === k ? { ...e, value: v } : e)));
  const month = monthOf(pay, Number(rate) || 0, extras);
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Pay")}
      footer={
        <button
          type="button"
          disabled={!Number(rate)}
          onClick={() => onSave(pay, Number(rate), extras)}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-1 pb-10">
        <h2 className="text-[26px] font-bold tracking-[-0.025em]">
          {tr("Pay")}
        </h2>
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Base pay")}
          </p>
          <div className="flex rounded-full bg-g-fill p-1">
            {(Object.keys(PAY) as PayType[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={pay === k}
                onClick={() => (haptic("tick"), setPay(k))}
                className={`h-10 flex-1 rounded-full text-[13px] font-semibold transition-colors ${pay === k ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`}
              >
                {tr(PAY[k])}
              </button>
            ))}
          </div>
          <span className="mt-2 flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
            <input
              inputMode="numeric"
              aria-label={tr(PAY[pay])}
              value={Number(rate) ? Number(rate).toLocaleString("en-US") : ""}
              onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))}
              className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none tabular-nums"
            />
            <span className="text-[14px] text-g-muted">
              ₫ /{" "}
              {tr(pay === "hourly" ? "hour" : pay === "shift" ? "shift" : "month")}
            </span>
          </span>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("On top")}
          </p>
          <div className="overflow-hidden rounded-[22px] bg-g-fill">
            {EXTRAS.map((E, i) => {
              const cur = on(E.kind);
              return (
                <div
                  key={E.kind}
                  className={`px-4 py-3 ${i ? "border-t border-g-line" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-g-card">
                      <E.icon size={15} className="text-g-blue" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        {tr(E.label)}
                      </span>
                      <span className="block text-[12px] text-g-muted">
                        {tr(E.hint)}
                      </span>
                    </span>
                    <Switch
                      on={!!cur}
                      onChange={(v) => (
                        haptic("tick"),
                        toggle(E.kind, v, E.def)
                      )}
                      label={tr(E.label)}
                    />
                  </div>
                  {cur && (
                    <span className="mt-2 ml-11 flex h-11 items-center gap-2 rounded-[14px] bg-g-card px-3">
                      <input
                        inputMode="numeric"
                        aria-label={tr(E.label)}
                        value={cur.value ? cur.value.toLocaleString("en-US") : ""}
                        onChange={(e) =>
                          setVal(E.kind, Number(e.target.value.replace(/\D/g, "")))
                        }
                        className="min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none tabular-nums"
                      />
                      <span className="text-[13px] text-g-muted">{E.unit}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] bg-g-blue/10 p-4">
          <p className="text-[13px] font-semibold text-g-blue">
            {tr("A usual month comes to")}
          </p>
          <p className="text-[28px] leading-tight font-bold tabular-nums">
            ≈ {compactMoney(month)}
          </p>
          <p className="mt-1 text-[12.5px] text-g-muted">
            {tr(
              "22 shifts, 176 hours, 24 of them at night, 6 weekend shifts, 140M of own sales. Tips are on top and go to the person.",
            )}
          </p>
        </div>
        <p className="px-1 text-[12.5px] text-g-muted">
          {tr(
            "The new rate starts on the 1st of next month; the history keeps every change.",
          )}
        </p>
      </div>
    </Sheet>
  );
}
