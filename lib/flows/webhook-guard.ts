const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fc[0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

// Best-effort SSRF guard: blocks the obvious private/loopback ranges by
// hostname pattern. Not a substitute for a real egress proxy, but stops
// naive "point the webhook at my internal admin panel" attempts.
export function isSafeWebhookUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  return !BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}
