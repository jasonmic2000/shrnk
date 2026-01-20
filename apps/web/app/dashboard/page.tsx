"use client";

import * as React from "react";
import { Copy, Link2, Loader2, Sparkles, Trash2 } from "lucide-react";
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
  errorCode?: string;
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

function formatShortDate(value: string | null) {
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
  }).format(date);
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

function isValidHostname(hostname: string) {
  if (hostname === "localhost") {
    return true;
  }

  if (hostname.includes(":")) {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return true;
  }

  return hostname.includes(".");
}

function validateDestinationUrl(input: string) {
  if (!input) {
    return "Destination URL is required.";
  }

  let url: URL;
  try {
    url = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input) ? new URL(input) : new URL(`https://${input}`);
  } catch {
    return "Please enter a valid URL (e.g., example.com).";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http and https URLs are allowed.";
  }

  if (!isValidHostname(url.hostname.toLowerCase())) {
    return "Please enter a valid URL (e.g., example.com).";
  }

  return null;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [origin, setOrigin] = React.useState("");
  const [links, setLinks] = React.useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{ destinationUrl?: string; customSlug?: string }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [expiryModeById, setExpiryModeById] = React.useState<Record<string, "none" | "set">>({});
  const [expiryValueById, setExpiryValueById] = React.useState<Record<string, string>>({});
  const [destinationUrl, setDestinationUrl] = React.useState("");
  const [customSlug, setCustomSlug] = React.useState("");
  const [redirectType, setRedirectType] = React.useState("302");
  const [highlightedLinkId, setHighlightedLinkId] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (!highlightedLinkId) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setHighlightedLinkId(null);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [highlightedLinkId]);

  function mapApiError(error: ApiError) {
    const code = error.errorCode;
    if (!code) {
      return {};
    }
    const message = error.message?.toLowerCase() ?? "";
    if (code === "slug_taken") {
      return { customSlug: "That slug is already taken. Try another." };
    }
    if (["EMPTY", "INVALID_URL", "INVALID_SCHEME", "TOO_LONG", "INVALID_URL_HOST"].includes(code)) {
      if (message.includes("slug")) {
        return { customSlug: error.message ?? "Slug format is invalid." };
      }
      return { destinationUrl: error.message ?? "Enter a valid destination URL." };
    }
    if (["RESERVED", "INVALID_CHARS", "EDGE_DASH", "CONSECUTIVE_DASH", "TOO_LONG"].includes(code)) {
      return { customSlug: error.message ?? "Slug format is invalid." };
    }
    return {};
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const trimmedUrl = destinationUrl.trim();
    const destinationError = validateDestinationUrl(trimmedUrl);
    if (destinationError) {
      setFieldErrors({ destinationUrl: destinationError });
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
        const mapped = mapApiError(data);
        const { destinationUrl: destinationError, customSlug: slugError } = mapped;
        if (destinationError || slugError) {
          setFieldErrors({ destinationUrl: destinationError, customSlug: slugError });
          return;
        }
        setFormError(data.message ?? "Unable to create link.");
        return;
      }

      const created = (await response.json()) as { id: string; shortUrl: string };
      setCustomSlug("");
      setDestinationUrl("");
      setRedirectType("302");
      setHighlightedLinkId(created.id);

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(created.shortUrl);
          toast.success("Copied short link");
        } catch {
          toast.error("Unable to copy short link.");
        }
      }

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

  async function handleDelete(link: LinkItem) {
    if (!window.confirm(`Delete ${link.slug}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(link.id);
    try {
      const response = await fetch(`/api/links/${link.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to delete link.");
      }
      setLinks((prev) => prev.filter((item) => item.id !== link.id));
      if (highlightedLinkId === link.id) {
        setHighlightedLinkId(null);
      }
      toast.success("Link deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete link.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleDisabled(link: LinkItem) {
    setUpdatingId(link.id);
    try {
      const response = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !link.disabled }),
      });
      if (!response.ok) {
        throw new Error("Unable to update link.");
      }
      const updated = (await response.json()) as LinkItem;
      setLinks((prev) => prev.map((item) => (item.id === link.id ? { ...item, ...updated } : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update link.";
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleUpdateExpiry(link: LinkItem, value: string | null) {
    setUpdatingId(link.id);
    try {
      const response = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: value }),
      });
      if (!response.ok) {
        throw new Error("Unable to update expiry.");
      }
      const updated = (await response.json()) as LinkItem;
      setLinks((prev) => prev.map((item) => (item.id === link.id ? { ...item, ...updated } : item)));
      setExpiryModeById((prev) => ({ ...prev, [link.id]: updated.expiresAt ? "set" : "none" }));
      setExpiryValueById((prev) => ({
        ...prev,
        [link.id]: updated.expiresAt ? toLocalDateTimeInput(updated.expiresAt) : "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update expiry.";
      toast.error(message);
    } finally {
      setUpdatingId(null);
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
                {fieldErrors.destinationUrl ? (
                  <p className="text-destructive text-xs">{fieldErrors.destinationUrl}</p>
                ) : null}
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
                {fieldErrors.customSlug ? <p className="text-destructive text-xs">{fieldErrors.customSlug}</p> : null}
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create link"
                )}
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
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <Card key={index} className="border-border/80 bg-background/70 rounded-2xl border">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                        <div className="flex flex-wrap gap-2">
                          <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
                          <div className="bg-muted h-5 w-16 animate-pulse rounded-full" />
                          <div className="bg-muted h-5 w-24 animate-pulse rounded-full" />
                        </div>
                      </div>
                      <div className="bg-muted h-3 w-full animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : links.length === 0 ? (
              <div className="border-border text-muted-foreground min-h-[240px] rounded-xl border border-dashed p-6 text-sm">
                <p className="text-foreground text-sm font-medium">No links yet.</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Add a custom slug or switch the redirect type to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const status = getStatus(link);
                  const shortUrl = origin ? `${origin}/${link.slug}` : `/${link.slug}`;
                  const clicks = link.analytics ? link.analytics.totalClicks : 0;
                  const lastClickedAt = link.analytics ? formatDate(link.analytics.lastClickedAt) : "--";
                  const isHighlighted = highlightedLinkId === link.id;
                  const isUpdating = updatingId === link.id;
                  const expiresAtLabel =
                    link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()
                      ? "Expired"
                      : link.expiresAt
                        ? `Expires ${formatShortDate(link.expiresAt)}`
                        : null;
                  const expiryMode = expiryModeById[link.id] ?? (link.expiresAt ? "set" : "none");
                  const expiryValue =
                    expiryValueById[link.id] ?? (link.expiresAt ? toLocalDateTimeInput(link.expiresAt) : "");
                  return (
                    <Card
                      className={`border-border/80 bg-background/70 hover:border-foreground/25 relative rounded-2xl border transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                        isHighlighted ? "ring-primary/30 ring-2" : ""
                      }`}
                      key={link.id}
                    >
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
                            {expiresAtLabel ? (
                              <span className="border-border rounded-full border px-2 py-1">{expiresAtLabel}</span>
                            ) : null}
                            <span className="border-border rounded-full border px-2 py-1">
                              Created {formatDate(link.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-muted-foreground truncate text-xs" title={link.destinationUrl}>
                          {link.destinationUrl}
                        </p>
                        {/* <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                          <span>Expires</span>
                          <Select
                            value={expiryMode}
                            onValueChange={(value) =>
                              setExpiryModeById((prev) => ({
                                ...prev,
                                [link.id]: value as "none" | "set",
                              }))
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="set">Set datetime</SelectItem>
                            </SelectContent>
                          </Select>
                          {expiryMode === "set" ? (
                            <>
                              <Input
                                type="datetime-local"
                                value={expiryValue}
                                onChange={(event) =>
                                  setExpiryValueById((prev) => ({
                                    ...prev,
                                    [link.id]: event.target.value,
                                  }))
                                }
                                className="h-8 w-full min-w-[200px] max-w-[320px] pr-3"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUpdating || !expiryValue}
                                onClick={() =>
                                  handleUpdateExpiry(link, expiryValue ? new Date(expiryValue).toISOString() : null)
                                }
                              >
                                Save
                              </Button>
                            </>
                          ) : link.expiresAt ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => handleUpdateExpiry(link, null)}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                        <div className="absolute bottom-3.5 right-4 flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={isUpdating}
                            onClick={() => handleToggleDisabled(link)}
                          >
                            {link.disabled ? "Enable" : "Disable"}
                          </Button>
                          <button
                            type="button"
                            className="text-muted-foreground/70 hover:text-destructive focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center justify-center transition-[color,transform] duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            aria-label="Delete link"
                            title="Delete link"
                            disabled={deletingId === link.id}
                            onClick={() => handleDelete(link)}
                          >
                            {deletingId === link.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div> */}
                        <div className="text-muted-foreground mt-3 grid gap-3 text-xs">
                          {/* Row 1: Expires controls */}
                          <div className="grid items-center gap-3 sm:grid-cols-[auto_140px_minmax(240px,1fr)]">
                            <span className="shrink-0">Expires</span>

                            <Select
                              value={expiryMode}
                              onValueChange={(value) =>
                                setExpiryModeById((prev) => ({
                                  ...prev,
                                  [link.id]: value as "none" | "set",
                                }))
                              }
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="set">Set datetime</SelectItem>
                              </SelectContent>
                            </Select>

                            {expiryMode === "set" ? (
                              <Input
                                type="datetime-local"
                                value={expiryValue}
                                onChange={(event) =>
                                  setExpiryValueById((prev) => ({
                                    ...prev,
                                    [link.id]: event.target.value,
                                  }))
                                }
                                // key bits:
                                // - pr-10 gives the native icon breathing room
                                // - min-w avoids squeezing (which is what makes it look clipped)
                                className="h-8 w-full min-w-[240px]"
                              />
                            ) : null}
                          </div>

                          {/* Row 2: Actions */}
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              {expiryMode === "set" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating || !expiryValue}
                                  onClick={() =>
                                    handleUpdateExpiry(link, expiryValue ? new Date(expiryValue).toISOString() : null)
                                  }
                                >
                                  Save
                                </Button>
                              ) : link.expiresAt ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateExpiry(link, null)}
                                >
                                  Clear
                                </Button>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                disabled={isUpdating}
                                onClick={() => handleToggleDisabled(link)}
                              >
                                {link.disabled ? "Enable" : "Disable"}
                              </Button>

                              <button
                                type="button"
                                className="text-muted-foreground/70 hover:text-destructive focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center justify-center transition-[color,transform] duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                                aria-label="Delete link"
                                title="Delete link"
                                disabled={deletingId === link.id}
                                onClick={() => handleDelete(link)}
                              >
                                {deletingId === link.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {!isLoading && links.length > 0 && totalClicks === 0 ? (
              <p className="text-muted-foreground text-xs">
                Analytics are privacy-first — only aggregated clicks are stored.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
