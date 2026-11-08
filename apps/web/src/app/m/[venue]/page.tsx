import { getMenu, venueSlugs } from "@yanyin/seed";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestApp } from "@/components/guest/GuestApp";

/** Pilot venues are prerendered; the guest menu is static and loads instantly from a QR code. */
export function generateStaticParams() {
  return venueSlugs().map((venue) => ({ venue }));
}

export async function generateMetadata(props: PageProps<"/m/[venue]">): Promise<Metadata> {
  const { venue } = await props.params;
  const menu = getMenu(venue);
  return menu ? { title: `${menu.venue.name} menu` } : {};
}

export default async function VenueMenuPage(props: PageProps<"/m/[venue]">) {
  const { venue } = await props.params;
  const menu = getMenu(venue);
  if (!menu) notFound();
  return <GuestApp menu={menu} />;
}
