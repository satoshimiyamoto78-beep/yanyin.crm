"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  Camera,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Hash,
  Thermometer,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import {
  checklistProgress,
  type ChecklistPhase,
  type ChecklistRun,
  type ChecklistTemplate,
  type Person,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { PersonPic } from "@/components/system/PersonPic";
import { WidgetCard } from "@/components/system/Widgets";
import { useTr } from "@/components/crew/prefs";
import { templateStore, TemplateEditor } from "./PeopleAdmin";
import { Ring } from "./ShiftsAdmin";

/*
 * Checklists (docs/07 §85). Three tabs:
 *  - Today: one ring per list, nested like activity rings, with what comes
 *    next and who works it; then what needs the admin (values out of range,
 *    late items) with a nudge; then each list split by phase.
 *  - History: two weeks as a heat strip per list (tap a day for its report:
 *    who did what and when, what was missed, the values), the items missed
 *    most and who keeps their lists cleanest.
 *  - Templates: the lists and their editor.
 */

type Tab = "today" | "history" | "templates";
type Entry = { key: string; tpl: ChecklistTemplate; who: string };
const NOW = "12:45";
const COLORS = ["#2f5bff", "#14b8a6", "#ef6c1a"];
const PHASE_LABEL: Record<ChecklistPhase, string> = {
  open: "Opening",
  during: "During the shift",
  close: "Closing",
};
const PHASES: ChecklistPhase[] = ["open", "during", "close"];
const DAYS = Array.from({ length: 14 }, (_, i) => 13 - i); // 13 Nov back to 31 Oct
const dayLabel = (d: number) => (d > 0 ? `${d} Nov` : `${31 + d} Oct`);
/** Demo history: a steady score per list and day, now and then a bad day. */
const score = (key: string, d: number) => {
  const s = [...key].reduce((n, c) => n + c.charCodeAt(0), 0);
  const v = 100 - ((s * (d + 7)) % 12);
  return d % 6 === 2 && key !== "bar" ? v - 19 : v;
};

export function ChecklistsAdmin({
  lists,
  runs,
  team,
  onOpenRun,
  notify,
}: {
  lists: Entry[];
  runs: Record<string, ChecklistRun>;
  team: Person[];
  onOpenRun: (key: string) => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const saved = templateStore.use();
  const [tab, setTab] = useState<Tab>("today");
  const [edit, setEdit] = useState<string | null>(null);
  const [day, setDay] = useState<{ key: string; d: number } | null>(null);
  const tplOf = (key: string) =>
    saved[key] ?? lists.find((l) => l.key === key)!.tpl;
  const rows = lists.map((l, i) => ({
    ...l,
    tpl: tplOf(l.key),
    run: runs[l.key]!,
    color: COLORS[i % 3]!,
    p: checklistProgress(tplOf(l.key), runs[l.key]!, NOW),
  }));
  const done = rows.reduce((n, r) => n + r.p.done, 0);
  const total = rows.reduce((n, r) => n + r.p.total, 0);
  const name = (id: string) => team.find((p) => p.id === id);
  const issues = rows.flatMap((r) => [
    ...r.p.flagged.map((it) => {
      const m = r.run.marks[it.id]!;
      const pr = it.proof?.kind === "number" ? it.proof : null;
      return {
        r,
        it,
        kind: "range" as const,
        text: `${m.value}${pr?.unit ?? ""} · ${tr("norm {a}–{b}", { a: pr?.min ?? "", b: pr?.max ?? "" })}`,
        at: m.at,
        by: m.by,
      };
    }),
    ...r.p.late.map((it) => ({
      r,
      it,
      kind: "late" as const,
      text: tr("due {t}", { t: it.due! }),
      at: it.due!,
      by: "",
    })),
  ]);

  return (
    <div className="grid gap-5">
      <div className="flex justify-self-start rounded-full bg-g-fill p-1">
        {(["today", "history", "templates"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => (haptic("tick"), setTab(t))}
            aria-pressed={tab === t}
            className={`h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${tab === t ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`}
          >
            {tr(
              t === "today"
                ? "Today"
                : t === "history"
                  ? "History"
                  : "Templates",
            )}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-rise grid gap-5">
        {tab === "today" && (
          <>
            {/* Nested rings, one per list, the shift's total in the middle. */}
            <section className="grid items-center gap-5 rounded-[28px] bg-g-fill p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div className="relative mx-auto grid place-items-center">
                {rows.map((r, i) => (
                  <span
                    key={r.key}
                    className="col-start-1 row-start-1 grid place-items-center"
                  >
                    <Ring
                      value={r.p.percent / 100}
                      size={176 - i * 40}
                      stroke={14}
                      color={r.color}
                    />
                  </span>
                ))}
                <span className="col-start-1 row-start-1 text-center">
                  <span className="live block text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums">
                    {Math.round((done / Math.max(1, total)) * 100)}%
                  </span>
                  <span className="text-[11.5px] text-g-muted tabular-nums">
                    {done}/{total}
                  </span>
                </span>
              </div>
              <div className="grid gap-2">
                {rows.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => (haptic("light"), onOpenRun(r.key))}
                    className="press flex items-center gap-3 rounded-[18px] bg-white px-3.5 py-2.5 text-left [[data-scheme=dark]_&]:bg-g-card"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: r.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">
                          {tr(r.tpl.title)}
                        </span>
                        <span className="live shrink-0 text-[14px] font-bold tabular-nums">
                          {r.p.done}/{r.p.total}
                        </span>
                      </span>
                      <span className="block truncate text-[12.5px] text-g-muted">
                        {r.who} ·{" "}
                        {r.p.next
                          ? `${tr("Next")}: ${tr(r.p.next.title)}`
                          : tr("All done")}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-g-faint" />
                  </button>
                ))}
              </div>
            </section>

            {/* What the admin should act on now. */}
            <WidgetCard
              title={tr("Needs attention")}
              icon={<Bell size={13} strokeWidth={2.4} />}
              aside={
                <span
                  className={`text-[12.5px] font-semibold ${issues.length ? "text-g-orange" : "text-g-green"}`}
                >
                  {issues.length || tr("all calm")}
                </span>
              }
            >
              {issues.length ? (
                <div className="stagger mt-3 grid gap-1.5">
                  {issues.map((x) => (
                    <div
                      key={x.r.key + x.it.id}
                      className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-2.5 [[data-scheme=dark]_&]:bg-g-card"
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-full ${x.kind === "range" ? "chip-red" : "chip-orange"}`}
                      >
                        {x.kind === "range" ? (
                          <Thermometer size={16} strokeWidth={2.2} />
                        ) : (
                          <Clock size={16} strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">
                          {tr(x.it.title)}
                        </span>
                        <span className="block truncate text-[12.5px] text-g-muted tabular-nums">
                          {tr(x.r.tpl.title)} · {x.text}
                          {x.by && ` · @${name(x.by)?.handle ?? ""} ${x.at}`}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => (
                          haptic("success"),
                          notify(tr("Reminder sent to {who}", { who: x.r.who }))
                        )}
                        className="press h-9 shrink-0 rounded-full bg-g-fill px-3 text-[13px] font-semibold text-g-blue"
                      >
                        {tr("Remind")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[14px] text-g-muted">
                  {tr("Nothing out of range, nothing late.")}
                </p>
              )}
            </WidgetCard>

            {/* Each list by phase: three segments, each fills as its items are done. */}
            <div className="grid gap-3 md:grid-cols-3">
              {rows.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => (haptic("light"), onOpenRun(r.key))}
                  className="press rounded-[24px] bg-g-fill p-4 text-left"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-bold">
                      {tr(r.tpl.title)}
                    </span>
                    <span className="text-[12.5px] font-semibold text-g-blue">
                      +{r.tpl.xp} XP
                    </span>
                  </span>
                  <span className="mt-3 grid gap-2.5">
                    {PHASES.map((ph) => {
                      const items = r.tpl.items.filter((i) => i.phase === ph);
                      const d = items.filter((i) => r.run.marks[i.id]).length;
                      if (!items.length) return null;
                      return (
                        <span key={ph} className="block">
                          <span className="flex justify-between text-[12.5px]">
                            <span className="text-g-muted">
                              {tr(PHASE_LABEL[ph])}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {d}/{items.length}
                            </span>
                          </span>
                          <span className="mt-1 flex gap-[3px]">
                            {items.map((i) => {
                              const m = r.run.marks[i.id];
                              const bad = r.p.flagged.includes(i);
                              const late = r.p.late.includes(i);
                              return (
                                <span
                                  key={i.id}
                                  className={`h-2 flex-1 rounded-full transition-colors duration-500 ${bad ? "bg-[#e5484d]" : m ? "" : late ? "bg-g-orange/60" : "bg-g-card"}`}
                                  style={
                                    m && !bad
                                      ? { background: r.color }
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "history" && (
          <>
            <WidgetCard
              title={tr("Two weeks")}
              icon={<ClipboardCheck size={13} strokeWidth={2.4} />}
              aside={
                <span className="text-[12px] text-g-muted">
                  {tr("tap a day")}
                </span>
              }
            >
              <div className="mt-3 grid gap-2">
                {rows.map((r) => (
                  <div
                    key={r.key}
                    className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-2"
                  >
                    <span className="truncate text-[12.5px] font-semibold text-g-ink-2">
                      {tr(
                        ["Hall", "Bar", "Kitchen"][rows.indexOf(r)] ??
                          r.tpl.title,
                      )}
                    </span>
                    <div className="flex gap-[3px]">
                      {[...DAYS].reverse().map((d, i) => {
                        const v = score(r.key, d);
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-label={`${dayLabel(d)} ${v}%`}
                            onClick={() => (
                              haptic("tick"),
                              setDay({ key: r.key, d })
                            )}
                            className="press h-8 flex-1 rounded-[7px]"
                            style={{
                              background: v < 85 ? "#ef6c1a" : r.color,
                              opacity:
                                v < 85 ? 0.9 : 0.25 + ((v - 85) / 15) * 0.75,
                              animation: `rise 0.4s ${i * 22}ms both cubic-bezier(0.22,1,0.36,1)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-2 text-[10.5px] text-g-faint">
                  <span />
                  <span className="flex justify-between">
                    <span>{dayLabel(DAYS[13]!)}</span>
                    <span>{dayLabel(DAYS[0]!)}</span>
                  </span>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-2 text-[12px] text-g-muted">
                <span className="size-2.5 rounded-[3px] bg-g-orange" />{" "}
                {tr("under 85% done")}
              </p>
            </WidgetCard>

            <div className="grid gap-4 md:grid-cols-2">
              <WidgetCard
                title={tr("Missed most")}
                icon={<AlertTriangle size={13} strokeWidth={2.4} />}
              >
                <div className="mt-2 grid gap-1">
                  {[
                    [rows[0]!.tpl.items[6]?.title ?? "", 5, rows[0]!.tpl.title],
                    [
                      rows[2]?.tpl.items[4]?.title ?? "",
                      3,
                      rows[2]?.tpl.title ?? "",
                    ],
                    [
                      rows[1]?.tpl.items[2]?.title ?? "",
                      2,
                      rows[1]?.tpl.title ?? "",
                    ],
                  ].map(([t, n, l]) => (
                    <div
                      key={t as string}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <span className="chip-orange grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold tabular-nums">
                        {n}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">
                          {tr(t as string)}
                        </span>
                        <span className="block text-[12px] text-g-muted">
                          {tr(l as string)} ·{" "}
                          {tr("missed {n} times in 2 weeks", {
                            n: n as number,
                          })}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </WidgetCard>
              <WidgetCard
                title={tr("Cleanest lists")}
                icon={<Trophy size={13} strokeWidth={2.4} />}
              >
                <div className="mt-2 grid gap-1">
                  {[
                    ["staff-thao", 100, 14],
                    ["staff-linh", 97, 12],
                    ["staff-dima", 94, 11],
                  ].map(([id, v, streak], i) => {
                    const p = name(id as string);
                    if (!p) return null;
                    return (
                      <div
                        key={id as string}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <span className="w-4 text-[13px] font-bold text-g-faint tabular-nums">
                          {i + 1}
                        </span>
                        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[13px] font-bold">
                          <PersonPic p={p} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-semibold">
                            {p.name}
                          </span>
                          <span className="block text-[12px] text-g-muted">
                            {tr("{n} days in a row on time", {
                              n: streak as number,
                            })}
                          </span>
                        </span>
                        <span className="text-[14px] font-bold tabular-nums">
                          {v}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>
            </div>
            <p className="px-1 text-[12.5px] text-g-faint">
              {tr(
                "Checklists are kept 3 years with their values; photos 90 days.",
              )}
            </p>
          </>
        )}

        {tab === "templates" && (
          <div className="stagger grid gap-2 md:grid-cols-3">
            {rows.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => (haptic("light"), setEdit(r.key))}
                className="press rounded-[24px] bg-g-fill p-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full text-white"
                    style={{ background: r.color }}
                  >
                    <ClipboardCheck size={18} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-bold">
                      {tr(r.tpl.title)}
                    </span>
                    <span className="block text-[12.5px] text-g-muted">
                      {r.who} · +{r.tpl.xp} XP
                    </span>
                  </span>
                </span>
                <span className="mt-3 grid grid-cols-3 gap-1.5">
                  {PHASES.map((ph) => (
                    <span
                      key={ph}
                      className="rounded-[14px] bg-white px-2 py-1.5 text-center [[data-scheme=dark]_&]:bg-g-card"
                    >
                      <span className="block text-[16px] font-bold tabular-nums">
                        {r.tpl.items.filter((i) => i.phase === ph).length}
                      </span>
                      <span className="block truncate text-[10.5px] text-g-muted">
                        {tr(PHASE_LABEL[ph])}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="mt-2.5 flex gap-3 text-[12px] text-g-muted">
                  <span className="flex items-center gap-1">
                    <Camera size={13} />{" "}
                    {
                      r.tpl.items.filter((i) => i.proof?.kind === "photo")
                        .length
                    }
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash size={13} />{" "}
                    {
                      r.tpl.items.filter((i) => i.proof?.kind === "number")
                        .length
                    }
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} />{" "}
                    {r.tpl.items.filter((i) => i.due).length}
                  </span>
                  <span className="ml-auto font-semibold text-g-blue">
                    {tr("Edit")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {day &&
        (() => {
          const r = rows.find((x) => x.key === day.key)!;
          const v = score(r.key, day.d);
          const missed = Math.round(((100 - v) / 100) * r.tpl.items.length);
          const who = team.find((p) =>
            r.key === "waiter"
              ? p.id === "staff-linh"
              : r.key === "bar"
                ? p.id === "staff-thao"
                : p.id === "staff-dima",
          );
          return (
            <Sheet open onClose={() => setDay(null)} label={tr(r.tpl.title)}>
              <div className="grid gap-4 px-5 pt-2 pb-10">
                <div className="flex items-center gap-4">
                  <Ring
                    value={v / 100}
                    size={72}
                    stroke={9}
                    color={v < 85 ? "#ef6c1a" : r.color}
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-g-blue">
                      {dayLabel(day.d)}
                    </p>
                    <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
                      {tr(r.tpl.title)}
                    </h2>
                    <p className="text-[13.5px] text-g-muted">
                      {v}% · {who ? `@${who.handle}` : r.who}
                    </p>
                  </div>
                </div>
                {PHASES.map((ph) => {
                  const items = r.tpl.items.filter((i) => i.phase === ph);
                  if (!items.length) return null;
                  return (
                    <div key={ph}>
                      <p className="px-1 text-[13px] font-semibold text-g-ink-2">
                        {tr(PHASE_LABEL[ph])}
                      </p>
                      <div className="mt-1.5 rounded-[22px] bg-g-fill p-1.5">
                        {items.map((it, k) => {
                          const idx = r.tpl.items.indexOf(it);
                          const miss = idx >= r.tpl.items.length - missed;
                          return (
                            <div
                              key={it.id}
                              className="flex items-center gap-3 px-3 py-2.5"
                            >
                              <span
                                className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${miss ? "chip-orange" : "chip-green"}`}
                              >
                                {miss ? (
                                  <AlertTriangle size={12} strokeWidth={2.6} />
                                ) : (
                                  <Check size={13} strokeWidth={3} />
                                )}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[14px]">
                                {tr(it.title)}
                              </span>
                              <span className="shrink-0 text-[12.5px] text-g-muted tabular-nums">
                                {miss
                                  ? tr("missed")
                                  : `${String(9 + Math.floor((idx * 47) / 60)).padStart(2, "0")}:${String((idx * 47 + k * 7) % 60).padStart(2, "0")}${it.proof?.kind === "number" ? ` · ${3 + (idx % 2)}${it.proof.unit}` : ""}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Sheet>
          );
        })()}

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
