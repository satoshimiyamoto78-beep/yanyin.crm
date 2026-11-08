"use client";

import { formatMoney, formatMoneyShort, levelFromXp, questPercent } from "@yanyin/domain";
import { Flame, Gift, Swords, Trophy, Users, Zap } from "lucide-react";
import { useState } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function CrewBoard({ data }: { data: CrewData }) {
  const [xp, setXp] = useState(data.staff.xp);
  const [quests, setQuests] = useState(data.quests);
  const [celebrate, setCelebrate] = useState<CrewQuest | null>(null);
  const level = levelFromXp(xp);
  const pct = Math.round((level.xpIntoLevel / level.xpForNext) * 100);
  const money = (n: number) => formatMoney(n, data.currency, "en");

  const take = (id: string) => setQuests((qs) => qs.map((q) => (q.id === id ? { ...q, state: "active" } : q)));
  const claim = (q: CrewQuest) => {
    setXp((v) => v + q.reward.xp);
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    setCelebrate(q);
    setTimeout(() => setCelebrate(null), 2600);
  };

  const active = quests.filter((q) => q.state !== "available");
  const available = quests.filter((q) => q.state === "available");

  return (
    <main className="min-h-dvh bg-crew-bg px-4 pt-[max(20px,env(safe-area-inset-top))] pb-12 text-crew-ink">
      <div className="mx-auto grid max-w-lg grid-cols-1 gap-3 [&>*]:min-w-0">
        {/* Profile + level ring */}
        <section className="flex items-center gap-4 rounded-[28px] bg-crew-surface p-4">
          <Ring percent={pct} size={84}>
            <span className="text-4xl">{data.staff.avatar}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] tracking-widest text-crew-muted uppercase">
              {data.staff.role} · {data.staff.venue}
            </p>
            <p className="font-display text-2xl font-bold">{data.staff.name}</p>
            <p className="mt-1 text-sm">
              <span className="font-semibold text-crew-lime">
                Lv {level.level} · {level.title}
              </span>
              <span className="text-crew-muted">
                {" "}
                · {level.xpIntoLevel}/{level.xpForNext} XP
              </span>
            </p>
          </div>
        </section>

        {/* Today stats */}
        <section className="grid grid-cols-3 gap-3">
          <Stat label="Sales today" value={formatMoneyShort(data.today.sales, data.currency)} accent />
          <Stat label="Tips" value={formatMoneyShort(data.today.tips, data.currency)} />
          <Stat label="Avg check" value={formatMoneyShort(data.today.avgCheck, data.currency)} />
        </section>

        {/* Streak */}
        <section className="rounded-[28px] bg-crew-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <p className="flex items-center gap-2 font-semibold">
              <Flame className="size-5 text-crew-orange" /> {data.staff.streakDays}-day streak
            </p>
            <p className="text-xs text-crew-muted">On time every shift</p>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {data.staff.week.map((done, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span
                  className={`grid size-9 place-items-center rounded-full text-sm ${
                    done ? "bg-crew-lime text-black" : "border border-dashed border-white/15 text-crew-muted"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                <span className="text-[11px] text-crew-muted">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Team boss fight */}
        <section className="rounded-[28px] bg-gradient-to-br from-crew-violet/35 to-crew-surface p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Swords className="size-5 text-crew-violet" /> {data.boss.title}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full bg-crew-violet" style={{ width: `${questPercent(data.boss.progress, data.boss.target)}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-crew-muted">
            <span>
              {money(data.boss.progress)} / {formatMoneyShort(data.boss.target, data.currency)}
            </span>
            <span>
              {data.boss.reward} · {data.boss.endsIn}
            </span>
          </div>
        </section>

        {/* Active quests */}
        <section className="rounded-[28px] bg-crew-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Zap className="size-5 text-crew-lime" /> Active quests
          </h2>
          <ul className="grid gap-2">
            {active.map((q) => (
              <QuestRow key={q.id} q={q} money={money} action={q.state === "done" ? <ClaimButton onClick={() => claim(q)} /> : null} />
            ))}
            {!active.length && <p className="text-sm text-crew-muted">Take a quest below to start.</p>}
          </ul>
        </section>

        {/* Quest board */}
        {available.length > 0 && (
          <section className="rounded-[28px] bg-crew-surface p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Gift className="size-5 text-crew-orange" /> Quest board
            </h2>
            <ul className="grid gap-2">
              {available.map((q) => (
                <QuestRow
                  key={q.id}
                  q={q}
                  money={money}
                  action={
                    <button onClick={() => take(q.id)} className="rounded-full bg-crew-lime px-4 py-2 text-sm font-bold text-black">
                      Take
                    </button>
                  }
                />
              ))}
            </ul>
          </section>
        )}

        {/* Badges + leaderboard */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[28px] bg-crew-surface p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="size-4 text-crew-lime" /> Badges
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {data.badges.map((b) => (
                <div
                  key={b.id}
                  title={b.name}
                  className={`grid aspect-square place-items-center rounded-2xl text-2xl ${b.earned ? "bg-crew-surface-2" : "bg-crew-surface-2 opacity-30 grayscale"}`}
                >
                  {b.emoji}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] bg-crew-surface p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-crew-lime" /> This week
            </h2>
            <ol className="grid gap-2 text-sm">
              {data.leaderboard.map((p, i) => (
                <li key={p.name} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${p.me ? "bg-crew-lime/15" : ""}`}>
                  <span className="w-3 shrink-0 font-mono text-crew-muted">{i + 1}</span>
                  <span className={`flex-1 truncate ${p.me ? "font-bold text-crew-lime" : ""}`}>{p.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-crew-muted">{p.me ? xp : p.xp}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <p className="text-center font-mono text-[11px] text-crew-muted">
          Leaderboards can be turned off by the venue · progress counts automatically from orders
        </p>
      </div>

      {celebrate && (
        <div role="status" className="animate-fade fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="animate-pop text-center">
            <p className="text-7xl">{celebrate.icon}</p>
            <p className="mt-4 font-display text-3xl font-bold text-crew-lime">Quest complete!</p>
            <p className="mt-2 text-lg">{celebrate.title}</p>
            <p className="mt-1 font-mono text-crew-muted">
              +{celebrate.reward.xp} XP{celebrate.reward.perk ? ` · ${celebrate.reward.perk}` : ""}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function QuestRow({ q, money, action }: { q: CrewQuest; money: (n: number) => string; action: React.ReactNode }) {
  const pct = questPercent(q.progress, q.target);
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-crew-surface-2 p-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-black/30 text-2xl">{q.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{q.title}</p>
          {q.state !== "available" && (
            <span className="font-mono text-xs text-crew-muted">
              {q.progress}/{q.target}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-crew-muted">
          {q.description} · {q.endsAt}
        </p>
        {q.state !== "available" ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div className={`h-full rounded-full ${q.state === "done" ? "bg-crew-lime" : "bg-crew-lime/70"}`} style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <p className="mt-1 text-xs font-semibold text-crew-lime">
            +{q.reward.xp} XP{q.reward.bonus ? ` · ${money(q.reward.bonus)}` : ""}
            {q.mode === "race" ? " · first to finish wins" : ""}
          </p>
        )}
      </div>
      {action}
    </li>
  );
}

function ClaimButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="animate-pop rounded-full bg-crew-lime px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_-4px_var(--crew-lime)]">
      Claim
    </button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[22px] bg-crew-surface p-3">
      <p className="text-[11px] text-crew-muted">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${accent ? "text-crew-lime" : ""}`}>{value}</p>
    </div>
  );
}

function Ring({ percent, size, children }: { percent: number; size: number; children: React.ReactNode }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--crew-lime)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      {children}
    </div>
  );
}
