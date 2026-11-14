import type { ArtName } from "@/components/system/Art";

/*
 * The demo account and where each of its roles leads. On the backend this is
 * the person's memberships (organisation, venue, roles); the login screen
 * lists them and opens the right app for the role picked.
 */

export type Seat = { id: string; venue: string; city: string; role: string; sub: string; href: string; art: ArtName };

export const DEMO_PHONE = "905 123 456";
export const DEMO_CODE = "123456";

export const SEATS: Seat[] = [
  { id: "hq", venue: "Samarkand", city: "Da Nang", role: "Admin", sub: "Overview, menu, team, reports", href: "hq.html", art: "sales" },
  { id: "crew", venue: "Samarkand", city: "Da Nang", role: "Waiter", sub: "Tables, orders, tips, quests", href: "crew.html", art: "tables" },
  { id: "kitchen", venue: "Samarkand", city: "Da Nang", role: "Station screen", sub: "Kitchen or bar tablet", href: "kitchen.html", art: "kitchen" },
];

/** Where the app sends someone back to choose another role or account. */
export const LOGIN_HREF = "login.html";
export const START_HREF = "start.html";
