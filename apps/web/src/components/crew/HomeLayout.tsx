"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { DragList } from "./DragList";
import { useTr } from "./prefs";

/** Blocks of the waiter's home screen below the header. Order and visibility are the waiter's choice. */
export type HomeBlock = "tips" | "streak" | "goal" | "quests" | "board" | "badges" | "week";

export const HOME_BLOCKS: Record<HomeBlock, { label: string; hint: string }> = {
  tips: { label: "Yan suggests", hint: "Tips, the quest of the week, peak hours" },
  streak: { label: "Streak", hint: "Days on time in a row" },
  goal: { label: "Team goal", hint: "This week's shared target" },
  quests: { label: "Your quests", hint: "Quests in progress" },
  board: { label: "Quest board", hint: "Quests you can take" },
  badges: { label: "Badges", hint: "What you have earned" },
  week: { label: "This week", hint: "Team leaderboard" },
};

export type HomeLayout = { id: HomeBlock; on: boolean }[];
const DEFAULT: HomeLayout = (Object.keys(HOME_BLOCKS) as HomeBlock[]).map((id) => ({ id, on: true }));
const KEY = "yanyin:crew-home";

/** The saved home layout (this phone). New blocks added later show up at the end, switched on. */
export function useHomeLayout(): [HomeLayout, (l: HomeLayout) => void] {
  const [layout, setLayout] = useState<HomeLayout>(DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = (JSON.parse(raw) as HomeLayout).filter((b) => b.id in HOME_BLOCKS);
      const missing = DEFAULT.filter((d) => !saved.some((s) => s.id === d.id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved layout once on mount
      setLayout([...saved, ...missing]);
    } catch {
      /* keep the default */
    }
  }, []);
  const save = (l: HomeLayout) => {
    setLayout(l);
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
    } catch {
      /* not saved, still applied */
    }
  };
  return [layout, save];
}

/** Customize the main screen: show or hide each block and move it up or down. */
export function CustomizePage({ layout, onChange, onClose }: { layout: HomeLayout; onChange: (l: HomeLayout) => void; onClose: () => void }) {
  const tr = useTr();
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Main screen")}
      footer={
        <button onClick={onClose} className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold">
          {tr("Done")}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-8">
        <p className="text-[15px] leading-snug text-g-muted">{tr("Choose what your home shows and drag blocks into your order. Tip: you can also hold any block on Home to edit it right there.")}</p>
        <DragList
          className="mt-5"
          items={layout}
          onReorder={onChange}
          render={(b, { dragging }) => (
            <div className={`flex items-center gap-3 border-b border-g-line py-3.5 transition-[opacity,background-color] ${b.on ? "" : "opacity-50"} ${dragging ? "rounded-[18px] bg-g-fill" : "bg-white"}`}>
              <button
                data-nodrag
                aria-label={tr(b.on ? "Hide “{name}”" : "Show “{name}”", { name: tr(HOME_BLOCKS[b.id].label) })}
                onClick={() => {
                  haptic("tick");
                  onChange(layout.map((x) => (x.id === b.id ? { ...x, on: !x.on } : x)));
                }}
                className={`press grid size-10 shrink-0 place-items-center rounded-full ${b.on ? "chip-blue" : "bg-g-fill text-g-faint"}`}
              >
                {b.on ? <Eye size={18} strokeWidth={2} /> : <EyeOff size={18} strokeWidth={2} />}
              </button>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{tr(HOME_BLOCKS[b.id].label)}</span>
                <span className="block truncate text-[13px] text-g-muted">{tr(HOME_BLOCKS[b.id].hint)}</span>
              </span>
              <span data-grip aria-label={tr("Drag to move")} className="grid size-10 shrink-0 cursor-grab touch-none place-items-center text-g-faint">
                <GripVertical size={20} strokeWidth={2} />
              </span>
            </div>
          )}
        />
        <button onClick={() => onChange(DEFAULT)} className="press mt-4 text-[15px] font-semibold text-g-blue">
          {tr("Reset to default")}
        </button>
      </div>
    </Sheet>
  );
}
