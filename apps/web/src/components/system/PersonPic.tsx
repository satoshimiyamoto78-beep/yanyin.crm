/* eslint-disable @next/next/no-img-element -- small local staff photos in a static export */
import type { Person } from "@yanyin/domain";

/**
 * The person's photo filling a round avatar, or their first letter when there
 * is none. The parent is the round frame (relative, sized); the photo sits on
 * top of it, so status dots placed by the parent stay visible.
 */
export function PersonPic({ p }: { p: Pick<Person, "name" | "avatar"> }) {
  return p.avatar ? (
    <img
      src={p.avatar}
      alt=""
      draggable={false}
      className="absolute inset-0 size-full rounded-[inherit] object-cover"
    />
  ) : (
    <>{p.name.slice(0, 1)}</>
  );
}
