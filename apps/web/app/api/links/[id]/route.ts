import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { ensureRedisConnection } from "../../../../lib/redis";
import { normalizeAndValidateUrl } from "../../../../lib/url";
import { invalidateCachedLink, setCachedLink } from "../../../../lib/link-cache";

const REDIRECT_TYPES = new Set([301, 302, 307, 308]);

const UpdateLinkSchema = z.object({
  destinationUrl: z.string().optional(),
  redirectType: z.number().optional(),
  disabled: z.boolean().optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
  slug: z.string().optional(),
});

function parseRedirectType(value: number | undefined) {
  if (value === undefined) {
    return { ok: true as const, value: undefined };
  }

  if (!REDIRECT_TYPES.has(value)) {
    return {
      ok: false as const,
      errorCode: "invalid_redirect_type",
      message: "Redirect type must be 301, 302, 307, or 308.",
    };
  }

  return { ok: true as const, value };
}

function parseExpiresAt(value: string | null | undefined) {
  if (value === undefined) {
    return { ok: true as const, value: undefined };
  }

  if (value === null) {
    return { ok: true as const, value: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      ok: false as const,
      errorCode: "invalid_expires_at",
      message: "expiresAt must be a valid ISO datetime.",
    };
  }

  return { ok: true as const, value: parsed };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errorCode: "invalid_json", message: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = UpdateLinkSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ errorCode: "invalid_body", message: "Invalid request body." }, { status: 400 });
  }

  if (parsedBody.data.slug !== undefined) {
    return NextResponse.json(
      {
        errorCode: "slug_change_not_allowed",
        message: "Slug cannot be updated.",
      },
      { status: 400 },
    );
  }

  const redirectTypeResult = parseRedirectType(parsedBody.data.redirectType);
  if (!redirectTypeResult.ok) {
    return NextResponse.json(
      {
        errorCode: redirectTypeResult.errorCode,
        message: redirectTypeResult.message,
      },
      { status: 400 },
    );
  }

  const expiresAtResult = parseExpiresAt(parsedBody.data.expiresAt);
  if (!expiresAtResult.ok) {
    return NextResponse.json(
      {
        errorCode: expiresAtResult.errorCode,
        message: expiresAtResult.message,
      },
      { status: 400 },
    );
  }

  let destinationUrl = undefined;
  if (parsedBody.data.destinationUrl !== undefined) {
    const urlResult = normalizeAndValidateUrl(parsedBody.data.destinationUrl);
    if (!urlResult.ok) {
      return NextResponse.json({ errorCode: urlResult.errorCode, message: urlResult.message }, { status: 400 });
    }
    destinationUrl = urlResult.url;
  }

  const hostname = process.env.DEFAULT_DOMAIN_HOSTNAME || "localhost";
  const domain = await prisma.domain.findFirst({
    where: { hostname },
    select: { id: true },
  });

  if (!domain) {
    return NextResponse.json(
      {
        errorCode: "domain_missing",
        message: "Default domain not found. Run pnpm --filter web db:seed.",
      },
      { status: 500 },
    );
  }

  const link = await prisma.link.findFirst({
    where: { id: params.id, domainId: domain.id },
  });

  if (!link) {
    return NextResponse.json({ errorCode: "not_found", message: "Link not found." }, { status: 404 });
  }

  if (link.immutable) {
    if (parsedBody.data.destinationUrl !== undefined || parsedBody.data.redirectType !== undefined) {
      return NextResponse.json(
        {
          errorCode: "immutable_link",
          message: "Immutable links cannot update destination or redirect type.",
        },
        { status: 409 },
      );
    }
  }

  const warnings: string[] = [];
  let immutable = link.immutable;
  const redirectType = redirectTypeResult.value ?? link.redirectType;

  if (redirectTypeResult.value !== undefined) {
    if (redirectType === 301 || redirectType === 308) {
      immutable = true;
      warnings.push("Immutable redirect enforced for 301/308.");
    }
  }

  const updateData = {
    ...(destinationUrl !== undefined ? { destinationUrl } : {}),
    ...(redirectTypeResult.value !== undefined ? { redirectType } : {}),
    ...(parsedBody.data.disabled !== undefined ? { disabled: parsedBody.data.disabled } : {}),
    ...(expiresAtResult.value !== undefined ? { expiresAt: expiresAtResult.value } : {}),
    ...(immutable !== link.immutable ? { immutable } : {}),
  };

  const updatedLink =
    Object.keys(updateData).length === 0
      ? link
      : await prisma.link.update({
          where: { id: link.id },
          data: updateData,
        });

  const cachePayload = {
    linkId: updatedLink.id,
    destinationUrl: updatedLink.destinationUrl,
    redirectType: updatedLink.redirectType,
    disabled: updatedLink.disabled,
    expiresAt: updatedLink.expiresAt ? updatedLink.expiresAt.toISOString() : null,
  };

  try {
    const redis = await ensureRedisConnection();
    await invalidateCachedLink(redis, domain.id, updatedLink.slug);
    await setCachedLink(redis, domain.id, updatedLink.slug, cachePayload);
  } catch {
    // Cache failures should not block updates.
  }

  return NextResponse.json({
    id: updatedLink.id,
    slug: updatedLink.slug,
    shortUrl: `https://${hostname}/${updatedLink.slug}`,
    destinationUrl: updatedLink.destinationUrl,
    redirectType: updatedLink.redirectType,
    immutable: updatedLink.immutable,
    expiresAt: updatedLink.expiresAt ? updatedLink.expiresAt.toISOString() : null,
    disabled: updatedLink.disabled,
    createdAt: updatedLink.createdAt.toISOString(),
    ...(warnings.length ? { warnings } : {}),
  });
}
