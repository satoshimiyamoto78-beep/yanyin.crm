/*
 * Shift checklists (ADR-016). A venue keeps templates per role or station
 * ("Waiter: opening", "Bar: closing"); every shift each person gets a run of
 * the templates that apply to them. Ticking an item records who and when, an
 * item can ask for proof (a photo, a number such as the fridge temperature),
 * and a finished list pays XP into the game layer.
 */
import type { Station, StaffRole } from "./people";

export type ChecklistPhase = "open" | "during" | "close";

export type ChecklistItem = {
  id: string;
  title: string;
  phase: ChecklistPhase;
  /** Proof the item asks for: a photo, or a number with a unit and an allowed range. */
  proof?: { kind: "photo" } | { kind: "number"; unit: string; min?: number; max?: number };
  /** "HH:MM": after this time an open item counts as late. */
  due?: string;
  /** Required items must be done to close the list. */
  required?: boolean;
};

export type ChecklistTemplate = {
  id: string;
  title: string;
  /** Who gets it: everyone with this role, or everyone on this station. */
  role?: StaffRole;
  station?: Station;
  /** XP for finishing every required item on time. */
  xp: number;
  items: ChecklistItem[];
};

export type ItemMark = { at: string; by: string; value?: string };

export type ChecklistRun = { templateId: string; personId: string; date: string; marks: Record<string, ItemMark> };

/** Minutes since midnight for "HH:MM". */
const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Templates that apply to a person, by any of their roles or stations. */
export function templatesFor(templates: ChecklistTemplate[], person: { roles: StaffRole[]; stations: Station[] }): ChecklistTemplate[] {
  return templates.filter((t) => (t.role && person.roles.includes(t.role)) || (t.station && person.stations.includes(t.station)));
}

/** Why a value can't close an item, or null when it can. */
export function proofProblem(item: ChecklistItem, value?: string): "missing" | "range" | null {
  if (!item.proof) return null;
  if (!value) return "missing";
  if (item.proof.kind === "number") {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n)) return "missing";
    if ((item.proof.min !== undefined && n < item.proof.min) || (item.proof.max !== undefined && n > item.proof.max)) return "range";
  }
  return null;
}

/** Ticks or unticks an item. Ticking an item that needs proof without a valid value does nothing. */
export function toggleItem(run: ChecklistRun, item: ChecklistItem, by: string, at: string, value?: string): ChecklistRun {
  const marks = { ...run.marks };
  if (marks[item.id]) delete marks[item.id];
  else {
    const p = proofProblem(item, value);
    if (p === "missing") return run;
    marks[item.id] = { at, by, value };
  }
  return { ...run, marks };
}

export type ChecklistProgress = {
  done: number;
  total: number;
  percent: number;
  /** The first open item, phase by phase. */
  next?: ChecklistItem;
  /** Open items past their due time. */
  late: ChecklistItem[];
  /** Every required item is done. */
  complete: boolean;
  /** Items done with a value out of range (e.g. fridge too warm): the manager sees these. */
  flagged: ChecklistItem[];
};

const PHASES: ChecklistPhase[] = ["open", "during", "close"];

/** Where a run stands at time `now` ("HH:MM"). */
export function checklistProgress(t: ChecklistTemplate, run: ChecklistRun, now: string): ChecklistProgress {
  const ordered = PHASES.flatMap((ph) => t.items.filter((i) => i.phase === ph));
  const done = ordered.filter((i) => run.marks[i.id]).length;
  const open = ordered.filter((i) => !run.marks[i.id]);
  return {
    done,
    total: ordered.length,
    percent: ordered.length ? Math.round((done / ordered.length) * 100) : 0,
    next: open[0],
    late: open.filter((i) => i.due && mins(i.due) < mins(now)),
    complete: ordered.filter((i) => i.required !== false).every((i) => run.marks[i.id]),
    flagged: ordered.filter((i) => run.marks[i.id] && proofProblem(i, run.marks[i.id]!.value) === "range"),
  };
}

/** XP a finished run earns: the template's XP, less a quarter for every item that was done late. */
export function checklistXp(t: ChecklistTemplate, run: ChecklistRun): number {
  const late = t.items.filter((i) => i.due && run.marks[i.id] && mins(run.marks[i.id]!.at) > mins(i.due)).length;
  return Math.max(0, Math.round(t.xp * (1 - 0.25 * late)));
}
