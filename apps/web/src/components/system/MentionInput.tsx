"use client";

import { Users } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { GROUP_HANDLES, insertMention, mentionAt, suggestPeople, type Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";

/*
 * A text field with @mentions, like Telegram: typing "@" opens a list of
 * people (avatar, name, @ID, role, on shift) and groups (@all, @bar,
 * @kitchen, @hall); it narrows as you type, a tap inserts the @ID. Shared by
 * the admin console (news) and, later, the waiter app (shift chat).
 */

export type MentionGroup = { handle: string; label: string; count: number };

export function MentionInput({
  value,
  onChange,
  people,
  groups = [],
  placeholder,
  roleLabel,
  rows = 4,
  up = false,
}: {
  value: string;
  onChange: (v: string) => void;
  people: Person[];
  groups?: MentionGroup[];
  placeholder?: string;
  /** How to show a person's role under their name. */
  roleLabel: (p: Person) => string;
  rows?: number;
  /** Open the list above the field (a field docked at the bottom of the screen). */
  up?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const at = mentionAt(value, caret);
  const q = at?.query.toLowerCase() ?? "";
  const groupHits = at ? groups.filter((g) => g.handle.startsWith(q)) : [];
  const peopleHits = at ? suggestPeople(at.query, people, 6) : [];

  const pick = (handle: string) => {
    if (!at) return;
    haptic("tick");
    const r = insertMention(value, at.start, caret, handle);
    onChange(r.text);
    setCaret(r.caret);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        el.setSelectionRange(r.caret, r.caret);
      }
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
        }}
        onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
        className="block w-full resize-none rounded-[20px] bg-g-fill px-4 py-3.5 text-[16px] leading-relaxed outline-none placeholder:text-g-faint"
      />
      {at && (groupHits.length > 0 || peopleHits.length > 0) && (
        <div role="listbox" className={`animate-pop absolute inset-x-0 z-20 max-h-[320px] ${up ? "bottom-full mb-2" : "top-full mt-2"} overflow-y-auto rounded-[22px] bg-g-card p-1.5 shadow-[0_18px_40px_-16px_rgba(11,11,15,0.35)] ring-1 ring-g-line`}>
          {groupHits.map((g) => (
            <Row key={g.handle} onPick={() => pick(g.handle)} avatar={<Users size={18} strokeWidth={2.2} />} tone="blue" title={g.label} sub={`@${g.handle} · ${g.count}`} />
          ))}
          {peopleHits.map((p) => (
            <Row key={p.id} onPick={() => pick(p.handle)} avatar={p.name.slice(0, 1)} title={p.name} sub={`@${p.handle} · ${roleLabel(p)}`} on={p.onShift} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ onPick, avatar, title, sub, on, tone }: { onPick: () => void; avatar: ReactNode; title: string; sub: string; on?: boolean; tone?: "blue" }) {
  return (
    <button
      role="option"
      aria-selected={false}
      // Keep the textarea focused: pick on pointer down.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className="press flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2 text-left hover:bg-g-fill"
    >
      <span className={`relative grid size-10 shrink-0 place-items-center rounded-full text-[16px] font-bold ${tone === "blue" ? "blue-grad" : "bg-g-fill text-g-ink"}`}>
        {avatar}
        {on && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-g-card bg-[#22c55e]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        <span className="block truncate text-[13px] text-g-muted">{sub}</span>
      </span>
    </button>
  );
}

/** A text with every @handle that resolves (a person or a group) shown in blue. */
export function MentionText({ text, known }: { text: string; known: (handle: string) => boolean }) {
  const parts = text.split(/(@[a-zA-Z][a-zA-Z0-9_]{1,23})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") && (known(p.slice(1).toLowerCase()) || p.slice(1).toLowerCase() in GROUP_HANDLES) ? (
          <span key={i} className="font-semibold text-g-blue">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
