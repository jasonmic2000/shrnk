import { randomBytes } from "crypto";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function generateSlugBase58(length = 7) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("length must be a positive integer");
  }

  let output = "";
  while (output.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      output += BASE58_ALPHABET[byte % BASE58_ALPHABET.length];
      if (output.length === length) {
        break;
      }
    }
  }

  return output;
}

const RESERVED_SLUGS = new Set(["api", "admin", "health", "links", "login", "signup", "dashboard"]);

type SlugValidationResult = { ok: true; slug: string } | { ok: false; errorCode: string; message: string };

export function normalizeAndValidateCustomSlug(input: string): SlugValidationResult {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return {
      ok: false,
      errorCode: "EMPTY",
      message: "Slug cannot be empty.",
    };
  }

  if (normalized.length > 64) {
    return {
      ok: false,
      errorCode: "TOO_LONG",
      message: "Slug must be 64 characters or fewer.",
    };
  }

  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return {
      ok: false,
      errorCode: "INVALID_CHARS",
      message: "Slug can only contain lowercase letters, numbers, and dashes.",
    };
  }

  if (normalized.startsWith("-") || normalized.endsWith("-")) {
    return {
      ok: false,
      errorCode: "EDGE_DASH",
      message: "Slug cannot start or end with a dash.",
    };
  }

  if (normalized.includes("--")) {
    return {
      ok: false,
      errorCode: "CONSECUTIVE_DASH",
      message: "Slug cannot contain consecutive dashes.",
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return {
      ok: false,
      errorCode: "RESERVED",
      message: "Slug is reserved.",
    };
  }

  return { ok: true, slug: normalized };
}
