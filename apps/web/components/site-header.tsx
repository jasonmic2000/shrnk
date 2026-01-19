import Link from "next/link";

import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-6 pt-8">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="bg-primary/15 text-primary rounded-md px-2 py-1 text-sm font-semibold">Shrnk</span>
        <span className="text-muted-foreground hidden text-sm sm:inline">Developer-first links</span>
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
