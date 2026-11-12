/*
 * People in a venue: roles, stations, permissions and the @ID every person
 * is known by inside yanyin (ADR-014, ADR-015).
 *
 * A person has a stable internal id (never shown, never changes) and a public
 * handle they choose, like @linh or @bar_minh. Mentions, notifications, news,
 * reviews, tips and payroll are all stored against the internal id; the
 * handle is only how people find and address each other.
 */

/** What a person does. One person can hold several roles (a manager who also tends the bar). */
export type StaffRole = "owner" | "admin" | "manager" | "waiter" | "bartender" | "cook" | "host" | "runner" | "accountant";

/** Where work is done. Several people can share one station; tickets go to the station, not to a person. */
export type Station = "hall" | "bar" | "hot" | "cold" | "grill" | "pastry" | "hookah";

export type Person = {
  id: string;
  handle: string;
  name: string;
  roles: StaffRole[];
  stations: Station[];
  onShift?: boolean;
  avatar?: string;
};

export type Permission =
  | "orders.take"
  | "orders.void"
  | "orders.discount"
  | "payments.take"
  | "kds.bump"
  | "menu.edit"
  | "stoplist.edit"
  | "staff.manage"
  | "news.post"
  | "reports.view"
  | "checklists.manage"
  | "billing.manage";

const ALL: Permission[] = ["orders.take", "orders.void", "orders.discount", "payments.take", "kds.bump", "menu.edit", "stoplist.edit", "staff.manage", "news.post", "reports.view", "checklists.manage", "billing.manage"];

/** Default permissions by role; a venue can tighten or widen them later. */
export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== "billing.manage"),
  manager: ["orders.take", "orders.void", "orders.discount", "payments.take", "kds.bump", "menu.edit", "stoplist.edit", "staff.manage", "news.post", "reports.view", "checklists.manage"],
  waiter: ["orders.take", "payments.take"],
  bartender: ["orders.take", "payments.take", "kds.bump", "stoplist.edit"],
  cook: ["kds.bump", "stoplist.edit"],
  host: ["orders.take"],
  runner: ["kds.bump"],
  accountant: ["reports.view"],
};

/** True when any of the person's roles grants the permission. The server checks this again on every mutation. */
export function can(person: Pick<Person, "roles">, permission: Permission): boolean {
  return person.roles.some((r) => ROLE_PERMISSIONS[r].includes(permission));
}

/* ------------------------------------------------------------------ Handles */

/** Group handles: a mention of these reaches everyone on that station (or everyone on shift). Nobody can take them. */
export const GROUP_HANDLES: Record<string, Station | "all"> = {
  all: "all",
  team: "all",
  bar: "bar",
  kitchen: "hot",
  hall: "hall",
  hookah: "hookah",
};
const RESERVED = new Set([...Object.keys(GROUP_HANDLES), "yan", "yanyin", "admin", "owner", "support", "here", "everyone"]);

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", đ: "d",
};

/** Turns anything typed into handle form: no @, lower case, latin letters, digits and underscores. */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s.\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type HandleProblem = "short" | "long" | "start" | "chars" | "reserved" | "taken";

/** Why a handle can't be used, or null when it can. `taken` holds handles already in use (any case). */
export function handleProblem(handle: string, taken: Iterable<string> = []): HandleProblem | null {
  if (handle.length < 3) return "short";
  if (handle.length > 24) return "long";
  if (!/^[a-z]/.test(handle)) return "start";
  if (!/^[a-z][a-z0-9_]*$/.test(handle) || handle.endsWith("_")) return "chars";
  if (RESERVED.has(handle)) return "reserved";
  for (const t of taken) if (t.toLowerCase() === handle) return "taken";
  return null;
}

/** A free handle from a person's name: "Нгуен Минь" → "nguen_min", then "nguen_min2" if taken. */
export function suggestHandle(name: string, taken: Iterable<string> = []): string {
  const used = new Set([...taken].map((t) => t.toLowerCase()));
  let base = normalizeHandle(name).slice(0, 20) || "staff";
  if (!/^[a-z]/.test(base)) base = `s_${base}`;
  if (base.length < 3) base = `${base}_team`.slice(0, 20);
  if (RESERVED.has(base)) base = `${base}_1`;
  let out = base;
  for (let n = 2; used.has(out); n++) out = `${base}${n}`;
  return out;
}

/* ------------------------------------------------------------------ Mentions */

const MENTION = /(^|[^\w@])@([a-z][a-z0-9_]{1,23})/gi;

/** Every @handle in a text, lower-cased, in order, without repeats. */
export function mentionedHandles(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION)) {
    const h = m[2]!.toLowerCase();
    if (!out.includes(h)) out.push(h);
  }
  return out;
}

/**
 * Who a message reaches: each @person, plus everyone on a mentioned station
 * (@bar, @kitchen, @hall) or everyone on shift (@all). Unknown handles are
 * ignored. Returns internal ids, never handles.
 */
export function recipientsOf(text: string, people: Person[]): string[] {
  const ids = new Set<string>();
  for (const h of mentionedHandles(text)) {
    const group = GROUP_HANDLES[h];
    if (group === "all") people.filter((p) => p.onShift !== false).forEach((p) => ids.add(p.id));
    else if (group) people.filter((p) => p.stations.includes(group) && p.onShift !== false).forEach((p) => ids.add(p.id));
    else {
      const p = people.find((x) => x.handle.toLowerCase() === h);
      if (p) ids.add(p.id);
    }
  }
  return [...ids];
}

/** The @fragment the caret is in, for showing suggestions: "Hi @li|" → { start: 3, query: "li" }. */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|[\s(])@([\p{L}0-9_]{0,24})$/u.exec(before);
  if (!m) return null;
  return { start: caret - m[2]!.length - 1, query: m[2]! };
}

/** People for the suggestion list: handle starts with the query first, then name starts, then contains. */
export function suggestPeople(query: string, people: Person[], limit = 6): Person[] {
  const q = normalizeHandle(query);
  const qn = query.trim().toLowerCase();
  const score = (p: Person) => {
    const h = p.handle.toLowerCase();
    const n = p.name.toLowerCase();
    if (!q && !qn) return 3;
    if (q && h.startsWith(q)) return 0;
    if (qn && n.split(/\s+/).some((w) => w.startsWith(qn))) return 1;
    if ((q && h.includes(q)) || (qn && n.includes(qn))) return 2;
    return 9;
  };
  return people
    .map((p) => [p, score(p)] as const)
    .filter(([, s]) => s < 9)
    .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
    .slice(0, limit)
    .map(([p]) => p);
}

/** Replaces the @fragment at `start..caret` with the chosen handle and a space; returns the new text and caret. */
export function insertMention(text: string, start: number, caret: number, handle: string): { text: string; caret: number } {
  const ins = `@${handle} `;
  return { text: text.slice(0, start) + ins + text.slice(caret), caret: start + ins.length };
}

/* ------------------------------------------------------------------ Stations and tickets */

/** Which station makes an item by default, from its category role. A venue merges or renames stations to fit its kitchen. */
export function stationFor(categoryRole: string): Station {
  switch (categoryRole) {
    case "drink":
    case "hot_drink":
    case "alcohol":
      return "bar";
    case "hookah":
      return "hookah";
    case "salad":
    case "starter":
    case "snack":
      return "cold";
    case "grill":
      return "grill";
    case "dessert":
    case "pastry":
      return "pastry";
    default:
      return "hot";
  }
}

/**
 * A ticket line on a station screen. The whole station works it together:
 * nobody claims a ticket, anyone on the station moves it new → making → ready.
 */
export type StationTicket = { id: string; station: Station; table: number; state: "new" | "making" | "ready" };

/** The next state of a ticket when anyone on the station taps it; ready stays ready. */
export function advanceTicket(t: StationTicket): StationTicket {
  return { ...t, state: t.state === "new" ? "making" : "ready" };
}
