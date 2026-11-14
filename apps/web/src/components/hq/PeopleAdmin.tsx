"use client";

import { Camera, Check, ClipboardCheck, Clock, Hash, Lock, Plus, Trash2, Trophy, Unlock } from "lucide-react";
import { useState } from "react";
import { checklistProgress, type ChecklistItem, type ChecklistRun, type ChecklistTemplate, type Person, type Quest } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { createStore } from "@/lib/store";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import { Choice, EmptyState, Field, Group, ListRow, Row, Switch, TextField } from "@/components/system/Kit";
import { ChecklistCard } from "@/components/crew/Checklist";
import { compactMoney } from "@/components/crew/CrewApp";
import { useLocale, useTr } from "@/components/crew/prefs";

/*
 * People and the rhythm of the shift (docs/09 §12–14): the week's schedule and
 * today's shift with the cash count; quests the venue runs for the team (they
 * appear on every waiter's quest board); checklist templates for each role.
 */

/* ---------------------------------------------------------------- Shifts */

type Slot = "morning" | "day" | "evening" | "off";
const SLOT: Record<Slot, { label: string; time: string; cls: string }> = {
  morning: { label: "Morning", time: "07–15", cls: "chip-teal" },
  day: { label: "Day", time: "10–18", cls: "chip-blue" },
  evening: { label: "Evening", time: "16–24", cls: "chip-orange" },
  off: { label: "Off", time: "", cls: "chip-gray" },
};
const ORDER: Slot[] = ["day", "evening", "morning", "off"];
const seedWeek = (team: Person[]) => Object.fromEntries(team.map((p, i) => [p.id, Array.from({ length: 7 }, (_, d) => (p.roles.includes("owner") ? "off" : ORDER[(i + d * 2) % 4]!) as Slot)]));
export const scheduleStore = createStore<Record<string, Slot[]>>("yanyin:schedule", {});
export const shiftStore = createStore<{ open: boolean; openedAt: string; cash: number | null }>("yanyin:shift", { open: true, openedAt: "09:52", cash: null });

export function ShiftsAdmin({ team, notify }: { team: Person[]; notify: (t: string) => void }) {
  const tr = useTr();
  const locale = useLocale();
  const stored = scheduleStore.use();
  const week = Object.keys(stored).length ? stored : seedWeek(team);
  const shift = shiftStore.use();
  const [counting, setCounting] = useState(false);
  const [cash, setCash] = useState("");
  const start = new Date(2026, 10, 9);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { short: d.toLocaleDateString(locale, { weekday: "short" }), day: d.getDate(), today: d.getDate() === 14 };
  });
  const cycle = (pid: string, di: number) => {
    haptic("tick");
    const cur = week[pid] ?? Array<Slot>(7).fill("off");
    const next = ORDER[(ORDER.indexOf(cur[di]!) + 1) % ORDER.length]!;
    scheduleStore.set({ ...week, [pid]: cur.map((s, i) => (i === di ? next : s)) });
  };
  const expected = 4_530_000;
  const counted = Number(cash.replace(/\D/g, ""));
  return (
    <div className="grid gap-6">
      {/* Today's shift: open since, people on it, close with the cash count. */}
      <ArtScene
        name="shifts"
        layout="row"
        focal={56}
        className="rounded-[26px] p-5"
        footer={
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {shift.open ? (
              <button type="button" onClick={() => (haptic("light"), setCounting(true))} className="press h-11 rounded-full bg-g-ink px-5 text-[14px] font-semibold text-white">
                {tr("Close the shift")}
              </button>
            ) : (
              <button type="button" onClick={() => (haptic("success"), shiftStore.set({ open: true, openedAt: "09:55", cash: null }), notify(tr("Shift opened · the team sees it")))} className="blue-grad press h-11 rounded-full px-5 text-[14px] font-semibold">
                {tr("Open the shift")}
              </button>
            )}
            <span className="text-[13px] text-g-muted">{shift.open ? tr("{n} people on shift", { n: team.filter((p) => p.onShift).length }) : shift.cash !== null ? tr("Cash counted: {sum}", { sum: compactMoney(shift.cash) }) : ""}</span>
          </div>
        }
      >
        <p className="text-[14px] font-semibold text-g-ink-2">{tr("Today's shift")}</p>
        <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em]">{shift.open ? tr("Open since {t}", { t: shift.openedAt }) : tr("Closed")}</p>
      </ArtScene>

      <section>
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h3 className="text-[20px] font-bold tracking-[-0.02em]">{tr("This week")}</h3>
          <span className="text-[13px] text-g-muted">{tr("Tap a cell to change the shift")}</span>
        </div>
        <div className="no-scrollbar -mx-5 overflow-x-auto px-5">
          <div className="grid min-w-[720px] gap-1.5" style={{ gridTemplateColumns: "180px repeat(7, minmax(0, 1fr))" }}>
            <span />
            {days.map((d) => (
              <span key={d.day} className={`py-1 text-center text-[12.5px] font-semibold ${d.today ? "text-g-blue" : "text-g-muted"}`}>
                {d.short} {d.day}
              </span>
            ))}
            {team.map((p) => (
              <div key={p.id} className="contents">
                <span className="flex min-w-0 items-center gap-2 pr-2">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${p.onShift ? "blue-grad" : "bg-g-fill text-g-ink-2"}`}>{p.name[0]}</span>
                  <span className="truncate text-[14px] font-semibold">{p.name}</span>
                </span>
                {(week[p.id] ?? Array<Slot>(7).fill("off")).map((s, di) => (
                  <button key={di} type="button" onClick={() => cycle(p.id, di)} className={`press flex h-11 flex-col items-center justify-center rounded-[14px] text-[12px] leading-tight font-semibold ${SLOT[s].cls} ${days[di]!.today ? "ring-2 ring-g-blue/40" : ""}`}>
                    {tr(SLOT[s].label)}
                    {SLOT[s].time && <span className="text-[10.5px] font-medium opacity-70 tabular-nums">{SLOT[s].time}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {counting && (
        <Sheet
          open
          onClose={() => setCounting(false)}
          label={tr("Close the shift")}
          footer={
            <button
              type="button"
              disabled={!counted}
              onClick={() => {
                haptic("success");
                shiftStore.set({ open: false, openedAt: shift.openedAt, cash: counted });
                notify(counted === expected ? tr("Shift closed · the cash matches") : tr("Shift closed · difference {sum}", { sum: compactMoney(counted - expected) }));
                setCounting(false);
                setCash("");
              }}
              className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
            >
              {tr("Close the shift")}
            </button>
          }
        >
          <div className="grid gap-5 px-5 pt-2 pb-10">
            <div>
              <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("Count the cash")}</h2>
              <p className="mt-0.5 text-[14px] text-g-muted">{tr("What is in the drawer now. We compare it with the cash bills of the shift.")}</p>
            </div>
            <Group>
              <Row icon={Clock} title={tr("Opened at {t}", { t: shift.openedAt })} sub={tr("12 bills, 3 paid in cash")} />
              <Row icon={Hash} title={tr("Expected in cash")} right={<span className="text-[16px] font-bold tabular-nums">{compactMoney(expected)}</span>} />
            </Group>
            <Field label={tr("Counted")} hint={counted ? (counted === expected ? tr("Matches") : tr("Difference {sum}", { sum: compactMoney(counted - expected) })) : undefined}>
              <TextField value={cash} onChange={(v) => setCash(v.replace(/\D/g, ""))} inputMode="numeric" suffix="₫" placeholder="4530000" autoFocus />
            </Field>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Quests */

export const questStore = createStore<Quest[]>("yanyin:venue-quests", []);
const METRICS: { id: Quest["metric"]; label: string; unit: string }[] = [
  { id: "items_sold", label: "Sell dishes", unit: "dishes" },
  { id: "orders_served", label: "Serve orders", unit: "orders" },
  { id: "reviews_5star", label: "Get 5-star reviews", unit: "reviews" },
  { id: "revenue", label: "Reach takings", unit: "₫" },
];

export function QuestsAdmin({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const mine = questStore.use();
  const [edit, setEdit] = useState(false);
  const running = [
    { id: "q-plov", title: "Plov master", sub: "Serve 5 plovs in a shift", reward: "+150 XP · 50,000 ₫", progress: 62, mode: "solo" },
    { id: "q-sunday", title: "Shashlik Sunday", sub: "10 shashlik or kebab, the whole team", reward: "+200 XP · 100,000 ₫", progress: 30, mode: "race" },
  ];
  return (
    <div className="grid gap-4">
      <button type="button" onClick={() => (haptic("light"), setEdit(true))} className="press relative block text-left">
        <ArtScene name="trophy" layout="row" focal={48} className="rounded-[24px] p-4">
          <p className="flex items-center gap-1.5 text-[17px] leading-tight font-bold">
            <Plus size={17} strokeWidth={2.6} className="text-g-blue" /> {tr("New quest")}
          </p>
          <p className="mt-0.5 text-[13px] text-g-muted">{tr("A goal, a deadline, a reward. Progress counts itself from orders.")}</p>
        </ArtScene>
      </button>
      <h3 className="mt-2 px-1 text-[20px] font-bold tracking-[-0.02em]">{tr("Running now")}</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {[...mine.map((q) => ({ id: q.id, title: q.title, sub: q.description, reward: `+${q.reward.xp} XP${q.reward.bonus ? ` · ${compactMoney(q.reward.bonus)}` : ""}`, progress: 0, mode: q.mode })), ...running].map((q) => (
          <div key={q.id} className="animate-rise rounded-[24px] bg-g-fill p-4">
            <div className="flex items-start gap-3">
              <span className="blue-grad grid size-11 shrink-0 place-items-center rounded-full">
                <Trophy size={19} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-bold">{tr(q.title)}</span>
                <span className="block truncate text-[13px] text-g-muted">{tr(q.sub)}</span>
              </span>
              <span className="chip-blue shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold">{tr(q.mode === "team" ? "Team" : q.mode === "race" ? "Race" : "Solo")}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-g-card">
              <span className="block h-full rounded-full bg-g-blue" style={{ width: `${q.progress}%` }} />
            </div>
            <p className="mt-2 text-[13px] font-semibold text-g-blue">{q.reward}</p>
          </div>
        ))}
      </div>
      {edit && (
        <QuestEditor
          onClose={() => setEdit(false)}
          onSave={(q) => {
            questStore.set([q, ...mine]);
            haptic("success");
            notify(tr("Quest published · the team sees it on the quest board"));
            setEdit(false);
          }}
        />
      )}
    </div>
  );
}

function QuestEditor({ onClose, onSave }: { onClose: () => void; onSave: (q: Quest) => void }) {
  const tr = useTr();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<Quest["metric"][]>(["items_sold"]);
  const [target, setTarget] = useState("10");
  const [mode, setMode] = useState<Quest["mode"][]>(["solo"]);
  const [ends, setEnds] = useState(["shift"]);
  const [xp, setXp] = useState("150");
  const [bonus, setBonus] = useState("50000");
  const m = METRICS.find((x) => x.id === metric[0])!;
  const ok = title.trim().length > 2 && Number(target) > 0;
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("New quest")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() => onSave({ id: `vq-${Date.now()}`, title: title.trim(), description: `${tr(m.label)}: ${target} ${tr(m.unit)}`, metric: metric[0]!, target: Number(target), mode: mode[0]!, reward: { xp: Number(xp) || 0, bonus: Number(bonus) || undefined }, endsAt: ends[0]!, icon: "trophy" })}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
        >
          {tr("Publish the quest")}
        </button>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-2">
        <div className="grid content-start gap-5">
          <Field label={tr("Name")}>
            <TextField value={title} onChange={setTitle} placeholder={tr("Lemonade week")} autoFocus />
          </Field>
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Goal")}</p>
            <Choice value={metric} onChange={setMetric} options={METRICS.map((x) => ({ id: x.id, label: tr(x.label) }))} />
          </div>
          <Field label={tr("How many")}>
            <TextField value={target} onChange={(v) => setTarget(v.replace(/\D/g, ""))} inputMode="numeric" suffix={tr(m.unit)} />
          </Field>
        </div>
        <div className="grid content-start gap-5">
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Who plays")}</p>
            <Choice
              value={mode}
              onChange={setMode}
              options={[
                { id: "solo", label: tr("Each on their own") },
                { id: "team", label: tr("The whole team") },
                { id: "race", label: tr("Race: first wins") },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Until")}</p>
            <Choice
              value={ends}
              onChange={setEnds}
              options={[
                { id: "shift", label: tr("End of shift") },
                { id: "week", label: tr("End of week") },
                { id: "month", label: tr("End of month") },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("XP")}>
              <TextField value={xp} onChange={(v) => setXp(v.replace(/\D/g, ""))} inputMode="numeric" suffix="XP" />
            </Field>
            <Field label={tr("Bonus")}>
              <TextField value={bonus} onChange={(v) => setBonus(v.replace(/\D/g, ""))} inputMode="numeric" suffix="₫" />
            </Field>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Checklists */

export const templateStore = createStore<Record<string, ChecklistTemplate>>("yanyin:checklist-templates", {});

export function ChecklistsAdmin({ lists, runs, onOpenRun, notify }: { lists: { key: string; tpl: ChecklistTemplate; who: string }[]; runs: Record<string, ChecklistRun>; onOpenRun: (key: string) => void; notify: (t: string) => void }) {
  const tr = useTr();
  const saved = templateStore.use();
  const [edit, setEdit] = useState<string | null>(null);
  const tplOf = (key: string) => saved[key] ?? lists.find((l) => l.key === key)!.tpl;
  const flagged = lists.reduce((n, l) => n + checklistProgress(tplOf(l.key), runs[l.key]!, "12:45").flagged.length, 0);
  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-3 px-1 text-[20px] font-bold tracking-[-0.02em]">{tr("Today")}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {lists.map((l) => (
            <ChecklistCard key={l.key} template={tplOf(l.key)} run={runs[l.key]!} title={tr(tplOf(l.key).title)} who={l.who} className="" onOpen={() => onOpenRun(l.key)} />
          ))}
        </div>
        {flagged > 0 && <p className="mt-3 px-1 text-[13px] font-semibold text-[#e5484d]">{tr("{n} out of range|{n} out of range", { n: flagged })}</p>}
      </section>
      <section>
        <h3 className="mb-3 px-1 text-[20px] font-bold tracking-[-0.02em]">{tr("Templates")}</h3>
        <div className="grid gap-2">
          {lists.map((l) => {
            const t = tplOf(l.key);
            return <ListRow key={l.key} onClick={() => setEdit(l.key)} badge={<ClipboardCheck size={20} strokeWidth={2} />} title={tr(t.title)} sub={tr("{n} items · {xp} XP · {who}", { n: t.items.length, xp: t.xp, who: l.who })} right={<span className="text-[13px] font-semibold text-g-blue">{tr("Edit")}</span>} />;
          })}
        </div>
      </section>
      {edit && (
        <TemplateEditor
          tpl={tplOf(edit)}
          onClose={() => setEdit(null)}
          onSave={(t) => {
            templateStore.set({ ...saved, [edit]: t });
            haptic("success");
            notify(tr("Template saved · it applies from the next shift"));
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

const PHASES: ChecklistItem["phase"][] = ["open", "during", "close"];

function TemplateEditor({ tpl, onClose, onSave }: { tpl: ChecklistTemplate; onClose: () => void; onSave: (t: ChecklistTemplate) => void }) {
  const tr = useTr();
  const [items, setItems] = useState<ChecklistItem[]>(tpl.items);
  const [adding, setAdding] = useState<ChecklistItem["phase"] | null>(null);
  const [text, setText] = useState("");
  const [proof, setProof] = useState(["none"]);
  const put = (id: string, p: Partial<ChecklistItem>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <Sheet open wide onClose={onClose} label={tr(tpl.title)} footer={<button type="button" onClick={() => onSave({ ...tpl, items })} className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold">{tr("Save the template")}</button>}>
      <div className="grid gap-6 px-5 pt-2 pb-10">
        <div>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">{tr(tpl.title)}</h2>
          <p className="mt-0.5 text-[14px] text-g-muted">{tr("Tap the lock to make an item optional. Photo and number items ask for proof.")}</p>
        </div>
        {PHASES.map((ph) => (
          <section key={ph}>
            <h3 className="mb-2 px-1 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr(ph === "open" ? "Opening" : ph === "during" ? "During the shift" : "Closing")}</h3>
            <div className="card rounded-[24px] p-1.5">
              {items
                .filter((i) => i.phase === ph)
                .map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-[18px] px-2.5 py-2">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${i.proof ? "chip-blue" : "bg-g-card text-g-faint"}`}>{i.proof?.kind === "photo" ? <Camera size={16} /> : i.proof?.kind === "number" ? <Hash size={16} /> : <Check size={16} />}</span>
                    <input value={tr(i.title)} onChange={(e) => put(i.id, { title: e.target.value })} aria-label={tr("Item")} className="h-10 min-w-0 flex-1 rounded-full bg-transparent px-2 text-[15px] outline-none focus:bg-g-card" />
                    {i.due && <span className="shrink-0 text-[12.5px] font-semibold text-g-muted tabular-nums">{i.due}</span>}
                    <button type="button" aria-label={tr("Required")} onClick={() => (haptic("tick"), put(i.id, { required: i.required === false ? true : false }))} className={`press grid size-9 shrink-0 place-items-center rounded-full ${i.required === false ? "bg-g-card text-g-faint" : "chip-blue"}`}>
                      {i.required === false ? <Unlock size={15} /> : <Lock size={15} />}
                    </button>
                    <button type="button" aria-label={tr("Remove")} onClick={() => (haptic("light"), setItems((xs) => xs.filter((x) => x.id !== i.id)))} className="press grid size-9 shrink-0 place-items-center rounded-full bg-g-card text-g-muted">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              {adding === ph ? (
                <div className="animate-rise grid gap-2 p-2">
                  <TextField value={text} onChange={setText} placeholder={tr("What to do")} autoFocus />
                  <Choice
                    value={proof}
                    onChange={setProof}
                    options={[
                      { id: "none", label: tr("Just a tick") },
                      { id: "photo", label: tr("Photo"), icon: Camera },
                      { id: "number", label: tr("Number °C"), icon: Hash },
                    ]}
                  />
                  <button
                    type="button"
                    disabled={!text.trim()}
                    onClick={() => {
                      haptic("success");
                      setItems((xs) => [...xs, { id: `c${Date.now()}`, title: text.trim(), phase: ph, ...(proof[0] === "photo" ? { proof: { kind: "photo" as const } } : proof[0] === "number" ? { proof: { kind: "number" as const, unit: "°C", min: 1, max: 5 } } : {}) }]);
                      setText("");
                      setAdding(null);
                    }}
                    className="blue-grad press h-12 rounded-full text-[15px] font-semibold disabled:opacity-40"
                  >
                    {tr("Add the item")}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => (haptic("light"), setAdding(ph), setText(""), setProof(["none"]))} className="press flex h-12 w-full items-center gap-2 rounded-[18px] px-3 text-[14.5px] font-semibold text-g-blue">
                  <Plus size={17} strokeWidth={2.4} /> {tr("Add an item")}
                </button>
              )}
            </div>
          </section>
        ))}
        <Group>
          <Row icon={Trophy} title={tr("XP for the whole list")} right={<span className="text-[15px] font-bold tabular-nums">{tpl.xp} XP</span>} />
          <Row icon={Clock} title={tr("Late items lose a quarter of their XP")} right={<Switch on onChange={() => undefined} label={tr("Late items lose XP")} />} />
        </Group>
        {!items.length && <EmptyState art="checklist" title={tr("The list is empty")} text={tr("Add the first item to a phase above.")} />}
      </div>
    </Sheet>
  );
}
