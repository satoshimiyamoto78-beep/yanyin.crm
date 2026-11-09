import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "yanyin.crm", template: "%s · yanyin" },
  description: "The restaurant operating system your staff actually want to open.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
