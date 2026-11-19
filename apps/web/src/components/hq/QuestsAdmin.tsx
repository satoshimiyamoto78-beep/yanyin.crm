"use client";

import {
  Check,
  Flag,
  Gift,
  Hand,
  Minus,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import {
  badgeStore,
  DONE_SEED,
  ICONS,
  liveStore,
  recount,
  TIERS,
  type BadgeRule,
  type GameBadge,
  type LiveQuest,
  type Tier,
} from "@/lib/demo-game";
import { Sheet } from "@/components/guest/ui";
import { PersonPic } from "@/components/system/PersonPic";
import { BadgeEmblem, QuestMedal } from "@/components/crew/Emblems";
import { compactMoney } from "@/components/crew/CrewApp";
import { useTr } from "@/components/crew/prefs";

/*
 * Quests and badges (yanyin.quest, docs/07 §85). Three tabs:
 *  - Live: a board header (how many run, XP and bonuses this month), then
 *    each quest as a medal card with its leaderboard; a quest opens its page
 *    (rules, full leaderboard, what counted, extend or stop).
 *  - Badges: the venue's achievements as emblems, how each is earned, who
 *    has it and who is close; the admin creates new ones or hands one out.
 *  - History: finished quests with the result, the winners and what was paid.
 * The editor builds a quest step by step with a live preview of its card.
 */

type Tab = "live" | "badges" | "history";
const MODE: Record<
  LiveQuest["mode"],
  { label: string; icon: typeof User; hint: string }
> = {
  solo: {
    label: "Solo",
    icon: User,
    hint: "Each on their own: everyone who reaches it wins",
  },
  team: {
    label: "Team",
    icon: Users,
    hint: "The whole team: one shared counter",
  },
  race: {
    label: "Race",
    icon: Flag,
    hint: "Race: the first one there takes it",
  },
};
let seq = 0;
const uid = () => `${Date.now().toString(36)}${seq++}`;
const GOALS = [
  { id: "dishes", label: "Sell dishes", unit: "dishes", icon: Target },
  { id: "orders", label: "Serve orders", unit: "orders", icon: Check },
  { id: "reviews", label: "5-star reviews", unit: "reviews", icon: Sparkles },
  { id: "speed", label: "Fast tickets", unit: "tickets", icon: Timer },
] as const;
const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  sapphire: "Sapphire",
  diamond: "Diamond",
};
const RULE_METRIC: Record<
  Extract<BadgeRule, { kind: "count" }>["metric"],
  string
> = {
  upsells: "upsells",
  fast_tickets: "tickets under a minute",
  five_stars: "five-star reviews",
  checklists_clean: "clean closing checklists",
  shifts: "shifts",
  dishes: "dishes sold",
};

export function QuestsAdmin({
  team,
  dishes,
  notify,
}: {
  team: Person[];
  dishes: string[];
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const live = liveStore.use();
  const badges = badgeStore.use();
  const [tab, setTab] = useState<Tab>("live");
  const [quest, setQuest] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [newQuest, setNewQuest] = useState(false);
  const [newBadge, setNewBadge] = useState(false);
  const who = (id: string) => team.find((p) => p.id === id);
  const q = live.find((x) => x.id === quest);
  const b = badges.find((x) => x.id === badge);
  const xpMonth = DONE_SEED.reduce((n, d) => n + d.xp * d.winners.length, 0);
  const bonusMonth = DONE_SEED.reduce(
    (n, d) => n + d.bonus * d.winners.length,
    0,
  );

  return (
    <div className="grid gap-5">
      {/* The board: a dark game header with the month's numbers and the main action. */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#0b1020] p-5 text-white">
        <div className="pointer-events-none absolute -top-20 -left-10 size-64 rounded-full bg-[#f0a81c]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 -bottom-20 size-64 rounded-full bg-g-blue/35 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span>
            <QuestMedal state="done" icon={Trophy} size={76} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white/60">
              {tr("Quest board")}
            </p>
            <p className="text-[24px] leading-tight font-bold tracking-[-0.02em]">
              {tr("{n} quests running|{n} quests running", { n: live.length })}
            </p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            [tr("Finished"), String(DONE_SEED.filter((d) => d.done).length)],
            [tr("XP given"), xpMonth.toLocaleString("en-US")],
            [tr("Bonuses"), compactMoney(bonusMonth)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[18px] bg-white/8 px-3 py-2.5">
              <p className="text-[11.5px] text-white/55">{k}</p>
              <p className="live mt-0.5 truncate text-[17px] font-bold tabular-nums">
                {v}
              </p>
            </div>
          ))}
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => (haptic("light"), setNewQuest(true))}
            className="press flex h-12 items-center justify-center gap-2 rounded-full bg-[#fff] text-[15px] font-semibold text-[#0b1020]"
          >
            <Plus size={17} strokeWidth={2.6} /> {tr("New quest")}
          </button>
          <button
            type="button"
            onClick={() => (haptic("light"), setNewBadge(true))}
            className="press flex h-12 items-center justify-center gap-2 rounded-full bg-white/12 text-[15px] font-semibold"
          >
            <Plus size={17} strokeWidth={2.6} /> {tr("New badge")}
          </button>
        </div>
      </section>

      <div className="flex justify-self-start rounded-full bg-g-fill p-1">
        {(["live", "badges", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => (haptic("tick"), setTab(t))}
            aria-pressed={tab === t}
            className={`h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${tab === t ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`}
          >
            {tr(
              t === "live"
                ? "Running now"
                : t === "badges"
                  ? "Badges"
                  : "History",
            )}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-rise grid gap-3">
        {tab === "live" && (
          <div className="stagger grid gap-3 md:grid-cols-2">
            {live.map((x) => {
              const sum =
                x.mode === "team"
                  ? x.players.reduce((n, p) => n + p.value, 0)
                  : Math.max(0, ...x.players.map((p) => p.value));
              const top = [...x.players]
                .sort((a, c) => c.value - a.value)
                .slice(0, 3);
              const Icon = ICONS[x.icon] ?? Trophy;
              const M = MODE[x.mode];
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => (haptic("light"), setQuest(x.id))}
                  className="press rounded-[24px] bg-g-fill p-4 text-left"
                >
                  <span className="flex items-start gap-3">
                    <QuestMedal state="active" icon={Icon} size={56} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-bold">
                          {tr(x.title)}
                        </span>
                      </span>
                      <span className="block text-[13px] leading-snug text-g-muted">
                        {tr(x.text)}
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="chip-blue inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold">
                          <M.icon size={12} strokeWidth={2.4} /> {tr(M.label)}
                        </span>
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white px-2 text-[11.5px] font-semibold text-g-ink-2 [[data-scheme=dark]_&]:bg-g-card">
                          <Timer size={12} strokeWidth={2.4} />{" "}
                          {tr("{t} left", { t: tr(x.left) })}
                        </span>
                      </span>
                    </span>
                  </span>
                  <span className="mt-3.5 flex items-baseline justify-between text-[13px]">
                    <span className="font-semibold tabular-nums">
                      {x.mode === "team" ? sum.toFixed(sum % 1 ? 1 : 0) : sum} /{" "}
                      {x.target} {tr(x.unit)}
                    </span>
                    <span className="font-semibold text-g-blue">
                      +{x.xp} XP{x.bonus ? ` · ${compactMoney(x.bonus)}` : ""}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-g-card">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#6c96ff] to-[#2f5bff] transition-[width] duration-700"
                      style={{
                        width: `${Math.min(100, (sum / x.target) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="mt-3 flex items-center gap-2">
                    <span className="flex -space-x-2">
                      {top.map((p) => {
                        const person = who(p.id);
                        return person ? (
                          <span
                            key={p.id}
                            className="relative grid size-7 place-items-center overflow-hidden rounded-full bg-g-card text-[11px] font-bold ring-2 ring-[var(--g-fill)]"
                          >
                            <PersonPic p={person} />
                          </span>
                        ) : null;
                      })}
                    </span>
                    <span className="truncate text-[12.5px] text-g-muted">
                      {top[0] && who(top[0].id)
                        ? tr("{name} leads", { name: who(top[0].id)!.name })
                        : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "badges" && (
          <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3">
            {badges.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => (haptic("light"), setBadge(x.id))}
                className="press flex flex-col items-center rounded-[24px] bg-g-fill px-3 pt-4 pb-3.5 text-center"
              >
                <BadgeEmblem
                  tier={x.tier}
                  icon={ICONS[x.icon] ?? Trophy}
                  earned={x.earned.length > 0}
                  size={78}
                />
                <span className="mt-2 line-clamp-1 text-[14.5px] font-bold">
                  {tr(x.name)}
                </span>
                <span className="text-[11.5px] font-semibold text-g-muted">
                  {tr(TIER_LABEL[x.tier])}
                </span>
                <span className="mt-2 flex h-6 items-center gap-1">
                  {x.earned.length ? (
                    <>
                      <span className="flex -space-x-1.5">
                        {x.earned.slice(0, 3).map((e) => {
                          const person = who(e.id);
                          return person ? (
                            <span
                              key={e.id}
                              className="relative grid size-6 place-items-center overflow-hidden rounded-full bg-g-card text-[10px] font-bold ring-2 ring-[var(--g-fill)]"
                            >
                              <PersonPic p={person} />
                            </span>
                          ) : null;
                        })}
                      </span>
                      <span className="text-[12px] font-semibold text-g-ink-2">
                        {x.earned.length}
                      </span>
                    </>
                  ) : (
                    <span className="text-[12px] text-g-muted">
                      {tr("nobody yet")}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="stagger grid gap-2">
            {DONE_SEED.map((d) => {
              const Icon = ICONS[d.icon] ?? Trophy;
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-[22px] bg-g-fill px-3.5 py-3"
                >
                  <QuestMedal
                    state={d.done ? "done" : "available"}
                    icon={Icon}
                    size={48}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">
                      {tr(d.title)}
                    </span>
                    <span className="block truncate text-[12.5px] text-g-muted">
                      {d.dates} · {tr(MODE[d.mode].label)} · {tr(d.result)}
                    </span>
                    {d.winners.length > 0 && (
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="flex -space-x-1.5">
                          {d.winners.slice(0, 5).map((id) => {
                            const person = who(id);
                            return person ? (
                              <span
                                key={id}
                                className="relative grid size-6 place-items-center overflow-hidden rounded-full bg-g-card text-[10px] font-bold ring-2 ring-[var(--g-fill)]"
                              >
                                <PersonPic p={person} />
                              </span>
                            ) : null;
                          })}
                        </span>
                        <span className="text-[12px] font-semibold text-g-blue">
                          +{d.xp} XP
                          {d.bonus ? ` · ${compactMoney(d.bonus)}` : ""}
                        </span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${d.done ? "chip-green" : "chip-gray"}`}
                  >
                    {tr(d.done ? "Done" : "Not reached")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {q && (
        <Sheet open wide onClose={() => setQuest(null)} label={tr(q.title)}>
          <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-2 md:items-start">
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <QuestMedal
                  state="active"
                  icon={ICONS[q.icon] ?? Trophy}
                  size={92}
                />
                <div className="min-w-0">
                  <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
                    {tr(q.title)}
                  </h2>
                  <p className="text-[14px] text-g-muted">{tr(q.text)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  [tr("Mode"), tr(MODE[q.mode].label)],
                  [tr("Until"), tr(q.ends)],
                  [tr("Reward"), `${q.xp} XP`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[18px] bg-g-fill p-3">
                    <p className="text-[11.5px] font-semibold text-g-muted">
                      {k}
                    </p>
                    <p className="mt-0.5 truncate text-[15px] font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-[18px] bg-g-fill p-3.5 text-[13.5px] text-g-ink-2">
                {tr(MODE[q.mode].hint)}.{" "}
                {q.bonus
                  ? tr("Bonus {sum} is added to the payslip.", {
                      sum: compactMoney(q.bonus),
                    })
                  : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => (
                    haptic("success"),
                    notify(tr("Extended by one day")),
                    setQuest(null)
                  )}
                  className="press h-12 rounded-full bg-g-fill text-[14.5px] font-semibold"
                >
                  {tr("Extend")}
                </button>
                <button
                  type="button"
                  onClick={() => (
                    haptic("light"),
                    liveStore.set(live.filter((x) => x.id !== q.id)),
                    notify(tr("Quest stopped")),
                    setQuest(null)
                  )}
                  className="press h-12 rounded-full bg-g-fill text-[14.5px] font-semibold text-[#e5484d]"
                >
                  {tr("Stop")}
                </button>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[24px] bg-g-fill p-4">
                <p className="text-[13px] font-semibold text-g-ink-2">
                  {tr(q.mode === "team" ? "Who brings what" : "Leaderboard")}
                </p>
                <div className="mt-2 grid gap-2.5">
                  {[...q.players]
                    .sort((a, c) => c.value - a.value)
                    .map((p, i) => {
                      const person = who(p.id);
                      if (!person) return null;
                      const part =
                        q.mode === "team"
                          ? p.value / q.target
                          : p.value / q.target;
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <span
                            className={`w-4 text-[13px] font-bold tabular-nums ${i === 0 ? "text-[#e9a21c]" : "text-g-faint"}`}
                          >
                            {i + 1}
                          </span>
                          <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[13px] font-bold">
                            <PersonPic p={person} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex justify-between text-[14px]">
                              <span className="truncate font-semibold">
                                {person.name}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums">
                                {p.value}
                                {q.mode === "team" ? "" : `/${q.target}`}
                              </span>
                            </span>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-g-card">
                              <span
                                className="block h-full rounded-full bg-g-blue transition-[width] duration-700"
                                style={{
                                  width: `${Math.min(100, part * 100)}%`,
                                }}
                              />
                            </span>
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="rounded-[24px] bg-g-fill p-4">
                <p className="text-[13px] font-semibold text-g-ink-2">
                  {tr("What counted")}
                </p>
                {q.feed.length ? (
                  <div className="mt-2 grid gap-2">
                    {q.feed.map((f, i) => (
                      <p key={i} className="flex gap-2 text-[13.5px]">
                        <span className="shrink-0 text-g-muted tabular-nums">
                          {f.at}
                        </span>
                        <span className="font-semibold text-g-blue">
                          @{who(f.who)?.handle}
                        </span>
                        <span className="min-w-0 truncate">{tr(f.text)}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[13.5px] text-g-muted">
                    {tr("Every sale that counts shows here as it happens.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Sheet>
      )}

      {b && (
        <Sheet open onClose={() => setBadge(null)} label={tr(b.name)}>
          <div className="grid gap-4 px-5 pt-2 pb-10">
            <div className="flex flex-col items-center text-center">
              <BadgeEmblem
                tier={b.tier}
                icon={ICONS[b.icon] ?? Trophy}
                earned
                size={132}
              />
              <h2 className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.025em]">
                {tr(b.name)}
              </h2>
              <p className="text-[13px] font-semibold text-g-muted">
                {tr(TIER_LABEL[b.tier])}
              </p>
              <p className="mt-2 max-w-[340px] text-[14.5px] text-g-ink-2">
                {tr(b.text)}
              </p>
              <span className="chip-blue mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold">
                {b.rule.kind === "manual" ? (
                  <Hand size={14} />
                ) : (
                  <Target size={14} />
                )}
                {b.rule.kind === "manual"
                  ? tr("Handed out by the admin")
                  : tr("Counts itself: {n} {what}", {
                      n: b.rule.target,
                      what: tr(RULE_METRIC[b.rule.metric]),
                    })}
              </span>
            </div>
            <div className="rounded-[24px] bg-g-fill p-4">
              <p className="text-[13px] font-semibold text-g-ink-2">
                {tr("Earned")}
              </p>
              {b.earned.length ? (
                <div className="mt-2 grid gap-2">
                  {b.earned.map((e) => {
                    const person = who(e.id);
                    return person ? (
                      <div key={e.id} className="flex items-center gap-3">
                        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[13px] font-bold">
                          <PersonPic p={person} />
                        </span>
                        <span className="flex-1 truncate text-[14.5px] font-semibold">
                          {person.name}
                        </span>
                        <span className="text-[13px] text-g-muted">{e.at}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="mt-2 text-[13.5px] text-g-muted">
                  {tr(
                    "Nobody yet. The first one gets it announced to the team.",
                  )}
                </p>
              )}
            </div>
            {b.close && b.close.length > 0 && b.rule.kind === "count" && (
              <div className="rounded-[24px] bg-g-fill p-4">
                <p className="text-[13px] font-semibold text-g-ink-2">
                  {tr("Close to it")}
                </p>
                <div className="mt-2 grid gap-2.5">
                  {b.close.map((c) => {
                    const person = who(c.id);
                    const target = b.rule.kind === "count" ? b.rule.target : 1;
                    return person ? (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[13px] font-bold">
                          <PersonPic p={person} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex justify-between text-[14px]">
                            <span className="truncate font-semibold">
                              {person.name}
                            </span>
                            <span className="tabular-nums">
                              {c.value}/{target}
                            </span>
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-g-card">
                            <span
                              className="block h-full rounded-full bg-g-blue"
                              style={{ width: `${(c.value / target) * 100}%` }}
                            />
                          </span>
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <GiveBadge
              badge={b}
              team={team}
              onGive={(id) => {
                badgeStore.set(
                  badges.map((x) =>
                    x.id === b.id
                      ? { ...x, earned: [{ id, at: "14 Nov" }, ...x.earned] }
                      : x,
                  ),
                );
                haptic("success");
                notify(
                  tr("{name} got the badge · the team sees it", {
                    name: who(id)?.name ?? "",
                  }),
                );
              }}
            />
          </div>
        </Sheet>
      )}

      {newQuest && (
        <QuestEditor
          team={team}
          dishes={dishes}
          onClose={() => setNewQuest(false)}
          onSave={(x) => {
            liveStore.set([x, ...live]);
            haptic("success");
            notify(tr("Quest published · the team sees it on the quest board"));
            setNewQuest(false);
            setTab("live");
          }}
        />
      )}
      {newBadge && (
        <BadgeEditor
          onClose={() => setNewBadge(false)}
          onSave={(x) => {
            badgeStore.set([...badges, x]);
            haptic("success");
            notify(tr("Badge created · it counts from today"));
            setNewBadge(false);
            setTab("badges");
          }}
        />
      )}
    </div>
  );
}

function GiveBadge({
  badge,
  team,
  onGive,
}: {
  badge: GameBadge;
  team: Person[];
  onGive: (id: string) => void;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const free = team.filter(
    (p) =>
      !p.roles.includes("owner") && !badge.earned.some((e) => e.id === p.id),
  );
  if (!free.length) return null;
  return open ? (
    <div className="animate-rise rounded-[24px] bg-g-fill p-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] font-semibold text-g-ink-2">
          {tr("Give it to")}
        </p>
        <button
          type="button"
          aria-label={tr("Close")}
          onClick={() => setOpen(false)}
          className="press grid size-8 place-items-center rounded-full"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {free.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => (onGive(p.id), setOpen(false))}
            className="press flex h-10 items-center gap-2 rounded-full bg-white pr-3.5 pl-1 text-[13.5px] font-semibold [[data-scheme=dark]_&]:bg-g-card"
          >
            <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-g-card text-[11px] font-bold">
              <PersonPic p={p} />
            </span>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => (haptic("light"), setOpen(true))}
      className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
    >
      <Gift size={17} strokeWidth={2.2} className="text-g-blue" />{" "}
      {tr("Hand it out")}
    </button>
  );
}

/** A big number with − and +, for targets and XP. */
function Stepper({
  value,
  onChange,
  step,
  min = 0,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  step: number;
  min?: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[22px] bg-g-fill p-2">
      <button
        type="button"
        aria-label="−"
        onClick={() => (haptic("tick"), onChange(Math.max(min, value - step)))}
        className="press grid size-11 place-items-center rounded-full bg-white [[data-scheme=dark]_&]:bg-g-card"
      >
        <Minus size={18} />
      </button>
      <span className="text-center">
        <span
          key={value}
          className="animate-rise block text-[26px] leading-none font-bold tracking-[-0.03em] tabular-nums"
        >
          {value.toLocaleString("en-US")}
        </span>
        <span className="text-[12px] text-g-muted">{unit}</span>
      </span>
      <button
        type="button"
        aria-label="+"
        onClick={() => (haptic("tick"), onChange(value + step))}
        className="press grid size-11 place-items-center rounded-full bg-white [[data-scheme=dark]_&]:bg-g-card"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 flex items-center gap-2 px-1 text-[14px] font-semibold text-g-ink-2">
        <span className="grid size-6 place-items-center rounded-full bg-g-blue text-[12px] font-bold text-white">
          {n}
        </span>
        {title}
      </p>
      {children}
    </section>
  );
}

function QuestEditor({
  team,
  dishes,
  onClose,
  onSave,
}: {
  team: Person[];
  dishes: string[];
  onClose: () => void;
  onSave: (q: LiveQuest) => void;
}) {
  const tr = useTr();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]["id"]>("dishes");
  const [dish, setDish] = useState<string | null>(null);
  const [target, setTarget] = useState(10);
  const [mode, setMode] = useState<LiveQuest["mode"]>("solo");
  const [ends, setEnds] = useState("End of shift");
  const [xp, setXp] = useState(150);
  const [bonus, setBonus] = useState(50_000);
  const g = GOALS.find((x) => x.id === goal)!;
  const icon =
    goal === "speed"
      ? "timer"
      : goal === "reviews"
        ? "star"
        : mode === "team"
          ? "users"
          : "target";
  const text = `${tr(g.label)}${dish ? `: ${dish}` : ""} · ${target} ${tr(g.unit)}`;
  // A quest is a rule over events: it counts the shift so far the moment it is published.
  const now = recount(
    goal,
    goal === "dishes" && dish ? dishes.indexOf(dish) : null,
    (i) => dishes[i] ?? "",
  );
  const lead = now.players[0];
  const ok = title.trim().length > 2;
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
          onClick={() =>
            onSave({
              id: `vq-${uid()}`,
              title: title.trim(),
              text,
              icon,
              mode,
              target,
              unit: g.unit,
              ends,
              left:
                ends === "End of shift"
                  ? "11 h"
                  : ends === "End of week"
                    ? "1 day"
                    : "16 days",
              xp,
              bonus: bonus || undefined,
              players: now.players,
              feed: now.feed,
            })
          }
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
        >
          {tr("Publish the quest")}
        </button>
      }
    >
      <div className="grid gap-6 px-5 pt-2 pb-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
        <div className="grid gap-6">
          <Step n={1} title={tr("Name")}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("Lemonade week")}
              className="h-14 w-full rounded-[20px] bg-g-fill px-4 text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint"
            />
          </Step>
          <Step n={2} title={tr("Goal")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GOALS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={goal === x.id}
                  onClick={() => (haptic("tick"), setGoal(x.id))}
                  className={`press flex flex-col items-center gap-1.5 rounded-[20px] px-2 py-3 text-[13px] font-semibold transition-colors ${goal === x.id ? "bg-g-blue text-white" : "bg-g-fill"}`}
                >
                  <x.icon size={20} strokeWidth={2} />
                  {tr(x.label)}
                </button>
              ))}
            </div>
            {goal === "dishes" && (
              <div className="no-scrollbar -mx-5 mt-2 flex gap-1.5 overflow-x-auto px-5">
                {[null, ...dishes].map((d) => (
                  <button
                    key={d ?? "any"}
                    type="button"
                    aria-pressed={dish === d}
                    onClick={() => (haptic("tick"), setDish(d))}
                    className={`press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${dish === d ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
                  >
                    {d ?? tr("Any dish")}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2">
              <Stepper
                value={target}
                onChange={setTarget}
                step={goal === "reviews" ? 1 : 5}
                min={1}
                unit={tr(g.unit)}
              />
            </div>
          </Step>
          <Step n={3} title={tr("Who plays")}>
            <div className="grid grid-cols-3 gap-2">
              {(["solo", "team", "race"] as const).map((m) => {
                const M = MODE[m];
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => (haptic("tick"), setMode(m))}
                    className={`press flex flex-col items-center gap-1.5 rounded-[20px] px-2 py-3 text-[13px] font-semibold transition-colors ${mode === m ? "bg-g-blue text-white" : "bg-g-fill"}`}
                  >
                    <M.icon size={20} strokeWidth={2} />
                    {tr(M.label)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 px-1 text-[12.5px] text-g-muted">
              {tr(MODE[mode].hint)}
            </p>
          </Step>
          <Step n={4} title={tr("Until")}>
            <div className="flex flex-wrap gap-1.5">
              {["End of shift", "End of week", "End of month"].map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={ends === e}
                  onClick={() => (haptic("tick"), setEnds(e))}
                  className={`press h-10 rounded-full px-4 text-[13.5px] font-semibold ${ends === e ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill"}`}
                >
                  {tr(e)}
                </button>
              ))}
            </div>
          </Step>
          <Step n={5} title={tr("Reward")}>
            <Stepper value={xp} onChange={setXp} step={50} min={0} unit="XP" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 50_000, 100_000, 200_000].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={bonus === v}
                  onClick={() => (haptic("tick"), setBonus(v))}
                  className={`press h-10 rounded-full px-4 text-[13.5px] font-semibold ${bonus === v ? "chip-blue" : "bg-g-fill"}`}
                >
                  {v ? `+${compactMoney(v)}` : tr("No bonus")}
                </button>
              ))}
            </div>
          </Step>
        </div>
        {/* Live preview: the card the team will see on their quest board. */}
        <div className="md:sticky md:top-2">
          <p className="mb-2 px-1 text-[13px] font-semibold text-g-muted">
            {tr("The team sees")}
          </p>
          <div className="relative overflow-hidden rounded-[26px] bg-[#0b1020] p-5 text-white">
            <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-g-blue/40 blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <span key={icon} className="animate-rise">
                <QuestMedal
                  state="active"
                  icon={ICONS[icon] ?? Trophy}
                  size={96}
                />
              </span>
              <p className="mt-2 text-[20px] leading-tight font-bold">
                {title.trim() || tr("Quest name")}
              </p>
              <p className="mt-1 text-[13px] text-white/65">{text}</p>
              <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-white/12 px-3 text-[12.5px] font-semibold">
                {tr(MODE[mode].label)} · {tr(ends)}
              </span>
              <p className="mt-3 text-[18px] font-bold text-[#ffd66b]">
                +{xp} XP{bonus ? ` · ${compactMoney(bonus)}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-[20px] bg-g-fill p-3.5">
            <p className="text-[13px] font-semibold text-g-blue">
              {tr("Counts from the start of the shift")}
            </p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {now.total
                ? tr("Already {n} today · {who} leads with {v}", {
                    n: now.total,
                    who: team.find((p) => p.id === lead?.id)?.name ?? "",
                    v: lead?.value ?? 0,
                  })
                : tr("Nothing yet today: it starts from the next order")}
            </p>
            <p className="mt-1 text-[12px] text-g-muted">
              {tr(
                "Progress is counted from orders, reviews and tickets, nobody enters it by hand.",
              )}
            </p>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function BadgeEditor({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (b: GameBadge) => void;
}) {
  const tr = useTr();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("star");
  const [tier, setTier] = useState<Tier>("gold");
  const [manual, setManual] = useState(false);
  const [metric, setMetric] =
    useState<Extract<BadgeRule, { kind: "count" }>["metric"]>("upsells");
  const [target, setTarget] = useState(20);
  const ok = name.trim().length > 2;
  const rule: BadgeRule = manual
    ? { kind: "manual" }
    : { kind: "count", metric, target, period: "ever" };
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("New badge")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() =>
            onSave({
              id: `b-${uid()}`,
              name: name.trim(),
              text: manual
                ? tr("Handed out by the admin")
                : `${target} ${tr(RULE_METRIC[metric])}`,
              tier,
              icon,
              rule,
              earned: [],
            })
          }
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
        >
          {tr("Create the badge")}
        </button>
      }
    >
      <div className="grid gap-6 px-5 pt-2 pb-10 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
        <div className="grid gap-6">
          <Step n={1} title={tr("Name")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("Night owl")}
              className="h-14 w-full rounded-[20px] bg-g-fill px-4 text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint"
            />
          </Step>
          <Step n={2} title={tr("Look")}>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tier === t}
                  onClick={() => (haptic("tick"), setTier(t))}
                  className={`press flex shrink-0 flex-col items-center rounded-[20px] px-2 pt-2 pb-2 transition-colors ${tier === t ? "bg-g-blue/12 ring-2 ring-g-blue" : "bg-g-fill"}`}
                >
                  <BadgeEmblem
                    tier={t}
                    icon={ICONS[icon] ?? Trophy}
                    earned
                    size={52}
                  />
                  <span className="mt-1 text-[11.5px] font-semibold">
                    {tr(TIER_LABEL[t])}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(ICONS).map(([k, I]) => (
                <button
                  key={k}
                  type="button"
                  aria-label={k}
                  aria-pressed={icon === k}
                  onClick={() => (haptic("tick"), setIcon(k))}
                  className={`press grid size-11 place-items-center rounded-full ${icon === k ? "bg-g-blue text-white" : "bg-g-fill"}`}
                >
                  <I size={19} strokeWidth={2} />
                </button>
              ))}
            </div>
          </Step>
          <Step n={3} title={tr("How it is earned")}>
            <div className="grid grid-cols-2 gap-2">
              {[false, true].map((m) => (
                <button
                  key={String(m)}
                  type="button"
                  aria-pressed={manual === m}
                  onClick={() => (haptic("tick"), setManual(m))}
                  className={`press flex flex-col items-center gap-1.5 rounded-[20px] px-2 py-3 text-[13px] font-semibold ${manual === m ? "bg-g-blue text-white" : "bg-g-fill"}`}
                >
                  {m ? <Hand size={20} /> : <Target size={20} />}
                  {tr(m ? "Admin hands it out" : "Counts itself")}
                </button>
              ))}
            </div>
            {!manual && (
              <div className="animate-rise mt-2 grid gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    Object.keys(RULE_METRIC) as (keyof typeof RULE_METRIC)[]
                  ).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={metric === k}
                      onClick={() => (haptic("tick"), setMetric(k))}
                      className={`press h-9 rounded-full px-3.5 text-[13px] font-semibold ${metric === k ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
                    >
                      {tr(RULE_METRIC[k])}
                    </button>
                  ))}
                </div>
                <Stepper
                  value={target}
                  onChange={setTarget}
                  step={5}
                  min={1}
                  unit={tr(RULE_METRIC[metric])}
                />
              </div>
            )}
          </Step>
        </div>
        <div className="md:sticky md:top-2">
          <p className="mb-2 px-1 text-[13px] font-semibold text-g-muted">
            {tr("Preview")}
          </p>
          <div className="flex flex-col items-center rounded-[26px] bg-g-fill p-5 text-center">
            <span key={tier + icon} className="animate-rise">
              <BadgeEmblem
                tier={tier}
                icon={ICONS[icon] ?? Trophy}
                earned
                size={120}
              />
            </span>
            <p className="mt-2 text-[19px] font-bold">
              {name.trim() || tr("Badge name")}
            </p>
            <p className="text-[13px] text-g-muted">
              {manual
                ? tr("Handed out by the admin")
                : `${target} ${tr(RULE_METRIC[metric])}`}
            </p>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
