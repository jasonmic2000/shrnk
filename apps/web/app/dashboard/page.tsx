"use client";

import * as React from "react";
import { Copy, Link2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";

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
            {listError ? <p className="text-destructive text-sm">{listError}</p> : null}
            {isLoading ? (
              <div className="border-border bg-muted/40 text-muted-foreground rounded-xl border p-4 text-sm">
                Loading links...
              </div>
            ) : links.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                No links yet. Create your first one on the left.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Short link</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Redirect</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Last clicked</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const status = getStatus(link);
                    const shortUrl = origin ? `${origin}/${link.slug}` : `/${link.slug}`;
                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{shortUrl}</span>
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
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[220px] truncate text-xs">
                          {link.destinationUrl}
                        </TableCell>
                        <TableCell className={`text-xs font-medium ${status.tone}`}>{status.label}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{link.redirectType}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {link.analytics ? link.analytics.totalClicks : 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {link.analytics ? formatDate(link.analytics.lastClickedAt) : "--"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(link.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
