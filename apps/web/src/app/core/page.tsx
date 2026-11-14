import type { Metadata } from "next";
import { CoreApp } from "@/components/core/CoreApp";

export const metadata: Metadata = { title: "Platform" };

export default function Page() {
  return <CoreApp />;
}
