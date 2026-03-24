import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { safeLog } from "@/app/lib/server/logger";

export type AuditPayload = {
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  ip: string;
  user_agent: string | null;
  api_key_id?: string | null;
  client_id?: string | null;
  request_size_bytes?: number | null;
  response_size_bytes?: number | null;
  error_code?: string | null;
};

export function readRequestSize(req: Request): number | null {
  const raw = req.headers.get("content-length");
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function estimateResponseSize(body: unknown): number | null {
  try {
    return Buffer.byteLength(JSON.stringify(body), "utf8");
  } catch {
    return null;
  }
}

export async function writeAuditLogBestEffort(payload: AuditPayload): Promise<void> {
  try {
    const client = createSupabaseServerClient();
    if (!client) {
      return;
    }

    const { error } = await client.from("audit_logs_por").insert(payload);
    if (error) {
      safeLog("warn", "Audit log insert failed", {
        endpoint: payload.endpoint,
        status_code: payload.status_code,
        message: error.message,
      });
    }
  } catch (error) {
    safeLog("warn", "Audit log unavailable", {
      endpoint: payload.endpoint,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
