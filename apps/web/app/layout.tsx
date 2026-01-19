import "./globals.css";
import Script from "next/script";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { SiteHeader } from "../components/site-header";
import { Toaster } from "../components/ui/toaster";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Shrnk",
  description: "Developer-first short links with privacy-first analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} bg-background text-foreground min-h-screen font-sans antialiased`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function () {
  var storageKey = "theme";
  var className = "dark";
  var root = document.documentElement;
  var stored = localStorage.getItem(storageKey);
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var shouldDark = stored === "dark" || (!stored && prefersDark);
  if (shouldDark) {
    root.classList.add(className);
  } else {
    root.classList.remove(className);
  }
})();`}
        </Script>
        <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--accent)/0.35),_transparent_45%)]">
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
