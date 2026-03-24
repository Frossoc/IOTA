import { NextResponse } from "next/server";
import { sha256Hex } from "@/app/lib/proof/hash";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import type { VerifyRequest } from "@/app/types/records";
import { fetchProofByObjectId } from "@/app/lib/iota/client";
import {
  getExplorerObjectUrl,
  getExplorerTxUrl,
  getOnChainEventHashByTxId,
} from "@/app/lib/iota/move";
import { resolveIotaNetworkConfig, toIotaNetwork } from "@/app/lib/iota/networkConfig";
import { getByteLimit, getRuntimeEnv } from "@/app/lib/server/env";
import { enforceContentLengthLimit } from "@/app/lib/server/requestLimits";
import { validateApiAccess } from "@/app/lib/server/apiAuth";
import { safeLog } from "@/app/lib/server/logger";
import { estimateResponseSize, readRequestSize, writeAuditLogBestEffort } from "@/app/lib/security/audit";

type AuditIdentity = {
  apiKeyId: string | null;
  clientId: string | null;
  clientIp: string;
};

export const runtime = "nodejs";

function normalizeHex(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.toLowerCase().replace(/^0x/, "");
}

async function verifyPayload(payload: VerifyRequest) {
  const objectId = payload.object_id ?? payload.objectId;
  const txDigest = payload.tx_digest ?? payload.txId;
  const expectedHash = normalizeHex(payload.expected_event_hash);
  const canonicalString =
    typeof payload.canonical_string === "string" && payload.canonical_string.length > 0
      ? payload.canonical_string
      : payload.canonical !== undefined
        ? stableStringify(payload.canonical)
        : undefined;

  if (!canonicalString) {
    return {
      status: 400,
      body: { ok: false, error: "Missing `canonical` or `canonical_string`." },
    };
  }

  const computedHash = sha256Hex(canonicalString);
  let onchainEventHash: string | null = null;
  let matchOnchain: boolean | null = null;
  let explorerTx: string | null = null;
  let explorerObject: string | null = null;
  const networkConfig = resolveIotaNetworkConfig({
    requestedNetwork: payload.network,
    mainnetConfirmToken: payload.mainnet_confirm_token,
  });
  const onchainEnabled =
    process.env.IOTA_ANCHOR_ONCHAIN === "true" &&
    Boolean(networkConfig.packageId) &&
    Boolean(networkConfig.rpcUrl);

  if (
    onchainEnabled &&
    typeof objectId === "string" &&
    objectId.trim().length > 0
  ) {
    try {
      explorerObject = getExplorerObjectUrl(objectId, toIotaNetwork(networkConfig.network));
    } catch {
      explorerObject = null;
    }
    try {
      const proofObj = await fetchProofByObjectId(objectId, {
        network: toIotaNetwork(networkConfig.network),
        rpcUrl: networkConfig.rpcUrl ?? undefined,
        packageId: networkConfig.packageId ?? undefined,
        module: networkConfig.moduleName,
      });
      onchainEventHash = proofObj?.event_hash_hex ?? null;
      if (onchainEventHash) {
        matchOnchain = normalizeHex(onchainEventHash) === computedHash;
      }
    } catch {
      onchainEventHash = null;
      matchOnchain = null;
    }
  }

  if (
    onchainEnabled &&
    onchainEventHash === null &&
    typeof txDigest === "string" &&
    txDigest.trim().length > 0
  ) {
    try {
      explorerTx = getExplorerTxUrl(txDigest, toIotaNetwork(networkConfig.network));
    } catch {
      explorerTx = null;
    }
    try {
      onchainEventHash = await getOnChainEventHashByTxId(txDigest, {
        network: toIotaNetwork(networkConfig.network),
        rpcUrl: networkConfig.rpcUrl ?? undefined,
        packageId: networkConfig.packageId ?? undefined,
        module: networkConfig.moduleName,
      });
      if (onchainEventHash) {
        matchOnchain = normalizeHex(onchainEventHash) === computedHash;
      }
    } catch {
      matchOnchain = null;
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      computed_event_hash: computedHash,
      expected_event_hash: expectedHash ?? null,
      match: expectedHash ? expectedHash === computedHash : null,
      uri: payload.uri ?? null,
      onchain_event_hash: onchainEventHash,
      match_onchain: matchOnchain,
      explorer: {
        tx: explorerTx,
        object: explorerObject,
        package: null,
      },
      ...(networkConfig.warning ? { warning: networkConfig.warning } : {}),
    },
  };
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestSize = readRequestSize(req);
  const userAgent = req.headers.get("user-agent");
  let auditIdentity: AuditIdentity = {
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
      endpoint: "/api/verify",
      method: "POST",
      status_code: status,
      latency_ms: Date.now() - startedAt,
      ip: auditIdentity.clientIp,
      user_agent: userAgent,
      api_key_id: auditIdentity.apiKeyId,
      client_id: auditIdentity.clientId,
      request_size_bytes: requestSize,
      response_size_bytes: estimateResponseSize(body),
      error_code: options?.errorCode ?? (status >= 400 ? "verify_failed" : null),
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

    const body = (await req.json()) as VerifyRequest;
    const result = await verifyPayload(body);
    return respond(result.body as Record<string, unknown>, result.status);
  } catch (error) {
    safeLog("error", "Verification failed", {
      route: "/api/verify",
      error: error instanceof Error ? error.message : "unknown",
    });
    return respond({ ok: false, error: "Verification failed" }, 500, { errorCode: "verify_route_exception" });
  }
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  const requestSize = readRequestSize(req);
  const userAgent = req.headers.get("user-agent");
  let auditIdentity: AuditIdentity = {
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
      endpoint: "/api/verify",
      method: "GET",
      status_code: status,
      latency_ms: Date.now() - startedAt,
      ip: auditIdentity.clientIp,
      user_agent: userAgent,
      api_key_id: auditIdentity.apiKeyId,
      client_id: auditIdentity.clientId,
      request_size_bytes: requestSize,
      response_size_bytes: estimateResponseSize(body),
      error_code: options?.errorCode ?? (status >= 400 ? "verify_failed" : null),
    });

    const headers = new Headers();
    if (options?.retryAfterSeconds && options.retryAfterSeconds > 0) {
      headers.set("Retry-After", String(options.retryAfterSeconds));
    }

    return NextResponse.json(body, { status, headers });
  };

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

  const jsonLimit = getByteLimit("MAX_VERIFY_QUERY_BYTES", 16 * 1024);
  const contentLengthCheck = enforceContentLengthLimit(req, jsonLimit);
  if (!contentLengthCheck.ok) {
    return respond({ ok: false, error: contentLengthCheck.error }, contentLengthCheck.status, { errorCode: "payload_limit" });
  }

  const runtimeEnv = getRuntimeEnv();
  const { searchParams } = new URL(req.url);
  const result = await verifyPayload({
    canonical_string: searchParams.get("canonical_string") ?? undefined,
    expected_event_hash: searchParams.get("expected_event_hash") ?? undefined,
    uri: searchParams.get("uri") ?? undefined,
    txId: searchParams.get("txId") ?? undefined,
    tx_digest: searchParams.get("tx_digest") ?? undefined,
    objectId: searchParams.get("objectId") ?? undefined,
    object_id: searchParams.get("object_id") ?? undefined,
    network:
      searchParams.get("network") === "mainnet" || searchParams.get("network") === "testnet"
        ? (searchParams.get("network") as "mainnet" | "testnet")
        : undefined,
    mainnet_confirm_token: searchParams.get("mainnet_confirm_token") ?? undefined,
  });

  if (!runtimeEnv.anchorOnchain && result.status === 200) {
    return respond(result.body as Record<string, unknown>, result.status);
  }

  return respond(result.body as Record<string, unknown>, result.status);
}
