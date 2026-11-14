"use client";

import { Check, LogOut } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { ArtTile } from "@/components/system/Art";
import { useTr } from "@/components/crew/prefs";
import { LOGIN_HREF, SEATS } from "./demo-account";

/**
 * "I am now…": one person, several roles (an admin who also waits tables).
 * Lists the person's roles with the current one ticked; a tap opens that app.
 * Sign out returns to the login door.
 */
export function RoleSwitch({ current, onClose }: { current: string; onClose: () => void }) {
  const tr = useTr();
  return (
    <Sheet open onClose={onClose} label={tr("Switch role")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("I am now…")}</h2>
        <p className="mt-0.5 text-[14px] text-g-muted">{tr("Your roles in your venues. The app opens for the role you pick.")}</p>
        <div className="mt-6 grid gap-2">
          {SEATS.map((s) => {
            const on = s.id === current;
            return (
              <a
                key={s.id}
                href={on ? undefined : s.href}
                onClick={(e) => {
                  if (on) {
                    e.preventDefault();
                    onClose();
                  } else haptic("success");
                }}
                aria-current={on ? "true" : undefined}
                className={`press flex items-center gap-3 rounded-[22px] p-2.5 pr-4 transition-colors ${on ? "bg-g-blue-soft" : "bg-g-fill"}`}
              >
                <ArtTile name={s.art} size={48} bare />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[16px] font-semibold ${on ? "text-g-blue" : ""}`}>{tr(s.role)}</span>
                  <span className="block truncate text-[13px] text-g-muted">
                    {s.venue} · {tr(s.sub)}
                  </span>
                </span>
                {on && (
                  <span className="blue-grad grid size-7 shrink-0 place-items-center rounded-full">
                    <Check size={15} strokeWidth={3} />
                  </span>
                )}
              </a>
            );
          })}
        </div>
        <a href={LOGIN_HREF} onClick={() => haptic("light")} className="press mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold text-[#e5484d]">
          <LogOut size={17} strokeWidth={2.2} /> {tr("Sign out")}
        </a>
      </div>
    </Sheet>
  );
}
