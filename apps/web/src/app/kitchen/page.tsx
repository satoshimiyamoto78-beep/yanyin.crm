import { getMenu } from "@yanyin/seed";
import type { Metadata } from "next";
import { StationApp } from "@/components/kitchen/StationApp";

export const metadata: Metadata = { title: "Kitchen & bar" };

export default function KitchenPage() {
  return <StationApp menu={getMenu("samarkand-danang")!} />;
}
