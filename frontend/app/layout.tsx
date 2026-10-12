import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SkillHubProvider } from "@/lib/store";
import { LanguageProvider } from "@/lib/language-context";
import { AppShell } from "@/components/AppShell";
import { PwaRegistrar } from "@/components/PwaRegistrar";

export const metadata: Metadata = {
  title: "Sutra — Student Success Engine",
  description: "SUTRA: Student Success and Intervention Orchestration Engine — No Alert Without Action.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SUTRA",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#F4F5F7] text-neutral-900 selection:bg-neutral-900 selection:text-white">
        <SkillHubProvider>
          <LanguageProvider>
            <AppShell>{children}</AppShell>
            <PwaRegistrar />
          </LanguageProvider>
        </SkillHubProvider>
      </body>
    </html>
  );
}
