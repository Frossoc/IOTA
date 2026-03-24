import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getRuntimeEnv } from "@/app/lib/server/env";
import { safeLog } from "@/app/lib/server/logger";

export type ApiAuthMode = "off" | "soft" | "required";

export type ApiKeyRow = {
  id: string;
  client_id: string | null;
  key_hash: string;
  key_prefix: string | null;
  env: string | null;
  is_active: boolean;
  quota_per_minute: number | null;
  quota_per_day: number | null;
};

export type AccessIdentity = {
  apiKeyId: string | null;
  clientId: string | null;
  clientIp: string;
  apiKeyPrefix: string | null;
};

export function readApiAuthMode(): ApiAuthMode {
  const raw = process.env.API_KEY_AUTH_MODE?.trim().toLowerCase() || "off";
  if (raw === "required") {
    return "required";
  }
  if (raw === "soft") {
    return "soft";
  }
  return "off";
}

export function readClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

function getApiKeyPrefix(apiKey: string): string | null {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return null;
  }
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex > 0) {
    return trimmed.slice(0, dotIndex);
  }
  return trimmed.slice(0, Math.min(16, trimmed.length));
}

export async function findApiKeyRecord(apiKey: string): Promise<ApiKeyRow | null> {
  const client = createSupabaseServerClient();
  if (!client) {
    return null;
  }

  const hashed = hashApiKey(apiKey);
  const { data, error } = await client
    .from("api_keys_por")
    .select("id,client_id,key_hash,key_prefix,env,is_active,quota_per_minute,quota_per_day")
    .eq("key_hash", hashed)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    throw new Error(`api_key_lookup_failed:${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.key_hash !== "string") {
    return null;
  }

  return {
    id: row.id,
    client_id: typeof row.client_id === "string" ? row.client_id : null,
    key_hash: row.key_hash,
    key_prefix: typeof row.key_prefix === "string" ? row.key_prefix : null,
    env: typeof row.env === "string" ? row.env : null,
    is_active: row.is_active === true,
    quota_per_minute: typeof row.quota_per_minute === "number" ? row.quota_per_minute : null,
    quota_per_day: typeof row.quota_per_day === "number" ? row.quota_per_day : null,
  };
}

export async function resolveAccessIdentity(req: Request): Promise<{
  mode: ApiAuthMode;
  apiKey: string | null;
  apiKeyPrefix: string | null;
  runtimeNetwork: string;
  record: ApiKeyRow | null;
  warnings: string[];
  authBackendAvailable: boolean;
}> {
  const mode = readApiAuthMode();
  const runtimeNetwork = getRuntimeEnv().iotaNetwork;
  const apiKey = req.headers.get("x-api-key")?.trim() || null;
  const apiKeyPrefix = apiKey ? getApiKeyPrefix(apiKey) : null;
  const warnings: string[] = [];

  if (!apiKey) {
    return {
      mode,
      apiKey,
      apiKeyPrefix,
      runtimeNetwork,
      record: null,
      warnings,
      authBackendAvailable: createSupabaseServerClient() !== null,
    };
  }

  try {
    const record = await findApiKeyRecord(apiKey);
    if (!record) {
      warnings.push("api_key_not_found");
      return {
        mode,
        apiKey,
        apiKeyPrefix,
        runtimeNetwork,
        record: null,
        warnings,
        authBackendAvailable: true,
      };
    }

    if (record.env && record.env !== runtimeNetwork && record.env !== "any") {
      warnings.push("api_key_env_mismatch");
      return {
        mode,
        apiKey,
        apiKeyPrefix,
        runtimeNetwork,
        record: null,
        warnings,
        authBackendAvailable: true,
      };
    }

    return {
      mode,
      apiKey,
      apiKeyPrefix,
      runtimeNetwork,
      record,
      warnings,
      authBackendAvailable: true,
    };
  } catch (error) {
    safeLog("warn", "API key lookup unavailable", {
      error: error instanceof Error ? error.message : "unknown",
      api_key_prefix: apiKeyPrefix,
    });

    return {
      mode,
      apiKey,
      apiKeyPrefix,
      runtimeNetwork,
      record: null,
      warnings: [...warnings, "api_key_lookup_unavailable"],
      authBackendAvailable: false,
    };
  }
}
