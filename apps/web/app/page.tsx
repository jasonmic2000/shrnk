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
    <div className="space-y-20 pb-24 pt-6">
      <section className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs font-medium shadow-[2px_2px_0_hsl(var(--border))]">
            Privacy-first analytics. No tracking baggage.
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Shrnk</h1>
            <p className="text-muted-foreground max-w-xl text-lg">
              Developer-first short links. Privacy-first analytics.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="border-border/80 bg-card hover:border-foreground/30 hover:bg-accent/20 focus-within:border-primary/70 focus-within:ring-primary/30 flex flex-col gap-3 rounded-2xl border-2 p-4 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 focus-within:ring-2 hover:shadow-md md:flex-row md:items-center"
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
          <p className="text-muted-foreground text-sm">No signup required in dev mode.</p>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <span className="text-muted-foreground text-sm">Manage links and analytics</span>
          </div>
        </div>
        <div className="border-border bg-card relative rounded-3xl border p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="bg-primary/15 text-primary cursor-default select-none rounded-full px-3 py-1 text-xs font-semibold shadow-[2px_2px_0_hsl(var(--border))]">
                API-first
              </span>
              <span className="border-border text-muted-foreground cursor-default select-none rounded-full border px-3 py-1 text-xs shadow-[2px_2px_0_hsl(var(--border))]">
                Cache friendly
              </span>
            </div>
            <div className="space-y-3 pr-28 md:pr-32">
              <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">Sample payload</p>
              <pre className="border-border bg-background text-foreground rounded-2xl border p-4 text-sm shadow-inner">
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
        </div>
      </section>

      <section className="space-y-8">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">Why Shrnk</p>
          <h2 className="mt-2 text-2xl font-semibold">Built for fast, predictable redirects.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/20 rounded-2xl border p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-base font-semibold">Developer-first APIs</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Clean inputs, clear errors, and a predictable contract.
            </p>
          </div>
          <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/20 rounded-2xl border p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-base font-semibold">Redis-cached redirects</h3>
            <p className="text-muted-foreground mt-2 text-sm">Hot-path caching keeps redirect latency tight.</p>
          </div>
          <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/20 rounded-2xl border p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-base font-semibold">Privacy-first analytics</h3>
            <p className="text-muted-foreground mt-2 text-sm">Aggregated counts only, no tracking baggage.</p>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold">Three steps, no fluff.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/20 flex items-start gap-4 rounded-2xl border p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <span className="border-foreground/15 bg-background text-foreground flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-[3px_3px_0_hsl(var(--border))]">
              1
            </span>
            <div>
              <h3 className="text-base font-semibold">Create a link</h3>
              <p className="text-muted-foreground mt-1 text-sm">POST `/api/links` with your destination URL.</p>
            </div>
          </div>
          <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/20 flex items-start gap-4 rounded-2xl border p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <span className="border-foreground/15 bg-background text-foreground flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-[3px_3px_0_hsl(var(--border))]">
              2
            </span>
            <div>
              <h3 className="text-base font-semibold">Share the short URL</h3>
              <p className="text-muted-foreground mt-1 text-sm">Distribute clean, stable links in seconds.</p>
            </div>
          </div>
          <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/20 flex items-start gap-4 rounded-2xl border p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <span className="border-foreground/15 bg-background text-foreground flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-[3px_3px_0_hsl(var(--border))]">
              3
            </span>
            <div>
              <h3 className="text-base font-semibold">View analytics privately</h3>
              <p className="text-muted-foreground mt-1 text-sm">Only aggregated counts, no personal data.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">Built for developers</p>
          <h2 className="mt-2 text-2xl font-semibold">Simple, honest primitives.</h2>
        </div>
        <div className="border-border bg-card hover:border-foreground/25 hover:bg-accent/10 rounded-3xl border p-6 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">Sample payload</p>
          <pre className="border-border bg-background text-foreground mt-4 rounded-2xl border p-4 text-sm shadow-inner">
            <code>
              {`POST /api/links
{
  "destinationUrl": "https://example.com",
  "redirectType": 302
}`}
            </code>
          </pre>
        </div>
      </section>

      <footer className="border-border text-muted-foreground flex flex-col items-start justify-between gap-3 border-t pt-6 text-sm sm:flex-row sm:items-center">
        <span>Shrnk © 2026</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span className="hover:text-foreground">Privacy</span>
          <span className="hover:text-foreground">GitHub</span>
        </div>
      </footer>
    </div>
  );
}
