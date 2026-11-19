"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { DragList } from "@/components/crew/DragList";

/*
 * A screen made of blocks the person arranges, like the waiter's home: show or
 * hide each block and drag them into their own order. Saved on this device.
 * Shared by the admin overview and the founder's overview.
 */
export type Block<T extends string> = { id: T; on: boolean };

export function useBlockLayout<T extends string>(
  key: string,
  ids: T[],
): [Block<T>[], (l: Block<T>[]) => void, Block<T>[]] {
  const fallback = ids.map((id) => ({ id, on: true }));
  const [layout, setLayout] = useState<Block<T>[]>(fallback);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = (JSON.parse(raw) as Block<T>[]).filter((b) =>
        ids.includes(b.id),
      );
      const merged = [...saved];
      fallback.forEach((d, i) => {
        if (!saved.some((s) => s.id === d.id))
          merged.splice(Math.min(i, merged.length), 0, d);
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved layout once on mount
      setLayout(merged);
    } catch {
      /* keep the default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once
  }, [key]);
  const save = (l: Block<T>[]) => {
    setLayout(l);
    try {
      localStorage.setItem(key, JSON.stringify(l));
    } catch {
      /* applied, not saved */
    }
  };
  return [layout, save, fallback];
}

export function BlockLayoutPage<T extends string>({
  title,
  hint,
  labels,
  layout,
  fallback,
  onChange,
  onClose,
  done,
  reset,
  showLabel,
  hideLabel,
}: {
  title: string;
  hint: string;
  labels: Record<T, { label: string; hint: string }>;
  layout: Block<T>[];
  fallback: Block<T>[];
  onChange: (l: Block<T>[]) => void;
  onClose: () => void;
  done: string;
  reset: string;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={title}
      footer={
        <button
          onClick={onClose}
          className="blue-grad press mx-auto block h-13 w-full max-w-[520px] rounded-full text-[15px] font-semibold"
        >
          {done}
        </button>
      }
    >
      <div className="mx-auto max-w-[520px] px-5 pt-1 pb-8">
        <p className="text-[14.5px] leading-snug text-g-muted">{hint}</p>
        <DragList
          className="mt-4"
          items={layout}
          onReorder={(l) => {
            haptic("tick");
            onChange(l);
          }}
          render={(b, { dragging }) => (
            <div
              className={`flex items-center gap-3 border-b border-g-line py-3 transition-[opacity,background-color] ${b.on ? "" : "opacity-50"} ${dragging ? "rounded-[18px] bg-g-fill" : "bg-g-bg"}`}
            >
              <button
                data-nodrag
                aria-label={b.on ? hideLabel : showLabel}
                onClick={() => {
                  haptic("tick");
                  onChange(
                    layout.map((x) =>
                      x.id === b.id ? { ...x, on: !x.on } : x,
                    ),
                  );
                }}
                className={`press grid size-9 shrink-0 place-items-center rounded-full transition-colors ${b.on ? "chip-blue" : "bg-g-fill text-g-faint"}`}
              >
                {b.on ? (
                  <Eye size={17} strokeWidth={2} />
                ) : (
                  <EyeOff size={17} strokeWidth={2} />
                )}
              </button>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">
                  {labels[b.id].label}
                </span>
                <span className="block truncate text-[12.5px] text-g-muted">
                  {labels[b.id].hint}
                </span>
              </span>
              <span
                data-grip
                className="grid size-9 shrink-0 cursor-grab touch-none place-items-center text-g-faint"
              >
                <GripVertical size={19} strokeWidth={2} />
              </span>
            </div>
          )}
        />
        <button
          onClick={() => (haptic("light"), onChange(fallback))}
          className="press mt-4 text-[14.5px] font-semibold text-g-blue"
        >
          {reset}
        </button>
      </div>
    </Sheet>
  );
}
