import { getMenu } from "@yanyin/seed";
import type { Metadata } from "next";
import { CrewBoard } from "@/components/crew/CrewBoard";
import { demoCrew } from "@/lib/demo-crew";

export const metadata: Metadata = { title: "Quest board" };

export default function CrewPage() {
  const menu = getMenu("samarkand-danang")!;
  return <CrewBoard data={demoCrew(menu)} />;
}
