import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "./globals.css";
import { AppFeel } from "@/components/AppFeel";

export const metadata: Metadata = {
  title: { default: "yanyin.crm", template: "%s · yanyin" },
  description: "The restaurant operating system your staff actually want to open.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // An app, not a page: no pinch or double-tap zoom.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppFeel />
        {children}
      </body>
    </html>
  );
}
