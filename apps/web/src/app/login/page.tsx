import type { Metadata } from "next";
import { LoginApp } from "@/components/auth/LoginApp";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <LoginApp />;
}
