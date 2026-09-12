import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/Navigation/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerifyAbroad AI — Verify Before You Trust, Pay, or Proceed",
  description:
    "VerifyAbroad AI is an AI-powered study-abroad safety assistant for Pakistani students. Investigate universities, scholarships, consultants, offers and payment requests before you trust them or pay.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink-800 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
