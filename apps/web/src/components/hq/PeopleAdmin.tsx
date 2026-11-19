"use client";

import {
  Camera,
  Check,
  Clock,
  Hash,
  Lock,
  Plus,
  Trash2,
  Trophy,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import {
  type ChecklistItem,
  type ChecklistTemplate,
  type Person,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { createStore } from "@/lib/store";
import { nowHM, tasksStore } from "@/lib/team-stores";
import { Sheet } from "@/components/guest/ui";
import {
  Choice,
  EmptyState,
  Field,
  Group,
  ListRow,
  Row,
  Switch,
  TextField,
} from "@/components/system/Kit";
import { useTr } from "@/components/crew/prefs";

/*
 * People and the rhythm of the shift (docs/09 §12–14): the week's schedule and
 * today's shift with the cash count; quests the venue runs for the team (they
 * appear on every waiter's quest board); checklist templates for each role.
 */

/* ---------------------------------------------------------------- Checklists */

export const templateStore = createStore<Record<string, ChecklistTemplate>>(
  "yanyin:checklist-templates",
  {},
);

const PHASES: ChecklistItem["phase"][] = ["open", "during", "close"];

export function TemplateEditor({
  tpl,
  onClose,
  onSave,
}: {
  tpl: ChecklistTemplate;
  onClose: () => void;
  onSave: (t: ChecklistTemplate) => void;
}) {
  const tr = useTr();
  const [items, setItems] = useState<ChecklistItem[]>(tpl.items);
  const [adding, setAdding] = useState<ChecklistItem["phase"] | null>(null);
  const [text, setText] = useState("");
  const [proof, setProof] = useState(["none"]);
  const put = (id: string, p: Partial<ChecklistItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr(tpl.title)}
      footer={
        <button
          type="button"
          onClick={() => onSave({ ...tpl, items })}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save the template")}
        </button>
      }
    >
      <div className="grid gap-6 px-5 pt-2 pb-10">
        <div>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {tr(tpl.title)}
          </h2>
          <p className="mt-0.5 text-[14px] text-g-muted">
            {tr(
              "Tap the lock to make an item optional. Photo and number items ask for proof.",
            )}
          </p>
        </div>
        {PHASES.map((ph) => (
          <section key={ph}>
            <h3 className="mb-2 px-1 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
              {tr(
                ph === "open"
                  ? "Opening"
                  : ph === "during"
                    ? "During the shift"
                    : "Closing",
              )}
            </h3>
            <div className="card rounded-[24px] p-1.5">
              {items
                .filter((i) => i.phase === ph)
                .map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-2 rounded-full px-2.5 py-2"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full ${i.proof ? "chip-blue" : "bg-g-card text-g-faint"}`}
                    >
                      {i.proof?.kind === "photo" ? (
                        <Camera size={16} />
                      ) : i.proof?.kind === "number" ? (
                        <Hash size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                    </span>
                    <input
                      value={tr(i.title)}
                      onChange={(e) => put(i.id, { title: e.target.value })}
                      aria-label={tr("Item")}
                      className="h-10 min-w-0 flex-1 rounded-full bg-transparent px-2 text-[15px] outline-none focus:bg-g-card"
                    />
                    {i.due && (
                      <span className="shrink-0 text-[12.5px] font-semibold text-g-muted tabular-nums">
                        {i.due}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={tr("Required")}
                      onClick={() => (
                        haptic("tick"),
                        put(i.id, {
                          required: i.required === false ? true : false,
                        })
                      )}
                      className={`press grid size-9 shrink-0 place-items-center rounded-full ${i.required === false ? "bg-g-card text-g-faint" : "chip-blue"}`}
                    >
                      {i.required === false ? (
                        <Unlock size={15} />
                      ) : (
                        <Lock size={15} />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={tr("Remove")}
                      onClick={() => (
                        haptic("light"),
                        setItems((xs) => xs.filter((x) => x.id !== i.id))
                      )}
                      className="press grid size-9 shrink-0 place-items-center rounded-full bg-g-card text-g-muted"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              {adding === ph ? (
                <div className="animate-rise grid gap-2 p-2">
                  <TextField
                    value={text}
                    onChange={setText}
                    placeholder={tr("What to do")}
                    autoFocus
                  />
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
                      setItems((xs) => [
                        ...xs,
                        {
                          id: `c${Date.now()}`,
                          title: text.trim(),
                          phase: ph,
                          ...(proof[0] === "photo"
                            ? { proof: { kind: "photo" as const } }
                            : proof[0] === "number"
                              ? {
                                  proof: {
                                    kind: "number" as const,
                                    unit: "°C",
                                    min: 1,
                                    max: 5,
                                  },
                                }
                              : {}),
                        },
                      ]);
                      setText("");
                      setAdding(null);
                    }}
                    className="blue-grad press h-12 rounded-full text-[15px] font-semibold disabled:opacity-40"
                  >
                    {tr("Add the item")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => (
                    haptic("light"),
                    setAdding(ph),
                    setText(""),
                    setProof(["none"])
                  )}
                  className="press flex h-12 w-full items-center gap-2 rounded-full px-3 text-[14.5px] font-semibold text-g-blue"
                >
                  <Plus size={17} strokeWidth={2.4} /> {tr("Add an item")}
                </button>
              )}
            </div>
          </section>
        ))}
        <Group>
          <Row
            icon={Trophy}
            title={tr("XP for the whole list")}
            right={
              <span className="text-[15px] font-bold tabular-nums">
                {tpl.xp} XP
              </span>
            }
          />
          <Row
            icon={Clock}
            title={tr("Late items lose a quarter of their XP")}
            right={
              <Switch
                on
                onChange={() => undefined}
                label={tr("Late items lose XP")}
              />
            }
          />
        </Group>
        {!items.length && (
          <EmptyState
            art="checklist"
            title={tr("The list is empty")}
            text={tr("Add the first item to a phase above.")}
          />
        )}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Tasks */

/** Tasks with an @assignee: set here, they land on the person's home screen; ticked there, they show done here. */
export function TasksAdmin({
  team,
  me,
  notify,
}: {
  team: Person[];
  me: string;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const all = tasksStore.use();
  const [adding, setAdding] = useState(false);
  const [to, setTo] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [due, setDue] = useState(["17:00"]);
  const who = (id: string) => team.find((p) => p.id === id);
  const open = all.filter((t) => !t.done);
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h3 className="flex items-baseline gap-2 text-[20px] font-bold tracking-[-0.02em]">
          {tr("Tasks")}{" "}
          <span className="text-[14px] font-medium text-g-faint">
            {open.length}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => (haptic("light"), setAdding(true))}
          className="press flex h-10 items-center gap-1.5 rounded-full bg-g-fill px-4 text-[14px] font-semibold"
        >
          <Plus size={16} strokeWidth={2.4} className="text-g-blue" />{" "}
          {tr("Give a task")}
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {all.map((t) => (
          <ListRow
            key={t.id}
            badge={
              t.done ? (
                <Check size={19} strokeWidth={2.8} />
              ) : (
                (who(t.to)?.name[0] ?? "?")
              )
            }
            badgeTone={t.done ? "chip-green" : "chip-blue"}
            title={t.title}
            sub={`@${who(t.to)?.handle} · ${t.done ? tr("done at {t}", { t: t.done.at }) : t.due ? tr("by {t}", { t: t.due }) : t.at}`}
          />
        ))}
      </div>
      {adding && (
        <Sheet
          open
          onClose={() => setAdding(false)}
          label={tr("Give a task")}
          title={false}
          footer={
            <button
              type="button"
              disabled={!to.length || text.trim().length < 3}
              onClick={() => {
                const p = who(to[0]!)!;
                tasksStore.set([
                  {
                    id: `t${Date.now()}`,
                    title: `@${p.handle} ${text.trim()}`,
                    to: p.id,
                    by: me,
                    due: due[0],
                    at: nowHM(),
                  },
                  ...all,
                ]);
                haptic("success");
                notify(tr("Task sent to @{h}", { h: p.handle }));
                setAdding(false);
                setText("");
                setTo([]);
              }}
              className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
            >
              {tr("Send the task")}
            </button>
          }
        >
          <div className="grid gap-5 px-5 pt-1 pb-10">
            <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
              {tr("Give a task")}
            </h2>
            <div>
              <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">
                {tr("Who")}
              </p>
              <Choice
                value={to}
                onChange={setTo}
                options={team
                  .filter((p) => p.onShift && p.id !== me)
                  .map((p) => ({ id: p.id, label: `@${p.handle}` }))}
              />
            </div>
            <Field label={tr("What to do")}>
              <TextField
                value={text}
                onChange={setText}
                placeholder={tr("Change the tablecloth on table 12")}
              />
            </Field>
            <div>
              <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">
                {tr("By")}
              </p>
              <Choice
                value={due}
                onChange={setDue}
                options={["13:30", "15:00", "17:00", "22:00"].map((t) => ({
                  id: t,
                  label: t,
                }))}
              />
            </div>
          </div>
        </Sheet>
      )}
    </section>
  );
}
