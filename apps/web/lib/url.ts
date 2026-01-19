type UrlValidationResult = { ok: true; url: string } | { ok: false; errorCode: string; message: string };

const MAX_URL_LENGTH = 2048;

function hasScheme(input: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input);
}

export function normalizeAndValidateUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      ok: false,
      errorCode: "EMPTY",
      message: "URL cannot be empty.",
    };
  }

  let url: URL;
  try {
    url = hasScheme(trimmed) ? new URL(trimmed) : new URL(`https://${trimmed}`);
  } catch {
    return {
      ok: false,
      errorCode: "INVALID_URL",
      message: "URL is invalid.",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      errorCode: "INVALID_SCHEME",
      message: "Only http and https URLs are allowed.",
    };
  }

  url.hostname = url.hostname.toLowerCase();

  if (url.protocol === "http:" && url.port === "80") {
    url.port = "";
  }

  if (url.protocol === "https:" && url.port === "443") {
    url.port = "";
  }

  const normalized = url.toString();

  if (normalized.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      errorCode: "TOO_LONG",
      message: "URL is too long.",
    };
  }

  return { ok: true, url: normalized };
}
