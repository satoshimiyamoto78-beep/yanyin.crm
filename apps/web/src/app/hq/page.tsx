import { getMenu } from "@yanyin/seed";
import type { Metadata } from "next";
import { HqApp } from "@/components/hq/HqApp";

export const metadata: Metadata = { title: "Admin console" };

export default function HqPage() {
  return <HqApp menu={getMenu("samarkand-danang")!} />;
}
