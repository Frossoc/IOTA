import {
  readClientIp,
  readApiAuthMode,
  resolveAccessIdentity,
  type AccessIdentity,
} from "@/app/lib/security/access";
import { enforceRateLimitBestEffort } from "@/app/lib/security/rateLimit";

export type ApiAuthResult =
  | {
      ok: true;
      warnings: string[];
      identity: AccessIdentity;
    }
  | {
      ok: false;
      status: number;
      error: string;
      warnings: string[];
      retryAfterSeconds?: number;
      identity: AccessIdentity;
    };

export async function validateApiAccess(req: Request): Promise<ApiAuthResult> {
  const mode = readApiAuthMode();
  const clientIp = readClientIp(req);
  const resolved = await resolveAccessIdentity(req);

  const identity: AccessIdentity = {
    apiKeyId: resolved.record?.id ?? null,
    clientId: resolved.record?.client_id ?? null,
    clientIp,
    apiKeyPrefix: resolved.apiKeyPrefix,
  };

  const warnings = [...resolved.warnings];

  if (!resolved.apiKey) {
    if (mode === "required") {
      return {
        ok: false,
        status: 401,
        error: "Missing API key",
        warnings,
        identity,
      };
    }

    if (mode === "soft") {
      warnings.push("api_key_missing_soft_mode");
    }

    return {
      ok: true,
      warnings,
      identity,
    };
  }

  if (!resolved.record) {
    if (!resolved.authBackendAvailable && mode === "required") {
      return {
        ok: false,
        status: 503,
        error: "Auth backend unavailable",
        warnings,
        identity,
      };
    }

    if (mode === "required") {
      return {
        ok: false,
        status: 401,
        error: "Invalid API key",
        warnings,
        identity,
      };
    }

    warnings.push("api_key_invalid_soft_mode");
    return {
      ok: true,
      warnings,
      identity,
    };
  }

  const rate = await enforceRateLimitBestEffort(identity, resolved.record, mode);
  warnings.push(...rate.warnings);

  if (!rate.ok) {
    return {
      ok: false,
      status: 429,
      error: "Rate limit exceeded",
      retryAfterSeconds: rate.retryAfterSeconds,
      warnings,
      identity,
    };
  }

  return {
    ok: true,
    warnings,
    identity,
  };
}
