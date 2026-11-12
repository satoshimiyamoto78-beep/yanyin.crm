import { describe, expect, it } from "vitest";
import {
  can, checklistProgress, checklistXp, claimTicket, handleProblem, insertMention, mentionAt, mentionedHandles, normalizeHandle,
  proofProblem, recipientsOf, releaseTicket, stationFor, suggestHandle, suggestPeople, templatesFor, toggleItem,
  type ChecklistRun, type ChecklistTemplate, type Person,
} from "../src";

const people: Person[] = [
  { id: "u1", handle: "linh", name: "Linh Tran", roles: ["waiter"], stations: ["hall"], onShift: true },
  { id: "u2", handle: "minh_bar", name: "Minh Nguyen", roles: ["bartender"], stations: ["bar"], onShift: true },
  { id: "u3", handle: "an", name: "An Le", roles: ["bartender"], stations: ["bar"], onShift: true },
  { id: "u4", handle: "tuan", name: "Tuan Pham", roles: ["bartender"], stations: ["bar"], onShift: false },
  { id: "u5", handle: "chef_dima", name: "Дмитрий", roles: ["cook"], stations: ["hot"], onShift: true },
  { id: "u6", handle: "boss", name: "Owner", roles: ["owner"], stations: [], onShift: true },
];

describe("handles", () => {
  it("normalizes anything typed", () => {
    expect(normalizeHandle("@Linh.Tran")).toBe("linh_tran");
    expect(normalizeHandle("Нгуен Минь")).toBe("nguen_min");
    expect(normalizeHandle("Trần Văn Đức")).toBe("tran_van_duc");
    expect(normalizeHandle("  --a--b  ")).toBe("a_b");
  });
  it("explains why a handle can't be used", () => {
    expect(handleProblem("li")).toBe("short");
    expect(handleProblem("1linh")).toBe("start");
    expect(handleProblem("linh_")).toBe("chars");
    expect(handleProblem("bar")).toBe("reserved");
    expect(handleProblem("linh", ["LINH"])).toBe("taken");
    expect(handleProblem("linh_tran", ["linh"])).toBeNull();
    expect(handleProblem("a".repeat(25))).toBe("long");
  });
  it("suggests a free handle from a name", () => {
    expect(suggestHandle("Linh", ["linh", "linh2"])).toBe("linh3");
    expect(suggestHandle("Ян")).toBe("yan_1");
    expect(suggestHandle("Al")).toBe("al_team");
    expect(handleProblem(suggestHandle("Bar"))).toBeNull();
  });
});

describe("mentions", () => {
  it("finds handles once each, not inside emails", () => {
    expect(mentionedHandles("@linh and @Minh_bar, again @linh; mail a@b.com")).toEqual(["linh", "minh_bar"]);
  });
  it("reaches only the mentioned people, groups expand to who is on shift", () => {
    expect(recipientsOf("@linh please check table 4", people)).toEqual(["u1"]);
    expect(recipientsOf("@bar two lemonades", people).sort()).toEqual(["u2", "u3"]);
    expect(recipientsOf("@kitchen @nobody", people)).toEqual(["u5"]);
    expect(recipientsOf("@all briefing at 17:00", people)).toHaveLength(5);
    expect(recipientsOf("no mentions", people)).toEqual([]);
  });
  it("tracks the fragment under the caret and inserts the choice", () => {
    expect(mentionAt("Hi @li", 6)).toEqual({ start: 3, query: "li" });
    expect(mentionAt("Hi @", 4)).toEqual({ start: 3, query: "" });
    expect(mentionAt("mail a@b", 8)).toBeNull();
    const r = insertMention("Hi @li tomorrow", 3, 6, "linh");
    expect(r).toEqual({ text: "Hi @linh  tomorrow", caret: 9 });
  });
  it("ranks suggestions: handle prefix, then name, then contains", () => {
    expect(suggestPeople("mi", people).map((p) => p.id)).toEqual(["u2"]);
    expect(suggestPeople("le", people).map((p) => p.id)).toEqual(["u3"]);
    expect(suggestPeople("дми", people).map((p) => p.id)).toEqual(["u5"]);
    expect(suggestPeople("", people, 3)).toHaveLength(3);
  });
});

describe("roles and stations", () => {
  it("checks permissions by any role", () => {
    expect(can(people[0]!, "payments.take")).toBe(true);
    expect(can(people[0]!, "orders.void")).toBe(false);
    expect(can(people[1]!, "kds.bump")).toBe(true);
    expect(can({ roles: ["manager", "bartender"] }, "news.post")).toBe(true);
    expect(can({ roles: ["admin"] }, "billing.manage")).toBe(false);
  });
  it("routes items to stations", () => {
    expect(stationFor("alcohol")).toBe("bar");
    expect(stationFor("main")).toBe("hot");
    expect(stationFor("hookah")).toBe("hookah");
  });
  it("lets one of several bartenders take a ticket", () => {
    const t = { id: "t1", station: "bar" as const, table: 4, state: "new" as const };
    const a = claimTicket(t, "u2");
    expect(a).toMatchObject({ claimedBy: "u2", state: "making" });
    expect(claimTicket(a, "u3")).toBe(a);
    expect(releaseTicket(a, "u3")).toBe(a);
    expect(releaseTicket(a, "u2")).toMatchObject({ claimedBy: undefined, state: "new" });
  });
});

describe("checklists", () => {
  const tpl: ChecklistTemplate = {
    id: "waiter-open", title: "Opening", role: "waiter", xp: 100,
    items: [
      { id: "a", title: "Tables wiped", phase: "open", due: "10:30" },
      { id: "b", title: "Fridge temperature", phase: "open", proof: { kind: "number", unit: "°C", min: 1, max: 5 } },
      { id: "c", title: "Station photo", phase: "close", proof: { kind: "photo" } },
      { id: "d", title: "Music on", phase: "during", required: false },
    ],
  };
  const run0: ChecklistRun = { templateId: "waiter-open", personId: "u1", date: "2026-11-12", marks: {} };
  it("applies by role or station", () => {
    expect(templatesFor([tpl, { ...tpl, id: "bar", role: undefined, station: "bar" }], people[1]!).map((t) => t.id)).toEqual(["bar"]);
  });
  it("needs proof, flags out-of-range values, tracks late items", () => {
    expect(proofProblem(tpl.items[1]!, "")).toBe("missing");
    expect(toggleItem(run0, tpl.items[1]!, "u1", "10:00")).toBe(run0);
    let run = toggleItem(run0, tpl.items[1]!, "u1", "10:00", "7");
    let p = checklistProgress(tpl, run, "11:00");
    expect(p.done).toBe(1);
    expect(p.flagged.map((i) => i.id)).toEqual(["b"]);
    expect(p.late.map((i) => i.id)).toEqual(["a"]);
    expect(p.next?.id).toBe("a");
    run = toggleItem(run, tpl.items[0]!, "u1", "10:40");
    run = toggleItem(run, tpl.items[2]!, "u1", "22:00", "photo.jpg");
    p = checklistProgress(tpl, run, "22:00");
    expect(p.complete).toBe(true);
    expect(p.percent).toBe(75);
    expect(checklistXp(tpl, run)).toBe(75);
    expect(toggleItem(run, tpl.items[0]!, "u1", "22:01").marks.a).toBeUndefined();
  });
});
