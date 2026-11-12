"use client";

import { Camera, Check, ChevronRight, Clock, Thermometer } from "lucide-react";
import { useState } from "react";
import { checklistProgress, checklistXp, proofProblem, toggleItem, type ChecklistItem, type ChecklistPhase, type ChecklistRun, type ChecklistTemplate } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { personById } from "@/lib/demo-team";
import { PeekCard } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import { useTr } from "./prefs";

/*
 * The shift checklist: a card on the waiter's home with how far along it is
 * and what comes next, and a page with the whole list by phase. Some items
 * ask for proof (a photo, the fridge temperature); a value out of range is
 * kept but flagged for the admin. Finishing the list pays XP.
 */

/** Demo clock, same as the rest of the waiter app. */
const NOW = "12:45";
const PHASES: { id: ChecklistPhase; label: string }[] = [
  { id: "open", label: "Opening" },
  { id: "during", label: "During the shift" },
  { id: "close", label: "Closing" },
];

/** Home card: the list at a glance. */
export function ChecklistCard({ template, run, onOpen }: { template: ChecklistTemplate; run: ChecklistRun; onOpen: () => void }) {
  const tr = useTr();
  const p = checklistProgress(template, run, NOW);
  return (
    <button
      onClick={() => {
        haptic("light");
        onOpen();
      }}
      className="press relative mt-6 block w-full text-left"
    >
      <ArtScene
        name="checklist"
        layout="row"
        focal={52}
        className="rounded-[26px] p-4"
        footer={
          <>
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-g-card/70">
              <span className="block h-full rounded-full bg-g-green transition-[width] duration-500" style={{ width: `${p.percent}%` }} />
            </div>
            <p className="mt-2.5 truncate pr-6 text-[13px] text-g-muted">
              {p.late.length > 0 && <span className="font-semibold text-g-orange">{tr("{n} late|{n} late", { n: p.late.length })} · </span>}
              {p.next ? `${tr("Next")}: ${tr(p.next.title)}` : tr("All done")}
            </p>
          </>
        }
      >
        <p className="truncate text-[14px] leading-tight font-semibold text-g-ink-2">{tr("Shift checklist")}</p>
        <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">
          {p.done}
          <span className="text-[18px] text-g-muted">/{p.total}</span>
        </p>
      </ArtScene>
      <ChevronRight size={18} className="absolute right-4 bottom-4 text-g-faint" />
    </button>
  );
}

/** The whole list: three phases, tap to tick, proof where asked, XP when done. */
export function ChecklistPage({
  template,
  run,
  onChange,
  onFinish,
  onClose,
  setBy,
  me,
}: {
  template: ChecklistTemplate;
  run: ChecklistRun;
  onChange: (r: ChecklistRun) => void;
  onFinish: (xp: number) => void;
  onClose: () => void;
  /** Who set the list up (an internal id; shown as their @ID). */
  setBy: string;
  me: string;
}) {
  const tr = useTr();
  const [ask, setAsk] = useState<ChecklistItem | null>(null);
  const [value, setValue] = useState("");
  const [finished, setFinished] = useState(false);
  const p = checklistProgress(template, run, NOW);
  const owner = personById(setBy);

  const tap = (item: ChecklistItem) => {
    // Unticking is always one tap; ticking an item with proof asks for it first.
    if (run.marks[item.id] || !item.proof) {
      haptic(run.marks[item.id] ? "light" : "success");
      onChange(toggleItem(run, item, me, NOW));
      return;
    }
    if (item.proof.kind === "photo") {
      // Demo: the camera opens on a real phone; here the photo is attached at once.
      haptic("success");
      onChange(toggleItem(run, item, me, NOW, "photo"));
      return;
    }
    setValue("");
    setAsk(item);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Shift checklist")}
      title={false}
      footer={
        p.complete && !finished ? (
          <button
            onClick={() => {
              haptic("success");
              setFinished(true);
              onFinish(checklistXp(template, run));
            }}
            className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
          >
            {tr("Close the list · +{n} XP", { n: checklistXp(template, run) })}
          </button>
        ) : undefined
      }
    >
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Shift checklist")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {tr("Set by {who}", { who: owner ? `@${owner.handle}` : "—" })} · {tr("+{n} XP for the whole list", { n: template.xp })}
        </p>

        <div className="mt-4 rounded-[22px] bg-g-fill p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-g-ink-2">{tr("Done")}</span>
            <span className="text-[15px] font-semibold tabular-nums">
              {p.done} / {p.total}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-g-card">
            <span className="block h-full rounded-full bg-g-green transition-[width] duration-500" style={{ width: `${p.percent}%` }} />
          </div>
          {(p.late.length > 0 || p.flagged.length > 0) && (
            <p className="mt-2.5 text-[12.5px] font-semibold text-g-orange">
              {[p.late.length ? tr("{n} late|{n} late", { n: p.late.length }) : "", p.flagged.length ? tr("{n} out of range|{n} out of range", { n: p.flagged.length }) : ""].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {PHASES.map((ph) => {
          const items = template.items.filter((i) => i.phase === ph.id);
          if (!items.length) return null;
          const n = items.filter((i) => run.marks[i.id]).length;
          return (
            <section key={ph.id} className="mt-7">
              <h3 className="flex items-baseline justify-between text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">
                <span>{tr(ph.label)}</span>
                <span className="tracking-normal tabular-nums">
                  {n}/{items.length}
                </span>
              </h3>
              <div className="mt-2 divide-y divide-g-line rounded-[22px] bg-g-fill px-3.5">
                {items.map((it) => {
                  const mark = run.marks[it.id];
                  const late = p.late.includes(it);
                  const flagged = p.flagged.includes(it);
                  const by = mark ? personById(mark.by) : undefined;
                  return (
                    <button key={it.id} onClick={() => tap(it)} aria-pressed={Boolean(mark)} className="press flex w-full items-center gap-3 py-3 text-left">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-full transition-colors ${mark ? (flagged ? "bg-g-orange text-white" : "bg-g-green text-white") : "border-2 border-g-fill-2 bg-g-card"}`}>
                        {mark && <Check size={15} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[15px] leading-snug ${mark ? "text-g-muted line-through decoration-g-faint" : "font-medium"}`}>{tr(it.title)}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-g-muted tabular-nums">
                          {mark ? (
                            <>
                              <span>
                                {by ? `@${by.handle}` : ""} · {mark.at}
                              </span>
                              {it.proof?.kind === "number" && mark.value && (
                                <span className={flagged ? "font-semibold text-g-orange" : ""}>
                                  {mark.value} {it.proof.unit}
                                  {flagged ? ` · ${tr("out of range")}` : ""}
                                </span>
                              )}
                              {it.proof?.kind === "photo" && (
                                <span className="flex items-center gap-1">
                                  <Camera size={12} strokeWidth={2.2} /> {tr("photo attached")}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {it.due && (
                                <span className={`flex items-center gap-1 ${late ? "font-semibold text-g-orange" : ""}`}>
                                  <Clock size={12} strokeWidth={2.2} /> {late ? tr("late, was due {t}", { t: it.due }) : tr("by {t}", { t: it.due })}
                                </span>
                              )}
                              {it.proof?.kind === "photo" && (
                                <span className="flex items-center gap-1">
                                  <Camera size={12} strokeWidth={2.2} /> {tr("needs a photo")}
                                </span>
                              )}
                              {it.proof?.kind === "number" && (
                                <span className="flex items-center gap-1">
                                  <Thermometer size={12} strokeWidth={2.2} /> {tr("enter the value")}
                                </span>
                              )}
                              {it.required === false && <span>{tr("optional")}</span>}
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {finished && <p className="mt-6 rounded-[18px] bg-g-tint-green px-4 py-3.5 text-[14px] font-semibold text-g-green">{tr("List closed. Good shift!")}</p>}
      </div>

      {ask && ask.proof?.kind === "number" && (
        <PeekCard label={tr(ask.title)} onClose={() => setAsk(null)} z={100}>
          <p className="text-[19px] leading-tight font-bold">{tr(ask.title)}</p>
          <p className="mt-1 text-[13px] text-g-muted">{tr("Normal: {a}–{b} {u}", { a: ask.proof.min ?? "", b: ask.proof.max ?? "", u: ask.proof.unit })}</p>
          <label className="mt-4 flex h-14 items-center gap-2 rounded-[18px] bg-g-fill px-4">
            <input
              autoFocus
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="3"
              className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold tabular-nums outline-none placeholder:text-g-faint"
            />
            <span className="text-[17px] text-g-muted">{ask.proof.unit}</span>
          </label>
          {proofProblem(ask, value) === "range" && <p className="mt-2 text-[13px] font-semibold text-g-orange">{tr("Out of range: the admin will see it")}</p>}
          <button
            disabled={proofProblem(ask, value) === "missing"}
            onClick={() => {
              haptic("success");
              onChange(toggleItem(run, ask, me, NOW, value));
              setAsk(null);
            }}
            className="blue-grad press mt-4 h-12 w-full rounded-full text-[15px] font-semibold disabled:opacity-40"
          >
            {tr("Save")}
          </button>
        </PeekCard>
      )}
    </Sheet>
  );
}
