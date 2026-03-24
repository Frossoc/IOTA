export type LimitCheckResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function parseContentLength(req: Request): number | null {
  const raw = req.headers.get("content-length");
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function enforceContentLengthLimit(req: Request, maxBytes: number): LimitCheckResult {
  const contentLength = parseContentLength(req);
  if (contentLength === null) {
    return { ok: true };
  }

  if (contentLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload too large. Max allowed is ${maxBytes} bytes.`,
    };
  }

  return { ok: true };
}

export function estimateDecodedBase64Bytes(input: string): number {
  const trimmed = input.trim();
  const payload = trimmed.includes(",") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed;
  const cleaned = payload.replace(/\s+/g, "");

  if (cleaned.length === 0) {
    return 0;
  }

  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
}
