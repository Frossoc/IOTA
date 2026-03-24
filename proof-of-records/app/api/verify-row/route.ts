import { NextResponse } from "next/server";
import { computeMerkleRootFromProof, hashMerkleLeaf } from "@/app/lib/crypto/merkle";
import { getByteLimit } from "@/app/lib/server/env";
import { validateApiAccess } from "@/app/lib/server/apiAuth";
import { safeLog } from "@/app/lib/server/logger";
import { enforceContentLengthLimit } from "@/app/lib/server/requestLimits";
import { estimateResponseSize, readRequestSize, writeAuditLogBestEffort } from "@/app/lib/security/audit";
import type { RecordRow, VerifyRowRequest } from "@/app/types/records";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isRecordRow(value: unknown): value is RecordRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.date === "string" &&
    typeof value.type === "string" &&
    typeof value.value === "number" &&
    Number.isFinite(value.value) &&
    typeof value.unit === "string" &&
    isOptionalString(value.site) &&
    isOptionalString(value.operator) &&
    isOptionalString(value.notes) &&
    isOptionalString(value.record_id)
  );
}

function isVerifyRowRequest(value: unknown): value is VerifyRowRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecordRow(value.row) &&
    typeof value.row_index === "number" &&
    Number.isInteger(value.row_index) &&
    value.row_index >= 0 &&
    Array.isArray(value.proof) &&
    value.proof.every((item) => typeof item === "string") &&
    typeof value.expected_root === "string" &&
    value.expected_root.trim().length > 0
  );
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestSize = readRequestSize(req);
  const userAgent = req.headers.get("user-agent");
  let auditIdentity: { apiKeyId: string | null; clientId: string | null; clientIp: string } = {
    apiKeyId: null,
    clientId: null,
    clientIp: "unknown",
  };

  const respond = (
    body: Record<string, unknown>,
    status: number,
    options?: { retryAfterSeconds?: number; errorCode?: string | null }
  ) => {
    void writeAuditLogBestEffort({
      endpoint: "/api/verify-row",
      method: "POST",
      status_code: status,
      latency_ms: Date.now() - startedAt,
      ip: auditIdentity.clientIp,
      user_agent: userAgent,
      api_key_id: auditIdentity.apiKeyId,
      client_id: auditIdentity.clientId,
      request_size_bytes: requestSize,
      response_size_bytes: estimateResponseSize(body),
      error_code: options?.errorCode ?? (status >= 400 ? "verify_row_failed" : null),
    });

    const headers = new Headers();
    if (options?.retryAfterSeconds && options.retryAfterSeconds > 0) {
      headers.set("Retry-After", String(options.retryAfterSeconds));
    }

    return NextResponse.json(body, { status, headers });
  };

  try {
    const auth = await validateApiAccess(req);
    auditIdentity = {
      apiKeyId: auth.identity.apiKeyId,
      clientId: auth.identity.clientId,
      clientIp: auth.identity.clientIp,
    };

    if (!auth.ok) {
      return respond(
        { ok: false, error: auth.error },
        auth.status,
        { retryAfterSeconds: auth.retryAfterSeconds, errorCode: "auth_or_rate_limit" }
      );
    }

    const jsonLimit = getByteLimit("MAX_VERIFY_JSON_BYTES", 2 * 1024 * 1024);
    const contentLengthCheck = enforceContentLengthLimit(req, jsonLimit);
    if (!contentLengthCheck.ok) {
      return respond({ ok: false, error: contentLengthCheck.error }, contentLengthCheck.status, { errorCode: "payload_limit" });
    }

    const payload = (await req.json()) as unknown;
    if (!isVerifyRowRequest(payload)) {
      return respond(
        { ok: false, error: "Invalid payload. Required: row, row_index, proof[], expected_root." },
        400,
        { errorCode: "invalid_verify_row_payload" }
      );
    }

    const computedLeafHash = hashMerkleLeaf(payload.row_index, payload.row);
    const computedRoot = computeMerkleRootFromProof(computedLeafHash, payload.proof);
    const match = computedRoot === payload.expected_root;

    return respond({
      ok: true,
      match,
      computed_leaf_hash: computedLeafHash,
      computed_root: computedRoot,
    }, 200);
  } catch (error) {
    safeLog("error", "Row verification failed", {
      route: "/api/verify-row",
      error: error instanceof Error ? error.message : "unknown",
    });
    return respond({ ok: false, error: "Row verification failed" }, 500, { errorCode: "verify_row_route_exception" });
  }
}
