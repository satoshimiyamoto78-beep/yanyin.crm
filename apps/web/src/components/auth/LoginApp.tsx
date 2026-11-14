"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Globe2, Mail, Phone, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { ArtScene } from "@/components/system/Art";
import { NorthSky } from "@/components/system/NorthSky";
import { OtpInput, TextField, useStepHistory } from "@/components/system/Kit";
import { CrewPrefsProvider, usePrefs, useTr } from "@/components/crew/prefs";
import { DEMO_CODE, DEMO_PHONE, SEATS, START_HREF } from "./demo-account";

/*
 * One door for everyone (docs/09, wave 1): phone or email → a six-digit code →
 * "Who are you today?" with the person's roles in their venues. Each role opens
 * its own app. Every step takes a history entry, so the phone's back gesture
 * walks back through the steps.
 */

export function LoginApp() {
  return (
    <CrewPrefsProvider>
      <Login />
    </CrewPrefsProvider>
  );
}

function Login() {
  const tr = useTr();
  const { step, go, back } = useStepHistory();
  const [by, setBy] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  return (
    <AuthFrame step={step} onBack={back} title={step === 0 ? tr("Sign in to yanyin") : step === 1 ? tr("Enter the code") : tr("Who are you today?")} sub={step === 0 ? tr("One account for every venue and role. We send a code, no passwords.") : step === 1 ? tr("We sent it to {to}", { to: by === "phone" ? `+84 ${contact}` : contact }) : tr("Pick where you work now; you can switch any time from your profile.")}>
      {step === 0 && <ContactStep by={by} setBy={setBy} value={contact} onChange={setContact} onNext={() => go(1)} />}
      {step === 1 && <CodeStep onDone={() => go(2)} onResend={() => undefined} />}
      {step === 2 && <SeatsStep />}
    </AuthFrame>
  );
}

/** The sky with the wordmark on top, a back button from the second step, the step's own content below. */
export function AuthFrame({ step, onBack, title, sub, children, top }: { step: number; onBack: () => void; title: string; sub: string; children: ReactNode; top?: ReactNode }) {
  const tr = useTr();
  return (
    <main className="min-h-dvh overflow-x-hidden bg-white text-g-ink">
      <section className="relative isolate px-5 pt-[max(16px,env(safe-area-inset-top))] pb-8 text-white">
        <NorthSky />
        <div className="mx-auto flex max-w-[440px] items-center gap-2">
          {step > 0 ? (
            <button type="button" aria-label={tr("Back")} onClick={onBack} className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
          ) : (
            <span className="text-[22px] font-bold tracking-[-0.03em]">
              yanyin<span className="text-white/50">.crm</span>
            </span>
          )}
          <LangPill />
        </div>
        <div key={step} className="animate-tab mx-auto mt-10 max-w-[440px]">
          {top}
          <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em] text-balance">{title}</h1>
          <p className="mt-1.5 text-[15px] leading-snug text-white/75">{sub}</p>
        </div>
      </section>
      <div key={`b${step}`} className="animate-tab relative z-10 mx-auto max-w-[440px] px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  );
}

/** EN / RU / VI, one tap cycles: the first thing a new waiter may need. */
function LangPill() {
  const { prefs, set } = usePrefs();
  const next = { en: "ru", ru: "vi", vi: "en" } as const;
  return (
    <button
      type="button"
      onClick={() => {
        haptic("tick");
        set({ lang: next[prefs.lang] });
      }}
      className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[14px] font-semibold"
    >
      <Globe2 size={16} strokeWidth={2} /> {prefs.lang.toUpperCase()}
    </button>
  );
}

/** Phone (Vietnam +84 by default) or email, then "Get the code". */
export function ContactStep({ by, setBy, value, onChange, onNext }: { by: "phone" | "email"; setBy: (b: "phone" | "email") => void; value: string; onChange: (v: string) => void; onNext: () => void }) {
  const tr = useTr();
  const ok = by === "phone" ? value.replace(/\D/g, "").length >= 9 : /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onNext();
      }}
    >
      <div role="tablist" className="relative grid h-12 grid-cols-2 rounded-full bg-g-fill p-1">
        <span aria-hidden className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_1px_3px_rgba(11,11,15,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(${by === "email" ? "100%" : "0"})` }} />
        {(
          [
            ["phone", Phone, tr("Phone")],
            ["email", Mail, tr("Email")],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={by === id}
            onClick={() => {
              haptic("tick");
              setBy(id);
              onChange("");
            }}
            className={`relative z-10 flex items-center justify-center gap-1.5 text-[14px] font-semibold transition-colors ${by === id ? "text-g-ink" : "text-g-muted"}`}
          >
            <Icon size={16} strokeWidth={2.2} /> {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {by === "phone" ? (
          <TextField value={value} onChange={(v) => onChange(v.replace(/[^\d ]/g, "").slice(0, 13))} prefix="+84" placeholder={DEMO_PHONE} type="tel" inputMode="tel" autoFocus />
        ) : (
          <TextField value={value} onChange={onChange} placeholder="name@venue.com" type="email" inputMode="email" autoFocus />
        )}
      </div>
      <button type="submit" disabled={!ok} className="blue-grad press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40">
        {tr("Get the code")} <ArrowRight size={18} strokeWidth={2.2} />
      </button>
      {by === "phone" && !value && (
        <button type="button" onClick={() => onChange(DEMO_PHONE)} className="press mx-auto mt-3 block text-[14px] font-semibold text-g-blue">
          {tr("Use the demo number")}
        </button>
      )}
      <p className="mt-6 flex items-start gap-2.5 rounded-[24px] bg-g-fill px-4 py-3.5 text-[13px] leading-snug text-g-muted">
        <ShieldCheck size={18} strokeWidth={2} className="mt-px shrink-0 text-g-green" />
        {tr("Your data stays with your venue. The owner decides who sees what; every action is in the journal.")}
      </p>
    </form>
  );
}

/** Six digits; the right code goes on by itself, a wrong one shakes. Resend after 45 s. */
export function CodeStep({ onDone, onResend }: { onDone: () => void; onResend: () => void }) {
  const tr = useTr();
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [left, setLeft] = useState(45);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => {
    if (code.length < 6) return;
    if (code === DEMO_CODE) {
      haptic("success");
      const t = setTimeout(onDone, 250);
      return () => clearTimeout(t);
    }
    haptic("light");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a wrong code shakes the cells, then clears them
    setBad(true);
    const t = setTimeout(() => {
      setBad(false);
      setCode("");
    }, 650);
    return () => clearTimeout(t);
  }, [code, onDone]);
  return (
    <div>
      <OtpInput value={code} onChange={setCode} error={bad} />
      <p className={`mt-3 px-1 text-[13.5px] ${bad ? "font-semibold text-[#e5484d]" : "text-g-muted"}`}>{bad ? tr("Wrong code, try again") : tr("Demo code: {code}", { code: DEMO_CODE })}</p>
      <button
        type="button"
        disabled={left > 0}
        onClick={() => {
          haptic("light");
          setLeft(45);
          onResend();
        }}
        className="press mt-6 h-12 w-full rounded-full bg-g-fill text-[15px] font-semibold text-g-ink-2 disabled:text-g-faint"
      >
        {left > 0 ? tr("Send again in 0:{s}", { s: String(left).padStart(2, "0") }) : tr("Send the code again")}
      </button>
    </div>
  );
}

/** The person's roles as scene cards; one tap opens that app. A new venue starts the setup. */
function SeatsStep() {
  const tr = useTr();
  return (
    <div className="grid gap-3">
      {SEATS.map((s) => (
        <a key={s.id} href={s.href} onClick={() => haptic("success")} className="press relative block">
          <ArtScene name={s.art} layout="row" focal={52} className="rounded-[26px] p-4" footer={<p className="mt-3 truncate pr-6 text-[13px] text-g-muted">{tr(s.sub)}</p>}>
            <p className="truncate text-[13px] font-semibold text-g-muted">
              {s.venue} · {s.city}
            </p>
            <p className="mt-0.5 truncate text-[21px] leading-tight font-bold tracking-[-0.02em]">{tr(s.role)}</p>
          </ArtScene>
          <ChevronRight size={18} className="absolute right-4 bottom-4 text-g-faint" />
        </a>
      ))}
      <a href={START_HREF} onClick={() => haptic("light")} className="press flex h-14 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold">
        <Plus size={18} strokeWidth={2.4} className="text-g-blue" /> {tr("Connect a new venue")}
      </a>
    </div>
  );
}
