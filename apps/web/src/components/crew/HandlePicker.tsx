"use client";

import { AtSign, Check, Globe2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { handleProblem, normalizeHandle, suggestHandle, type Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { ScrollLock } from "@/lib/scroll-lock";
import { useTr } from "./prefs";

/*
 * Choosing your @ID (ADR-015): shown on first entry and from the profile.
 * Suggests free IDs from the name, checks every keystroke (length, letters,
 * reserved group names like @bar, already taken) and explains why it matters.
 */
const PROBLEM: Record<string, string> = {
  short: "At least 3 characters",
  long: "At most 24 characters",
  start: "Start with a letter",
  chars: "Latin letters, digits and _ only, not at the end",
  reserved: "This one is reserved for groups or the system",
  taken: "Someone already has it",
};

export function HandlePicker({ me, others, current, onDone, onClose }: { me: { first: string; last: string }; others: Person[]; current?: string; onDone: (handle: string) => void; onClose?: () => void }) {
  const tr = useTr();
  const taken = others.map((p) => p.handle);
  const ideas = [...new Set([suggestHandle(me.first, taken), suggestHandle(`${me.first} ${me.last}`, taken), suggestHandle(`${me.first} waiter`, taken)])];
  const [value, setValue] = useState(current ?? ideas[0]!);
  const handle = normalizeHandle(value);
  const problem = handleProblem(handle, taken);
  return createPortal(
    <div className="animate-fade fixed inset-0 z-[96] flex flex-col overflow-y-auto bg-g-bg text-g-ink" role="dialog" aria-label={tr("Your @ID")}>
      <ScrollLock />
      <div className="mx-auto w-full max-w-[480px] flex-1 px-5 pt-[max(28px,env(safe-area-inset-top))] pb-6">
        <span className="blue-grad grid size-16 place-items-center rounded-full">
          <AtSign size={30} strokeWidth={2} />
        </span>
        <h1 className="mt-5 text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("Your @ID")}</h1>
        <p className="mt-1.5 text-[15px] leading-snug text-g-muted">{tr("This is how the team finds you and mentions you: in news, tasks and the shift chat.")}</p>

        <label className={`mt-6 flex h-16 items-center gap-1 rounded-[20px] bg-g-fill px-4 ring-2 ${problem ? "ring-transparent" : "ring-g-green/50"}`}>
          <span className="text-[24px] font-semibold text-g-faint">@</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold outline-none"
          />
          {!problem && <Check size={22} strokeWidth={2.6} className="shrink-0 text-g-green" />}
        </label>
        <p className={`mt-2 px-1 text-[13px] ${problem ? "font-semibold text-g-orange" : "text-g-green"}`}>
          {problem ? tr(PROBLEM[problem]!) : tr("Free · it will look like @{h}", { h: handle })}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {ideas.map((i) => (
            <button
              key={i}
              onClick={() => {
                haptic("tick");
                setValue(i);
              }}
              className={`press h-10 rounded-full px-4 text-[14px] font-semibold ${i === handle ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
            >
              @{i}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-3">
          {(
            [
              [ShieldCheck, "Everything stays yours", "Orders, tips, reviews and XP are kept against you, not against the ID. Change the ID any time."],
              [Globe2, "One ID across yanyin", "Move to another venue on yanyin and keep your ID and your growth."],
            ] as const
          ).map(([Icon, title, text]) => (
            <div key={title} className="flex gap-3 rounded-[20px] bg-g-fill p-4">
              <Icon size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-g-blue" />
              <span>
                <span className="block text-[15px] font-semibold">{tr(title)}</span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-g-muted">{tr(text)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[480px] px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button
          disabled={Boolean(problem)}
          onClick={() => {
            haptic("success");
            onDone(handle);
          }}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold disabled:opacity-40"
        >
          {tr("Save @{h}", { h: handle })}
        </button>
        {onClose && (
          <button onClick={onClose} className="press mt-2 h-12 w-full rounded-full text-[15px] font-semibold text-g-muted">
            {tr("Cancel")}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
