"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { saveHandle, useHandles, withHandles } from "@/lib/handles";
import { TEAM } from "@/lib/demo-team";
import { ArtScene } from "@/components/system/Art";
import { TextField, useStepHistory } from "@/components/system/Kit";
import { HandlePicker } from "@/components/crew/HandlePicker";
import { CrewPrefsProvider, useTr } from "@/components/crew/prefs";
import { AuthFrame, CodeStep, ContactStep } from "./LoginApp";

/*
 * An invite from the admin (a link or a QR on their phone): who invites, to
 * which venue, in which role. Accept → your name → phone → code → your @ID →
 * your app. Back walks the steps, like every flow in yanyin.
 */

const INVITE = { venue: "Samarkand", city: "Da Nang", by: "huong", byName: "Hương", role: "Waiter", station: "Hall", href: "crew.html", id: "staff-new" };

export function JoinApp() {
  return (
    <CrewPrefsProvider>
      <Join />
    </CrewPrefsProvider>
  );
}

function Join() {
  const tr = useTr();
  const { step, go, back } = useStepHistory();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [by, setBy] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  const handles = useHandles();
  const team = withHandles(TEAM, handles);
  const titles = [tr("You are invited to {venue}", { venue: INVITE.venue }), tr("Your phone or email"), tr("Enter the code")];
  const subs = [tr("@{by} adds you to the team as {role}.", { by: INVITE.by, role: tr(INVITE.role).toLowerCase() }), tr("To sign in next time. No passwords."), tr("We sent it to {to}", { to: by === "phone" ? `+84 ${contact}` : contact })];
  return (
    <>
      <AuthFrame step={Math.min(step, 2)} onBack={back} title={titles[Math.min(step, 2)]!} sub={subs[Math.min(step, 2)]!}>
        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (first.trim()) go(1);
            }}
          >
            <ArtScene
              name="tables"
              layout="row"
              focal={56}
              className="rounded-[26px] p-4"
              footer={
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {[tr(INVITE.role), tr(INVITE.station), tr("Quests and tips")].map((c) => (
                    <span key={c} className="rounded-full bg-g-card/80 px-2.5 py-1 text-[12.5px] font-semibold text-g-ink-2">
                      {c}
                    </span>
                  ))}
                </p>
              }
            >
              <p className="truncate text-[13px] font-semibold text-g-muted">
                {INVITE.venue} · {INVITE.city}
              </p>
              <p className="mt-0.5 truncate text-[21px] leading-tight font-bold tracking-[-0.02em]">{tr("Invite from @{by}", { by: INVITE.by })}</p>
            </ArtScene>
            <p className="mt-6 mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Your name")}</p>
            <div className="grid grid-cols-2 gap-2">
              <TextField value={first} onChange={setFirst} placeholder={tr("First name")} autoFocus />
              <TextField value={last} onChange={setLast} placeholder={tr("Last name")} />
            </div>
            <button type="submit" disabled={!first.trim()} className="blue-grad press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40">
              {tr("Accept the invite")} <ArrowRight size={18} strokeWidth={2.2} />
            </button>
          </form>
        )}
        {step === 1 && <ContactStep by={by} setBy={setBy} value={contact} onChange={setContact} onNext={() => go(2)} />}
        {step >= 2 && <CodeStep onDone={() => go(3)} onResend={() => undefined} />}
      </AuthFrame>
      {step === 3 && (
        <HandlePicker
          me={{ first: first.trim() || "Guest", last: last.trim() }}
          others={team}
          onClose={back}
          onDone={(h) => {
            saveHandle(INVITE.id, h);
            haptic("success");
            go(4);
          }}
        />
      )}
      {step === 4 && <Welcome name={first.trim()} />}
    </>
  );
}

/** Done: a short welcome and one button into the app. */
function Welcome({ name }: { name: string }) {
  const tr = useTr();
  return (
    <div className="animate-fade fixed inset-0 z-[97] flex flex-col bg-g-bg px-6 pt-[max(48px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] text-g-ink">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        <span className="animate-pop blue-grad grid size-20 place-items-center rounded-full">
          <Check size={38} strokeWidth={2.6} />
        </span>
        <h1 className="mt-6 text-[32px] leading-tight font-bold tracking-[-0.025em]">{tr("Welcome, {name}", { name })}</h1>
        <p className="mt-2 text-[16px] leading-snug text-g-muted">{tr("You are in the Samarkand team. Your first quest is waiting on the home screen.")}</p>
        <a href={INVITE.href} onClick={() => haptic("success")} className="blue-grad press mt-auto flex h-14 items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
          {tr("Open my app")} <ArrowRight size={18} strokeWidth={2.2} />
        </a>
      </div>
    </div>
  );
}
