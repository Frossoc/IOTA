export type LogLevel = "info" | "warn" | "error";

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/(IOTA_PRIVATE_KEY=)[^\s]+/gi, "$1[REDACTED]")
      .replace(/(PINATA_JWT=)[^\s]+/gi, "$1[REDACTED]")
      .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[REDACTED]");
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("private") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("jwt") ||
        lowerKey.includes("token")
      ) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactValue(nested);
      }
    }
    return redacted;
  }

  return value;
}

export function safeLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const payload = meta ? redactValue(meta) : undefined;

  if (level === "error") {
    console.error(message, payload);
    return;
  }

  if (level === "warn") {
    console.warn(message, payload);
    return;
  }

  console.info(message, payload);
}
