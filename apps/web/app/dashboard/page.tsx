"use client";

import * as React from "react";
import { Copy, Link2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

type LinkItem = {
  id: string;
  slug: string;
  destinationUrl: string;
  redirectType: number;
  immutable: boolean;
  disabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  analytics: {
    totalClicks: number;
    lastClickedAt: string | null;
  } | null;
};

type ApiError = {
  message?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatus(link: LinkItem) {
  if (link.disabled) {
    return { label: "Disabled", tone: "text-destructive" };
  }
  if (link.expiresAt) {
    const expiresAt = new Date(link.expiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return { label: "Expired", tone: "text-destructive" };
    }
  }
  return { label: "Active", tone: "text-primary" };
}

function getStatusChipClasses(status: ReturnType<typeof getStatus>) {
  if (status.label === "Active") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [origin, setOrigin] = React.useState("");
  const [links, setLinks] = React.useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [destinationUrl, setDestinationUrl] = React.useState("");
  const [customSlug, setCustomSlug] = React.useState("");
  const [redirectType, setRedirectType] = React.useState("302");

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  React.useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setDestinationUrl(urlParam);
    }
  }, [searchParams]);

  async function loadLinks() {
    setIsLoading(true);
    setListError(null);
    try {
      const response = await fetch("/api/links");
      if (!response.ok) {
        throw new Error("Failed to load links.");
      }
      const data = (await response.json()) as { items: LinkItem[] };
      setLinks(data.items ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load links.";
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    void loadLinks();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const trimmedUrl = destinationUrl.trim();
    if (!trimmedUrl) {
      setFormError("Destination URL is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        destinationUrl: trimmedUrl,
        redirectType: Number(redirectType),
      };
      if (customSlug.trim()) {
        payload.slug = customSlug.trim();
      }

      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiError;
        setFormError(data.message ?? "Unable to create link.");
        return;
      }

      setCustomSlug("");
      setDestinationUrl("");
      setRedirectType("302");
      await loadLinks();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create link.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Unable to copy to clipboard.");
    }
  }

  const immutableWarning = redirectType === "301" || redirectType === "308" ? "This makes the link immutable." : null;
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, link) => sum + (link.analytics?.totalClicks ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Create and track links</h1>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Spin up short links, keep them tidy, and keep analytics private.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="relative min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              Create link
            </CardTitle>
            <CardDescription>Generate a short link in seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="destinationUrl">
                  Destination URL
                </label>
                <Input
                  id="destinationUrl"
                  value={destinationUrl}
                  onChange={(event) => setDestinationUrl(event.target.value)}
                  placeholder="https://example.com/launch"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="customSlug">
                  Custom slug <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="customSlug"
                  value={customSlug}
                  onChange={(event) => setCustomSlug(event.target.value)}
                  placeholder="team-launch"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="redirectType">
                  Redirect type
                </label>
                <Select value={redirectType} onValueChange={setRedirectType}>
                  <SelectTrigger id="redirectType">
                    <SelectValue placeholder="302" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="302">302 - Temporary</SelectItem>
                    <SelectItem value="301">301 - Permanent</SelectItem>
                    <SelectItem value="307">307 - Temporary</SelectItem>
                    <SelectItem value="308">308 - Permanent</SelectItem>
                  </SelectContent>
                </Select>
                {immutableWarning ? <p className="text-muted-foreground text-xs">{immutableWarning}</p> : null}
              </div>
              {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating..." : "Create link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="text-primary h-5 w-5" />
              Links
            </CardTitle>
            <CardDescription>Recent links from your default domain.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-foreground/15 bg-background flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm shadow-[4px_4px_0_hsl(var(--border))]">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Total links</p>
                  <p className="text-foreground text-lg font-semibold">{isLoading ? "--" : totalLinks}</p>
                </div>
              </div>
              <div className="border-foreground/15 bg-background flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm shadow-[4px_4px_0_hsl(var(--border))]">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Total clicks</p>
                  <p className="text-foreground text-lg font-semibold">{isLoading ? "--" : totalClicks}</p>
                </div>
              </div>
            </div>
            {listError ? <p className="text-destructive text-sm">{listError}</p> : null}
            {isLoading ? (
              <div className="border-border bg-muted/40 text-muted-foreground min-h-[240px] rounded-xl border p-4 text-sm">
                Loading links...
              </div>
            ) : links.length === 0 ? (
              <div className="border-border text-muted-foreground min-h-[240px] rounded-xl border border-dashed p-6 text-sm">
                No links yet. Create your first one to see it listed here.
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const status = getStatus(link);
                  const shortUrl = origin ? `${origin}/${link.slug}` : `/${link.slug}`;
                  const clicks = link.analytics ? link.analytics.totalClicks : 0;
                  const lastClickedAt = link.analytics ? formatDate(link.analytics.lastClickedAt) : "--";
                  return (
                    <Card key={link.id} className="border-border/80 bg-background/70 rounded-2xl border">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-mono text-sm" title={shortUrl}>
                              {shortUrl}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Copy short link"
                              onClick={() => handleCopy(shortUrl)}
                            >
                              <Copy />
                            </Button>
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] font-medium ${getStatusChipClasses(
                                status,
                              )}`}
                            >
                              {status.label}
                            </span>
                            <span className="border-border rounded-full border px-2 py-1">{link.redirectType}</span>
                            <span className="border-border rounded-full border px-2 py-1">Clicks {clicks}</span>
                            <span className="border-border rounded-full border px-2 py-1">Last {lastClickedAt}</span>
                            <span className="border-border rounded-full border px-2 py-1">
                              Created {formatDate(link.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-muted-foreground truncate text-xs" title={link.destinationUrl}>
                          {link.destinationUrl}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
