import { allItems } from "@yanyin/domain";
import { getMenu, venueSlugs } from "@yanyin/seed";
import { ArrowUpRight, Gamepad2, QrCode } from "lucide-react";
import Link from "next/link";
import { venueBrand } from "@/lib/visual";

export default function Home() {
  const venues = venueSlugs().map((slug) => getMenu(slug)!);
  return (
    <main className="min-h-dvh bg-crew-bg px-5 pt-[max(28px,env(safe-area-inset-top))] pb-12 text-crew-ink">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs tracking-widest text-crew-lime uppercase">Pilot · Da Nang</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
          yanyin<span className="text-crew-muted">.crm</span>
        </h1>
        <p className="mt-3 text-crew-muted">The restaurant operating system your staff actually want to open.</p>

        <h2 className="mt-10 mb-3 flex items-center gap-2 text-sm font-semibold text-crew-muted">
          <QrCode className="size-4" /> Guest menu (yanyin.menu)
        </h2>
        <div className="grid gap-3">
          {venues.map((menu) => {
            const brand = venueBrand(menu.venue);
            const items = allItems(menu);
            const suggested = items.filter((i) => i.status === "suggested").length;
            return (
              <Link
                key={menu.venue.slug}
                href={`/m/${menu.venue.slug}?table=7`}
                className="group relative overflow-hidden rounded-[28px] p-5 transition active:scale-[0.99]"
                style={{ background: `linear-gradient(150deg, ${brand.accent}, ${brand.accent}99)` }}
              >
                <ArrowUpRight className="absolute top-5 right-5 size-5 text-white/80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                <p className="font-display text-2xl font-bold text-white">{menu.venue.name}</p>
                                <p className="mt-1 text-sm text-white/85">{brand.headline.en}</p>
                <p className="mt-4 font-mono text-xs text-white/75">
                  {menu.categories.length} categories · {items.length} items · {suggested} drafts
                </p>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold text-crew-muted">
          <Gamepad2 className="size-4" /> Staff app (yanyin.crew)
        </h2>
        <Link
          href="/crew"
          className="group relative block overflow-hidden rounded-[28px] border border-white/5 bg-crew-surface p-5 transition active:scale-[0.99]"
        >
          <ArrowUpRight className="absolute top-5 right-5 size-5 text-crew-muted transition group-hover:text-crew-lime" />
          <p className="font-display text-2xl font-bold">Quest board</p>
          <p className="mt-1 text-sm text-crew-muted">Levels, streaks, quests and rewards for the waiter on shift.</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-2/3 rounded-full bg-crew-lime" />
          </div>
        </Link>

        <p className="mt-10 text-center font-mono text-[11px] text-crew-muted">
          Prototype on real pilot menus · not connected to a backend yet
        </p>
      </div>
    </main>
  );
}
