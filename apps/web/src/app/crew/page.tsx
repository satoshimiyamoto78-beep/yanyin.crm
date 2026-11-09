import { getMenu } from "@yanyin/seed";
import type { Metadata } from "next";
import { CrewApp } from "@/components/crew/CrewApp";
import { demoCrew } from "@/lib/demo-crew";
import { demoFloor } from "@/lib/demo-floor";

export const metadata: Metadata = { title: "Waiter" };

export default function CrewPage() {
  const menu = getMenu("samarkand-danang")!;
  return <CrewApp data={demoCrew(menu)} floor={demoFloor(menu)} menu={menu} />;
}
