import type { Metadata } from "next";
import { StartApp } from "@/components/onboarding/StartApp";

export const metadata: Metadata = { title: "New venue" };

export default function Page() {
  return <StartApp />;
}
