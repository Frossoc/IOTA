import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { safeLog } from "@/app/lib/server/logger";
import type { AccessIdentity, ApiKeyRow } from "@/app/lib/security/access";

export type RateLimitDecision = {
  ok: boolean;
  retryAfterSeconds?: number;
  warnings: string[];
};

type WindowType = "minute" | "day";

type UsageRow = {
  id: number | string;
  api_key_id: string | null;
  client_ip: string;
  window_type: WindowType;
  window_start: string;
  count: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function floorToMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

function floorToDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function getLimits(row: ApiKeyRow): { perMinute: number; perDay: number } {
  const perMinute = typeof row.quota_per_minute === "number" && row.quota_per_minute > 0 ? row.quota_per_minute : 60;
  const perDay = typeof row.quota_per_day === "number" && row.quota_per_day > 0 ? row.quota_per_day : 10000;
  return { perMinute, perDay };
}

async function fetchUsage(
  apiKeyId: string,
  clientIp: string,
  windowType: WindowType,
  windowStartIso: string
): Promise<UsageRow | null> {
  const client = createSupabaseServerClient();
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  const { data, error } = await client
    .from("usage_counters_por")
    .select("id,api_key_id,client_ip,window_type,window_start,count")
    .eq("api_key_id", apiKeyId)
    .eq("client_ip", clientIp)
    .eq("window_type", windowType)
    .eq("window_start", windowStartIso)
    .limit(1);

  if (error) {
    throw new Error(`usage_fetch_failed:${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as Record<string, unknown>;
  const parsedCount = toFiniteNumber(row.count);
  const rowId = row.id;
  if (
    (typeof rowId !== "number" && typeof rowId !== "string") ||
    typeof row.client_ip !== "string" ||
    typeof row.window_type !== "string" ||
    typeof row.window_start !== "string" ||
    parsedCount === null
  ) {
    return null;
  }

  return {
    id: rowId,
    api_key_id: typeof row.api_key_id === "string" ? row.api_key_id : null,
    client_ip: row.client_ip,
    window_type: row.window_type as WindowType,
    window_start: row.window_start,
    count: parsedCount,
  };
}

async function incrementUsage(
  apiKeyId: string,
  clientIp: string,
  windowType: WindowType,
  windowStartIso: string,
  current: UsageRow | null
): Promise<void> {
  const client = createSupabaseServerClient();
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  if (!current) {
    const { error } = await client.from("usage_counters_por").insert({
      api_key_id: apiKeyId,
      client_ip: clientIp,
      window_type: windowType,
      window_start: windowStartIso,
      count: 1,
    });
    if (error) {
      throw new Error(`usage_insert_failed:${error.message}`);
    }
    return;
  }

  const { error } = await client
    .from("usage_counters_por")
    .update({ count: current.count + 1 })
    .eq("id", current.id);

  if (error) {
    throw new Error(`usage_update_failed:${error.message}`);
  }
}

function retryAfterForWindow(windowType: WindowType, now: Date): number {
  if (windowType === "minute") {
    return Math.max(1, 60 - now.getSeconds());
  }

  const endOfDay = new Date(now);
  endOfDay.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((endOfDay.getTime() - now.getTime()) / 1000));
}

export async function enforceRateLimitBestEffort(
  identity: AccessIdentity,
  apiKeyRecord: ApiKeyRow | null,
  mode: "off" | "soft" | "required"
): Promise<RateLimitDecision> {
  if (!apiKeyRecord || !identity.apiKeyId) {
    return { ok: true, warnings: [] };
  }

  const now = new Date();
  const minuteStart = floorToMinute(now).toISOString();
  const dayStart = floorToDay(now).toISOString();
  const limits = getLimits(apiKeyRecord);

  const checks: Array<{ type: WindowType; start: string; limit: number }> = [
    { type: "minute", start: minuteStart, limit: limits.perMinute },
    { type: "day", start: dayStart, limit: limits.perDay },
  ];

  try {
    for (const check of checks) {
      const current = await fetchUsage(identity.apiKeyId, identity.clientIp, check.type, check.start);
      const count = current?.count ?? 0;
      if (count >= check.limit) {
        return {
          ok: false,
          retryAfterSeconds: retryAfterForWindow(check.type, now),
          warnings: ["rate_limit_exceeded"],
        };
      }
      await incrementUsage(identity.apiKeyId, identity.clientIp, check.type, check.start, current);
    }

    return { ok: true, warnings: [] };
  } catch (error) {
    safeLog("warn", "Rate limit check degraded", {
      error: error instanceof Error ? error.message : "unknown",
      mode,
      api_key_id: identity.apiKeyId,
      client_ip: identity.clientIp,
    });

    return {
      ok: true,
      warnings: ["rate_limit_unavailable"],
    };
  }
}
