"use client";

import { createStore } from "./store";

/*
 * The team's shared live data in the demo: who clocked in, tasks given with an
 * @assignee, and the shift chat. Admin console and waiter app read the same
 * stores, so a task set in one shows up in the other at once.
 */

export type Clock = { in?: string; out?: string };
export const clockStore = createStore<Record<string, Clock>>("yanyin:clock", {});

export type Task = { id: string; title: string; to: string; by: string; due?: string; at: string; done?: { at: string } };
export const tasksStore = createStore<Task[]>("yanyin:tasks", [
  { id: "t-seed-1", title: "@linh change the tablecloth on table 12 before the birthday", to: "staff-linh", by: "staff-huong", due: "17:00", at: "11:40" },
  { id: "t-seed-2", title: "@thao_bar count the syrups after the delivery", to: "staff-thao", by: "staff-huong", due: "15:00", at: "10:10", done: { at: "14:20" } },
]);

export type ChatMsg = { id: string; by: string; text: string; at: string };
export const chatStore = createStore<ChatMsg[]>("yanyin:chat", [
  { id: "c1", by: "staff-huong", text: "@all briefing at 17:00 by the bar", at: "11:31" },
  { id: "c2", by: "staff-thao", text: "@linh the lemonades for table 7 are on the pass", at: "12:38" },
  { id: "c3", by: "staff-minh", text: "Taking table 4 while @linh is on break", at: "12:41" },
]);

/** The demo clock: "HH:MM" now. */
export const nowHM = () => new Date().toTimeString().slice(0, 5);
