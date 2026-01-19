"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/dashboard?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="grid items-center gap-12 pb-24 pt-8 md:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-8">
        <div className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          Privacy-first analytics. No tracking baggage.
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Shrnk</h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Developer-first short links. Privacy-first analytics.
          </p>
          <ul className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-3">
            <li className="border-border rounded-lg border px-3 py-2">Predictable redirects</li>
            <li className="border-border rounded-lg border px-3 py-2">Cache-first performance</li>
            <li className="border-border rounded-lg border px-3 py-2">No tracking baggage</li>
          </ul>
        </div>
        <form
          onSubmit={handleSubmit}
          className="border-border bg-card/80 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur md:flex-row md:items-center"
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a long URL..."
            className="h-12 flex-1 text-base"
            aria-label="Destination URL"
          />
          <Button type="submit" className="h-12 px-6 text-base">
            Shrink
          </Button>
        </form>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <span className="text-muted-foreground text-sm">Manage links and analytics</span>
        </div>
      </section>
      <section className="border-border from-background via-background to-accent/40 relative rounded-3xl border bg-gradient-to-br p-8 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="bg-primary/15 text-primary cursor-default select-none rounded-full px-3 py-1 text-xs font-semibold">
              API-first
            </span>
            <span className="border-border text-muted-foreground cursor-default select-none rounded-full border px-3 py-1 text-xs">
              Cache friendly
            </span>
          </div>
          <div className="space-y-3 pr-28 md:pr-32">
            <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">Sample payload</p>
            <pre className="border-border bg-background/60 text-foreground rounded-2xl border p-4 text-sm shadow-inner">
              <code>
                {`POST /api/links
{
  "destinationUrl": "https://example.com",
  "redirectType": 302
}`}
              </code>
            </pre>
          </div>
        </div>
        <div className="border-foreground/15 bg-background text-foreground absolute right-6 top-6 flex h-24 w-24 flex-col justify-between rounded-2xl border-2 p-3 text-[11px] shadow-[6px_6px_0_hsl(var(--border))]">
          <p className="text-muted-foreground uppercase tracking-wide">Latency</p>
          <p className="text-2xl font-semibold">12ms</p>
          <p className="text-muted-foreground">cache hit</p>
        </div>
      </section>
    </div>
  );
}
