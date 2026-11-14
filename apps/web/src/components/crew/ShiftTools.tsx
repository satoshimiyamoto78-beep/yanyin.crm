"use client";

import { Check, Clock, LogIn, LogOut, ScanLine, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recipientsOf, type Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { chatStore, clockStore, nowHM, tasksStore, type Task } from "@/lib/team-stores";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import { MentionInput, MentionText } from "@/components/system/MentionInput";
import { useTr } from "./prefs";

/*
 * The shift's own tools for staff (docs/09 §21–22): clocking in with the QR at
 * the door, the tasks the admin gave you (@assignee), and the shift chat with
 * @mentions. All three are shared with the admin console.
 */

const minutesSince = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  const now = new Date();
  return Math.max(0, now.getHours() * 60 + now.getMinutes() - ((h ?? 0) * 60 + (m ?? 0)));
};
const dur = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

/** Home block: start the shift by scanning the QR at the door, or see how long you have been on it. */
export function ClockCard({ me, onNotify }: { me: string; onNotify: (title: string, text: string) => void }) {
  const tr = useTr();
  const all = clockStore.use();
  const c = all[me] ?? {};
  const on = !!c.in && !c.out;
  const [scan, setScan] = useState(false);
  const [ending, setEnding] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [on]);
  return (
    <>
      <button type="button" onClick={() => (haptic("light"), on ? setEnding(true) : setScan(true))} className="press relative mt-6 block w-full text-left">
        <ArtScene
          name="shifts"
          layout="row"
          focal={52}
          className="rounded-[26px] p-4"
          footer={<p className="mt-3 truncate pr-6 text-[13px] text-g-muted">{on ? tr("Tap to end the shift") : c.out ? tr("Shift ended at {t} · see you next time", { t: c.out }) : tr("Scan the QR code at the staff entrance")}</p>}
        >
          <p className="truncate text-[14px] leading-tight font-semibold text-g-ink-2">{on ? tr("On shift since {t}", { t: c.in! }) : tr("Start the shift")}</p>
          <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">{on ? dur(minutesSince(c.in!)) : c.out ? tr("Done") : tr("Clock in")}</p>
        </ArtScene>
      </button>
      {scan && (
        <ClockScan
          onClose={() => setScan(false)}
          onDone={() => {
            const t = nowHM();
            clockStore.set({ ...all, [me]: { in: t } });
            haptic("success");
            setScan(false);
            onNotify(tr("You are on shift"), tr("Clocked in at {t} · have a good shift", { t }));
          }}
        />
      )}
      {ending && on && (
        <Sheet
          open
          onClose={() => setEnding(false)}
          label={tr("End the shift")}
          title={false}
          footer={
            <button
              type="button"
              onClick={() => {
                const t = nowHM();
                clockStore.set({ ...all, [me]: { ...c, out: t } });
                haptic("success");
                setEnding(false);
                onNotify(tr("Shift ended"), tr("{h} on shift · thank you", { h: dur(minutesSince(c.in!)) }));
              }}
              className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-ink text-[16px] font-semibold text-white"
            >
              <LogOut size={18} strokeWidth={2.2} /> {tr("End the shift")}
            </button>
          }
        >
          <div className="px-5 pt-1 pb-10">
            <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("End the shift?")}</h2>
            <p className="mt-1 text-[14px] text-g-muted">{tr("Close your bills and the closing checklist first; the admin sees the time.")}</p>
            <div className="mt-6 grid gap-2">
              {[
                [Clock, tr("Started at {t}", { t: c.in! }), tr("{h} on shift", { h: dur(minutesSince(c.in!)) })],
                [LogIn, tr("Closing checklist"), tr("3 items left")],
              ].map(([Icon, title, sub], i) => {
                const I = Icon as typeof Clock;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-full bg-g-fill p-1.5 pr-4">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-full ${i ? "chip-orange" : "chip-blue"}`}>
                      <I size={19} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{title as string}</span>
                      <span className="block truncate text-[12.5px] text-g-muted">{sub as string}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** The camera on the door QR: a frame with a moving line; the demo finds the code by itself. */
function ClockScan({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const tr = useTr();
  const [found, setFound] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const a = setTimeout(() => (setFound(true), haptic("tick")), 1600);
    const b = setTimeout(() => done.current(), 2300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  return (
    <Sheet open onClose={onClose} label={tr("Clock in")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("Scan the door QR")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">{tr("It hangs at the staff entrance. Your shift starts the moment it is read.")}</p>
        <div className="relative mx-auto mt-8 aspect-square w-full max-w-[320px] overflow-hidden rounded-[32px] bg-[#0b0b0f]">
          <span className={`absolute inset-6 rounded-[24px] border-[3px] transition-colors ${found ? "border-[#5ce0a0]" : "border-white/70"}`} />
          {!found && <span className="scan-line absolute inset-x-8 top-8 h-0.5 rounded-full bg-[#6c96ff] shadow-[0_0_16px_#6c96ff]" />}
          <span className="absolute inset-0 grid place-items-center">
            {found ? (
              <span className="animate-pop grid size-20 place-items-center rounded-full bg-[#22c55e] text-white">
                <Check size={38} strokeWidth={2.8} />
              </span>
            ) : (
              <ScanLine size={56} strokeWidth={1.5} className="text-white/40" />
            )}
          </span>
        </div>
        <p className="mt-5 text-center text-[14px] font-semibold text-g-muted">{found ? tr("Got it") : tr("Looking for the code…")}</p>
      </div>
    </Sheet>
  );
}

/** Home block: the tasks given to me, tick to finish; the admin sees it done. */
export function MyTasks({ me, team, onNotify }: { me: string; team: Person[]; onNotify: (title: string, text: string) => void }) {
  const tr = useTr();
  const all = tasksStore.use();
  const mine = all.filter((t) => t.to === me);
  const open = mine.filter((t) => !t.done);
  const known = (h: string) => team.some((p) => p.handle === h);
  const toggle = (t: Task) => {
    haptic(t.done ? "light" : "success");
    tasksStore.set(all.map((x) => (x.id === t.id ? { ...x, done: x.done ? undefined : { at: nowHM() } } : x)));
    if (!t.done) onNotify(tr("Task done"), tr("@{by} sees it", { by: team.find((p) => p.id === t.by)?.handle ?? "admin" }));
  };
  return (
    <section className="mt-10">
      <h2 className="mb-2 flex items-baseline gap-2 text-[24px] leading-tight font-bold tracking-[-0.025em]">
        {tr("My tasks")}
        <span className="text-[15px] font-medium tracking-normal text-g-faint">{open.length}</span>
      </h2>
      <div className="grid gap-2">
        {mine.map((t) => (
          <button key={t.id} type="button" onClick={() => toggle(t)} className="press flex items-center gap-3 rounded-[22px] bg-g-fill p-2.5 pr-4 text-left">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors ${t.done ? "blue-grad" : "bg-g-card"}`}>{t.done ? <Check size={18} strokeWidth={3} /> : <span className="size-4 rounded-full border-2 border-g-faint" />}</span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] leading-snug ${t.done ? "text-g-faint line-through" : "font-medium"}`}>
                <MentionText text={t.title} known={known} />
              </span>
              <span className="mt-0.5 block text-[12.5px] text-g-muted">
                @{team.find((p) => p.id === t.by)?.handle} · {t.done ? tr("done at {t}", { t: t.done.at }) : t.due ? tr("by {t}", { t: t.due }) : t.at}
              </span>
            </span>
          </button>
        ))}
        {!mine.length && <p className="rounded-[20px] bg-g-fill px-4 py-3.5 text-[14px] text-g-muted">{tr("No tasks for you right now")}</p>}
      </div>
    </section>
  );
}

/** The shift chat: everyone on shift, @mentions like Telegram, newest at the bottom. */
export function ChatPage({ me, team, onClose }: { me: string; team: Person[]; onClose: () => void }) {
  const tr = useTr();
  const msgs = chatStore.use();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const known = (h: string) => team.some((p) => p.handle === h);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    haptic("success");
    chatStore.set([...msgs, { id: `c${Date.now()}`, by: me, text, at: nowHM() }]);
    setDraft("");
  };
  const groups = [
    { handle: "all", label: tr("Everyone on shift"), count: team.filter((p) => p.onShift).length },
    { handle: "bar", label: tr("Bar"), count: team.filter((p) => p.onShift && p.stations.includes("bar")).length },
    { handle: "kitchen", label: tr("Kitchen"), count: team.filter((p) => p.onShift && p.stations.includes("hot")).length },
  ];
  const reach = recipientsOf(draft, team).filter((id) => id !== me).length;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Shift chat")}
      footer={
        <div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <MentionInput value={draft} onChange={setDraft} people={team.filter((p) => p.id !== me)} groups={groups} placeholder={tr("Message the shift · @ to mention")} roleLabel={(p) => p.roles.join(", ")} rows={1} up />
            </div>
            <button type="button" aria-label={tr("Send")} disabled={!draft.trim()} onClick={send} className="blue-grad press grid size-12 shrink-0 place-items-center rounded-full disabled:opacity-40">
              <Send size={19} strokeWidth={2.2} />
            </button>
          </div>
          {reach > 0 && <p className="mt-1.5 px-2 text-[12.5px] text-g-blue">{tr("{n} get a notification|{n} get a notification", { n: reach })}</p>}
        </div>
      }
    >
      <div className="flex flex-col gap-1 px-4 pt-2 pb-4">
        {msgs.map((m, i) => {
          const mineMsg = m.by === me;
          const p = team.find((x) => x.id === m.by);
          const first = msgs[i - 1]?.by !== m.by;
          return (
            <div key={m.id} className={`flex max-w-[84%] flex-col ${mineMsg ? "self-end items-end" : "items-start"} ${first ? "mt-2" : ""}`}>
              {!mineMsg && first && <span className="mb-1 px-3 text-[12.5px] font-semibold text-g-blue">@{p?.handle}</span>}
              <span className={`rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${mineMsg ? "blue-grad rounded-br-[8px]" : "rounded-bl-[8px] bg-g-fill"}`}>
                {mineMsg ? m.text : <MentionText text={m.text} known={known} />}
              </span>
              <span className="mt-0.5 px-2 text-[11px] text-g-faint tabular-nums">{m.at}</span>
            </div>
          );
        })}
        <div ref={end} />
      </div>
    </Sheet>
  );
}
