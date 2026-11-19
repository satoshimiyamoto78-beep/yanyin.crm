"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileText,
  Landmark,
  Lock,
  Plus,
  Repeat,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import {
  ACCOUNTS,
  balanceOf,
  budgetStore,
  closedStore,
  expensesStore,
  movesStore,
  type AccountId,
  type Expense,
} from "@/lib/demo-books";
import { dayTakings, MONTH_FULL, MONTHS, PNL } from "@/lib/demo-money";
import { Sheet } from "@/components/guest/ui";
import { WidgetCard } from "@/components/system/Widgets";
import { Switch } from "@/components/system/Kit";
import { compactMoney } from "@/components/crew/CrewApp";
import { useTr } from "@/components/crew/prefs";

/*
 * Finance in depth (docs/11, docs/07 §90): money accounts with movements,
 * transfers and bank reconciliation; expenses and supplier bills with status,
 * due dates and repeats; the month's budget plan against fact; a 30-day cash
 * forecast; closing the month for the accountant.
 */

const full = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₫`;
const ICON: Record<AccountId, typeof Landmark> = {
  bank: Landmark,
  safe: Wallet,
  drawer: Banknote,
  acquiring: ArrowLeftRight,
  momo: Smartphone,
};
const LINES = PNL.flatMap((g) => g.lines);
/** "14 Nov" with the month in the reader's language. */
const dm = (tr: (s: string) => string, d: string) =>
  d.replace(/([A-Z][a-z]{2})$/, (m) => tr(m));
const lineLabel = (id: string) => LINES.find((l) => l.id === id)?.label ?? id;

/* ------------------------------------------------------------ Accounts */

export function AccountsView({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const moves = movesStore.use();
  const [open, setOpen] = useState<AccountId | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [recon, setRecon] = useState(false);
  const total = ACCOUNTS.reduce((n, a) => n + balanceOf(a.id, moves), 0);
  const unmatched = moves.filter(
    (m) => m.account === "bank" && m.matched === false,
  );
  return (
    <>
      <section className="relative overflow-hidden rounded-[26px] bg-[#0b1020] p-5 text-white">
        <div className="pointer-events-none absolute -top-16 -right-10 size-52 rounded-full bg-g-blue/40 blur-3xl" />
        <p className="relative text-[13px] font-semibold text-white/60">
          {tr("All money now")}
        </p>
        <p className="live relative mt-1 text-[34px] leading-none font-bold tracking-[-0.03em] tabular-nums">
          {full(total)}
        </p>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => (haptic("light"), setTransfer(true))}
            className="press flex h-11 items-center justify-center gap-2 rounded-full bg-[#fff] text-[14px] font-semibold text-[#0b1020]"
          >
            <ArrowLeftRight size={16} /> {tr("Transfer")}
          </button>
          <button
            type="button"
            onClick={() => (haptic("light"), setRecon(true))}
            className="press flex h-11 items-center justify-center gap-2 rounded-full bg-white/12 text-[14px] font-semibold"
          >
            <CheckCircle2 size={16} /> {tr("Match with the bank")}
            {unmatched.length > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-g-orange px-1 text-[11px] font-bold">
                {unmatched.length}
              </span>
            )}
          </button>
        </div>
      </section>
      <div className="stagger grid gap-2 md:grid-cols-2">
        {ACCOUNTS.map((a) => {
          const I = ICON[a.id];
          const bal = balanceOf(a.id, moves);
          const last = moves.filter((m) => m.account === a.id)[0];
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => (haptic("light"), setOpen(a.id))}
              className="press flex items-center gap-3 rounded-[22px] bg-g-fill p-3.5 text-left"
            >
              <span className="blue-grad grid size-11 shrink-0 place-items-center rounded-full">
                <I size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {tr(a.name)}
                </span>
                <span className="block truncate text-[12.5px] text-g-muted">
                  {tr(a.kind)}
                  {last ? ` · ${tr(last.text)} ${dm(tr, last.at)}` : ""}
                </span>
              </span>
              <span className="live shrink-0 text-[15px] font-bold tabular-nums">
                {compactMoney(bal)}
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <Sheet
          open
          wide
          onClose={() => setOpen(null)}
          label={tr(ACCOUNTS.find((a) => a.id === open)!.name)}
        >
          <div className="grid gap-4 px-5 pt-2 pb-10">
            <div>
              <p className="text-[13px] font-semibold text-g-blue">
                {tr(ACCOUNTS.find((a) => a.id === open)!.kind)}
              </p>
              <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
                {tr(ACCOUNTS.find((a) => a.id === open)!.name)}
              </h2>
              <p className="live text-[24px] font-bold tabular-nums">
                {full(balanceOf(open, moves))}
              </p>
            </div>
            <div className="overflow-hidden rounded-[20px] bg-g-fill">
              {moves
                .filter((m) => m.account === open)
                .map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-3.5 py-2.5 ${i ? "border-t border-g-line" : ""}`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${m.amount > 0 ? "chip-green" : "chip-gray"}`}
                    >
                      {m.kind === "transfer" ? (
                        <ArrowLeftRight size={14} />
                      ) : m.amount > 0 ? (
                        <ArrowDownLeft size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">
                        {tr(m.text)}
                      </span>
                      <span className="block text-[12px] text-g-muted">
                        {dm(tr, m.at)}
                        {m.matched === false
                          ? ` · ${tr("not matched with the bank")}`
                          : m.matched
                            ? ` · ${tr("matched")}`
                            : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[14px] font-semibold tabular-nums ${m.amount > 0 ? "text-g-green" : ""}`}
                    >
                      {m.amount > 0 ? "+" : "−"}
                      {compactMoney(Math.abs(m.amount))}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </Sheet>
      )}
      {transfer && (
        <TransferSheet onClose={() => setTransfer(false)} notify={notify} />
      )}
      {recon && (
        <Sheet
          open
          onClose={() => setRecon(false)}
          label={tr("Match with the bank")}
        >
          <div className="grid gap-4 px-5 pt-2 pb-10">
            <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
              {tr("Match with the bank")}
            </h2>
            <p className="text-[14px] text-g-muted">
              {tr(
                "The bank statement comes in every morning. Lines we found in our books are matched by themselves; check the rest.",
              )}
            </p>
            {unmatched.length ? (
              <div className="grid gap-2">
                {unmatched.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-[20px] bg-g-fill p-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold">
                        {tr(m.text)}
                      </span>
                      <span className="block text-[12.5px] text-g-muted">
                        {dm(tr, m.at)} · {m.amount > 0 ? "+" : "−"}
                        {full(Math.abs(m.amount))}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => (
                        haptic("success"),
                        movesStore.set(
                          moves.map((x) =>
                            x.id === m.id ? { ...x, matched: true } : x,
                          ),
                        )
                      )}
                      className="press chip-green h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold"
                    >
                      {tr("It matches")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="chip-green rounded-[18px] p-3.5 text-[14.5px] font-semibold">
                {tr("Everything matches the bank statement.")}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

function TransferSheet({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const moves = movesStore.use();
  const [from, setFrom] = useState<AccountId>("drawer");
  const [to, setTo] = useState<AccountId>("safe");
  const [sum, setSum] = useState("");
  const n = Number(sum) || 0;
  const ok = n > 0 && from !== to && n <= balanceOf(from, moves);
  const pick = (v: AccountId, set: (a: AccountId) => void, label: string) => (
    <div>
      <p className="mb-1.5 px-1 text-[13px] font-semibold text-g-ink-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ACCOUNTS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={v === a.id}
            onClick={() => (haptic("tick"), set(a.id))}
            className={`press h-9 rounded-full px-3.5 text-[13px] font-semibold ${v === a.id ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
          >
            {tr(a.name)}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Transfer")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() => {
            movesStore.set([
              {
                id: `t${moves.length}`,
                at: "14 Nov",
                account: from,
                amount: -n,
                text: `To ${ACCOUNTS.find((a) => a.id === to)!.name}`,
                kind: "transfer",
              },
              {
                id: `t${moves.length}b`,
                at: "14 Nov",
                account: to,
                amount: n,
                text: `From ${ACCOUNTS.find((a) => a.id === from)!.name}`,
                kind: "transfer",
              },
              ...moves,
            ]);
            haptic("success");
            notify(tr("Moved {sum}", { sum: compactMoney(n) }));
            onClose();
          }}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Transfer")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
          {tr("Move money between accounts")}
        </h2>
        {pick(from, setFrom, tr("From"))}
        {pick(to, setTo, tr("To"))}
        <label className="block">
          <span className="px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Amount")}
          </span>
          <span className="mt-1.5 flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
            <input
              inputMode="numeric"
              value={n ? n.toLocaleString("en-US") : ""}
              onChange={(e) => setSum(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none tabular-nums"
            />
            <span className="text-g-muted">₫</span>
          </span>
        </label>
        <p className="px-1 text-[12.5px] text-g-muted">
          {tr("On {acc}: {sum}", {
            acc: tr(ACCOUNTS.find((a) => a.id === from)!.name),
            sum: full(balanceOf(from, moves)),
          })}
        </p>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ Expenses */

type EFilter = "all" | "due" | "overdue" | "repeat" | "paid";

export function ExpensesView({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const list = expensesStore.use();
  const moves = movesStore.use();
  const [f, setF] = useState<EFilter>("due");
  const [adding, setAdding] = useState(false);
  const due = list.filter((e) => e.status === "due");
  const overdue = due.filter((e) => e.dueIn < 0);
  const week = due.filter((e) => e.dueIn >= 0 && e.dueIn <= 7);
  const rows = list
    .filter((e) =>
      f === "all"
        ? true
        : f === "due"
          ? e.status === "due"
          : f === "overdue"
            ? e.status === "due" && e.dueIn < 0
            : f === "repeat"
              ? !!e.repeat
              : e.status === "paid",
    )
    .sort((a, b) => a.dueIn - b.dueIn);
  const pay = (e: Expense) => {
    expensesStore.set(
      list.map((x) => (x.id === e.id ? { ...x, status: "paid" } : x)),
    );
    movesStore.set([
      {
        id: `p${e.id}`,
        at: "14 Nov",
        account: "bank",
        amount: -e.amount,
        text: `${e.who}${e.doc ? ` · ${e.doc}` : ""}`,
        kind: "out",
        matched: false,
      },
      ...moves,
    ]);
    haptic("success");
    notify(
      tr("Paid {sum} to {who}", { sum: compactMoney(e.amount), who: e.who }),
    );
  };
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {[
          [tr("Overdue"), overdue, "text-[#e5484d]"],
          [tr("This week"), week, "text-g-orange"],
          [tr("All to pay"), due, ""],
        ].map(([k, l, c]) => (
          <div key={k as string} className="rounded-[20px] bg-g-fill p-3">
            <p className="text-[12px] font-semibold text-g-muted">
              {k as string}
            </p>
            <p
              className={`live mt-1 text-[16px] leading-none font-bold whitespace-nowrap tabular-nums ${c}`}
            >
              {compactMoney((l as Expense[]).reduce((n, e) => n + e.amount, 0))}
            </p>
            <p className="mt-1 text-[11.5px] text-g-muted">
              {tr("{n} bills", { n: (l as Expense[]).length })}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:flex md:items-center">
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:flex-1 md:px-0">
          {(
            [
              ["due", "To pay"],
              ["overdue", "Overdue"],
              ["repeat", "Every month"],
              ["paid", "Paid"],
              ["all", "All"],
            ] as const
          ).map(([id, l]) => (
            <button
              key={id}
              type="button"
              aria-pressed={f === id}
              onClick={() => (haptic("tick"), setF(id))}
              className={`press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${f === id ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill text-g-ink-2"}`}
            >
              {tr(l)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (haptic("light"), setAdding(true))}
          className="blue-grad press flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-semibold"
        >
          <Plus size={16} /> {tr("Expense")}
        </button>
      </div>
      <div className="stagger grid gap-2">
        {rows.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-[20px] bg-g-fill p-3"
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-full ${e.status === "paid" ? "chip-green" : e.dueIn < 0 ? "chip-red" : e.dueIn <= 3 ? "chip-orange" : "chip-gray"}`}
            >
              {e.status === "paid" ? (
                <Check size={17} />
              ) : e.dueIn < 0 ? (
                <AlertTriangle size={16} />
              ) : (
                <CircleDashed size={16} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[14.5px] font-semibold">
                  {tr(e.who)}
                </span>
                {e.repeat && (
                  <Repeat size={13} className="shrink-0 text-g-blue" />
                )}
              </span>
              <span className="block truncate text-[12.5px] text-g-muted">
                {tr(lineLabel(e.line))} ·{" "}
                {e.status === "paid"
                  ? tr("paid {d}", { d: dm(tr, e.due) })
                  : e.dueIn < 0
                    ? tr("{n} days overdue", { n: -e.dueIn })
                    : e.dueIn === 0
                      ? tr("due today")
                      : tr("due {d}", { d: dm(tr, e.due) })}
                {e.doc ? ` · ${e.doc}` : ""}
                {e.from ? ` · ${tr("from purchasing")}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="live block text-[14.5px] font-bold tabular-nums">
                {compactMoney(e.amount)}
              </span>
              {e.status === "due" && (
                <button
                  type="button"
                  onClick={() => pay(e)}
                  className="press mt-1 h-7 rounded-full bg-g-blue px-3 text-[12px] font-semibold text-white"
                >
                  {tr("Pay")}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="px-1 text-[12.5px] text-g-muted">
        {tr(
          "Supplier bills come here by themselves when a delivery is received in Stock. Paying one takes the money from the bank account and adds it to the P&L line.",
        )}
      </p>
      {adding && (
        <NewExpense
          onClose={() => setAdding(false)}
          onSave={(e) => {
            expensesStore.set([e, ...list]);
            haptic("success");
            notify(tr("Expense added"));
            setAdding(false);
          }}
        />
      )}
    </>
  );
}

function NewExpense({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (e: Expense) => void;
}) {
  const tr = useTr();
  const [who, setWho] = useState("");
  const [sum, setSum] = useState("");
  const [line, setLine] = useState("supplies");
  const [paid, setPaid] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [dueIn, setDueIn] = useState(7);
  const ok = who.trim().length > 1 && Number(sum) > 0;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("New expense")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() =>
            onSave({
              id: `x${who.length}${sum}`,
              date: "14 Nov",
              due: paid ? "14 Nov" : `${14 + dueIn} Nov`,
              dueIn: paid ? 0 : dueIn,
              who: who.trim(),
              line,
              amount: Number(sum),
              status: paid ? "paid" : "due",
              repeat: repeat ? "monthly" : undefined,
            })
          }
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <h2 className="text-[26px] leading-tight font-bold tracking-[-0.025em]">
          {tr("New expense")}
        </h2>
        <input
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder={tr("To whom")}
          className="h-14 w-full rounded-[20px] bg-g-fill px-4 text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-g-faint"
        />
        <span className="flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
          <input
            inputMode="numeric"
            value={Number(sum) ? Number(sum).toLocaleString("en-US") : ""}
            onChange={(e) => setSum(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none tabular-nums"
          />
          <span className="text-g-muted">₫</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {LINES.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={line === l.id}
              onClick={() => (haptic("tick"), setLine(l.id))}
              className={`press h-9 rounded-full px-3.5 text-[13px] font-semibold ${line === l.id ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
            >
              {tr(l.label)}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-[20px] bg-g-fill">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[14.5px] font-semibold">
              {tr("Already paid")}
            </span>
            <Switch on={paid} onChange={setPaid} label={tr("Already paid")} />
          </div>
          {!paid && (
            <div className="flex items-center justify-between border-t border-g-line px-4 py-2.5">
              <span className="text-[14.5px] font-semibold">
                {tr("Pay within")}
              </span>
              <span className="flex gap-1">
                {[3, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={dueIn === d}
                    onClick={() => (haptic("tick"), setDueIn(d))}
                    className={`press h-8 rounded-full px-2.5 text-[12.5px] font-semibold ${dueIn === d ? "chip-blue" : "bg-g-card"}`}
                  >
                    {tr("{n} d", { n: d })}
                  </button>
                ))}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-g-line px-4 py-3">
            <span className="text-[14.5px] font-semibold">
              {tr("Every month")}
            </span>
            <Switch
              on={repeat}
              onChange={setRepeat}
              label={tr("Every month")}
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ Budget */

export function BudgetView({
  m,
  factOf,
}: {
  m: number;
  factOf: (lineId: string) => number;
}) {
  const tr = useTr();
  const plan = budgetStore.use();
  const [edit, setEdit] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const share = m === 5 ? 14 / 30 : 1; // the current month is half gone: compare with the plan so far
  const totalPlan = LINES.reduce((n, l) => n + (plan[l.id] ?? 0) * share, 0);
  const totalFact = LINES.reduce((n, l) => n + factOf(l.id), 0);
  return (
    <>
      <div className="flex items-center gap-4 rounded-[24px] bg-g-fill p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-g-muted">
            {m === 5
              ? tr("Plan for 14 days against fact")
              : tr("Plan against fact")}
          </p>
          <p className="live mt-1 text-[22px] font-bold tabular-nums">
            {compactMoney(totalFact)}{" "}
            <span className="text-[15px] text-g-muted">
              / {compactMoney(totalPlan)}
            </span>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums ${totalFact > totalPlan ? "chip-red" : "chip-green"}`}
        >
          {Math.round((totalFact / Math.max(1, totalPlan)) * 100)}%
        </span>
      </div>
      <div className="stagger grid gap-2 md:grid-cols-2">
        {LINES.map((l) => {
          const p = (plan[l.id] ?? 0) * share;
          const fct = factOf(l.id);
          const pc = p ? fct / p : 0;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => (
                haptic("light"),
                setEdit(l.id),
                setVal(String(plan[l.id] ?? 0))
              )}
              className="press rounded-[20px] bg-g-fill px-3.5 py-3 text-left"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14.5px] font-semibold">
                  {tr(l.label)}
                </span>
                <span
                  className={`shrink-0 text-[13px] font-bold tabular-nums ${pc > 1.05 ? "text-[#e5484d]" : pc > 0.95 ? "text-g-orange" : "text-g-green"}`}
                >
                  {Math.round(pc * 100)}%
                </span>
              </span>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-g-card">
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ${pc > 1.05 ? "bg-[#e5484d]" : pc > 0.95 ? "bg-g-orange" : "bg-g-green"}`}
                  style={{ width: `${Math.min(100, pc * 100)}%` }}
                />
              </span>
              <span className="mt-1.5 flex justify-between text-[12px] text-g-muted tabular-nums">
                <span>{tr("fact {sum}", { sum: compactMoney(fct) })}</span>
                <span>{tr("plan {sum}", { sum: compactMoney(p) })}</span>
              </span>
            </button>
          );
        })}
      </div>
      {edit && (
        <Sheet
          open
          onClose={() => setEdit(null)}
          label={tr(lineLabel(edit))}
          footer={
            <button
              type="button"
              onClick={() => (
                budgetStore.set({ ...plan, [edit]: Number(val) || 0 }),
                haptic("success"),
                setEdit(null)
              )}
              className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
            >
              {tr("Save")}
            </button>
          }
        >
          <div className="grid gap-4 px-5 pt-2 pb-10">
            <h2 className="text-[26px] font-bold tracking-[-0.025em]">
              {tr(lineLabel(edit))}
            </h2>
            <p className="text-[14px] text-g-muted">
              {tr(
                "How much this line may take in a month. Yan warns when it goes over.",
              )}
            </p>
            <span className="flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
              <input
                autoFocus
                inputMode="numeric"
                value={Number(val) ? Number(val).toLocaleString("en-US") : ""}
                onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))}
                className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none tabular-nums"
              />
              <span className="text-g-muted">₫ / {tr("month")}</span>
            </span>
          </div>
        </Sheet>
      )}
    </>
  );
}

/* ------------------------------------------------------------ Forecast */

export function ForecastView() {
  const tr = useTr();
  const moves = movesStore.use();
  const expenses = expensesStore.use();
  const start = ACCOUNTS.reduce((n, a) => n + balanceOf(a.id, moves), 0);
  // Next 30 days: expected takings (same weekday last weeks, minus food and wages share) less the bills on their due dates.
  const days = Array.from({ length: 30 }, (_, i) => {
    const income = Math.round(dayTakings(7 - (i % 7)) * 0.42);
    const out =
      expenses
        .filter((e) => e.status === "due" && Math.max(0, e.dueIn) === i)
        .reduce((n, e) => n + e.amount, 0) +
      (i === 1 ? 68_400_000 : i === 16 ? 70_000_000 : 0) +
      (i === 6 ? 85_600_000 : 0);
    return { i, income, out };
  });
  let bal = start;
  const line = days.map((d) => (bal += d.income - d.out));
  const min = Math.min(...line);
  const max = Math.max(...line, start);
  const low = line.indexOf(min);
  return (
    <>
      <WidgetCard
        title={tr("Money for the next 30 days")}
        icon={<Landmark size={13} strokeWidth={2.4} />}
        aside={
          <span className="text-[12px] text-g-muted">{tr("expected")}</span>
        }
      >
        <div className="mt-4 flex h-36 items-end gap-[3px]">
          {line.map((v, i) => (
            <span
              key={i}
              className={`flex-1 rounded-[4px] ${i === low ? "bg-g-orange" : days[i]!.out ? "bg-g-blue" : "bg-g-blue/40"}`}
              style={{
                height: `${Math.max(6, ((v - min * 0.9) / (max - min * 0.9)) * 100)}%`,
                animation: `rise 0.45s ${i * 18}ms both cubic-bezier(0.22,1,0.36,1)`,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-g-faint">
          <span>{tr("today")}</span>
          <span>+30</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [tr("Now"), start],
            [tr("Lowest"), min],
            [tr("In 30 days"), line[29]!],
          ].map(([k, v], i) => (
            <div
              key={k as string}
              className="rounded-[16px] bg-white px-3 py-2 [[data-scheme=dark]_&]:bg-g-card"
            >
              <p className="text-[11.5px] text-g-muted">{k as string}</p>
              <p
                className={`live text-[15px] font-bold tabular-nums ${i === 1 && (v as number) < 100e6 ? "text-g-orange" : ""}`}
              >
                {compactMoney(v as number)}
              </p>
            </div>
          ))}
        </div>
      </WidgetCard>
      <div className="rounded-[22px] bg-g-fill p-4">
        <p className="text-[14px] leading-snug">
          <b>{tr("Yan")}:</b>{" "}
          {tr(
            "the lowest point is in {n} days ({sum}), right after the payroll. Pay the meat supplier after the 20th to keep a cushion.",
            { n: low, sum: compactMoney(min) },
          )}
        </p>
      </div>
      <p className="px-1 text-[12.5px] text-g-muted">
        {tr(
          "Built from the takings of the same weekdays, the bills to pay with their due dates, payroll on the 15th and 30th, and VAT on the 20th.",
        )}
      </p>
    </>
  );
}

/* ------------------------------------------------------------ Closing */

export function CloseView({
  m,
  notify,
}: {
  m: number;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const closed = closedStore.use();
  const expenses = expensesStore.use();
  const moves = movesStore.use();
  const month = MONTHS[m]!;
  const isClosed = closed.includes(month);
  const checks: [string, boolean, string][] = [
    [
      tr("Every shift is closed with a cash count"),
      m < 5,
      tr("2 shifts open in November"),
    ],
    [
      tr("Bank statement matched"),
      m < 5 || !moves.some((x) => x.matched === false),
      tr("{n} lines to check", {
        n: moves.filter((x) => x.matched === false).length,
      }),
    ],
    [tr("Supplier bills entered"), true, ""],
    [tr("Payroll paid"), m < 5, tr("16–30 not paid yet")],
    [
      tr("Bills overdue"),
      !expenses.some((e) => e.status === "due" && e.dueIn < 0) || m < 5,
      tr("{n} overdue", {
        n: expenses.filter((e) => e.status === "due" && e.dueIn < 0).length,
      }),
    ],
    [tr("VAT counted from e-invoices"), true, ""],
  ];
  const ready = checks.every((c) => c[1]);
  return (
    <>
      <div
        className={`flex items-center gap-3 rounded-[24px] p-4 ${isClosed ? "chip-green" : "bg-g-fill"}`}
      >
        {isClosed ? (
          <Lock size={22} />
        ) : (
          <FileText size={22} className="text-g-blue" />
        )}
        <div className="min-w-0">
          <p className="text-[16px] font-bold">
            {tr(MONTH_FULL[month])} · {isClosed ? tr("closed") : tr("open")}
          </p>
          <p className="text-[13px] opacity-80">
            {isClosed
              ? tr("No more changes. The accountant has the package.")
              : tr(
                  "Check the list, then close: the numbers are locked and the package goes to the accountant.",
                )}
          </p>
        </div>
      </div>
      {!isClosed && (
        <div className="overflow-hidden rounded-[22px] bg-g-fill">
          {checks.map(([t, ok, why], i) => (
            <div
              key={t}
              className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-g-line" : ""}`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full ${ok ? "chip-green" : "chip-orange"}`}
              >
                {ok ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <AlertTriangle size={13} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">{t}</span>
                {!ok && (
                  <span className="block text-[12.5px] text-g-orange">
                    {why}
                  </span>
                )}
              </span>
              {!ok && (
                <ChevronRight size={16} className="shrink-0 text-g-faint" />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => (
            haptic("success"),
            notify(
              tr("Package saved: P&L, VAT, payroll, bills (Excel and PDF)"),
            )
          )}
          className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[14.5px] font-semibold"
        >
          <FileText size={16} className="text-g-blue" />{" "}
          {tr("Accountant package")}
        </button>
        {isClosed ? (
          <button
            type="button"
            onClick={() => (
              haptic("light"),
              closedStore.set(closed.filter((x) => x !== month)),
              notify(tr("Month reopened"))
            )}
            className="press h-12 rounded-full bg-g-fill text-[14.5px] font-semibold"
          >
            {tr("Reopen")}
          </button>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={() => (
              haptic("success"),
              closedStore.set([...closed, month]),
              notify(tr("{m} closed", { m: tr(MONTH_FULL[month]) }))
            )}
            className="blue-grad press flex h-12 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold"
          >
            <Lock size={16} /> {tr("Close the month")}
          </button>
        )}
      </div>
    </>
  );
}
