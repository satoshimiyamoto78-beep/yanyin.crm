import type { Metadata } from "next";
import { JoinApp } from "@/components/auth/JoinApp";

export const metadata: Metadata = { title: "Join the team" };

export default function Page() {
  return <JoinApp />;
}
