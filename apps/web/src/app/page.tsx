import { allItems } from "@yanyin/domain";
import { getMenu, venueSlugs } from "@yanyin/seed";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { venueBrand } from "@/lib/visual";

export default function Home() {
  const venues = venueSlugs().map((slug) => getMenu(slug)!);
  return (
    <main className="min-h-dvh bg-g-bg text-g-ink">
      <div className="mx-auto max-w-[480px] px-5 pt-[max(32px,env(safe-area-inset-top))] pb-12">
        <p className="text-[13px] font-medium text-g-blue">Pilot · Da Nang</p>
        <h1 className="mt-2 text-[34px] leading-tight font-bold tracking-[-0.03em]">
          yanyin<span className="text-g-faint">.crm</span>
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-g-muted">The restaurant operating system your staff actually want to open.</p>

        <h2 className="mt-10 mb-2 text-[13px] font-medium text-g-muted">Guest menu</h2>
        <div>
          {venues.map((menu) => {
            const brand = venueBrand(menu.venue);
            const items = allItems(menu);
            return (
              <Link key={menu.venue.slug} href={`/m/${menu.venue.slug}?table=7`} className="press flex items-center gap-4 border-b border-g-line py-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-g-ink text-[18px] font-bold text-white">{brand.mark}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold">{menu.venue.name}</span>
                  <span className="block truncate text-[14px] text-g-muted">
                    {brand.cuisine.en} · {items.length} items
                  </span>
                </span>
                <ChevronRight size={20} className="text-g-faint" />
              </Link>
            );
          })}
        </div>

        <h2 className="mt-8 mb-2 text-[13px] font-medium text-g-muted">Staff app</h2>
        <Link href="/crew" className="press flex items-center gap-4 py-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-g-blue text-[18px] font-bold text-white">L</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Waiter&apos;s page</span>
            <span className="block truncate text-[14px] text-g-muted">Level, streak, team goal and quests</span>
          </span>
          <ChevronRight size={20} className="text-g-faint" />
        </Link>

        <p className="mt-12 text-center text-[13px] text-g-faint">Prototype on real pilot menus · not connected to a backend yet</p>
      </div>
    </main>
  );
}
