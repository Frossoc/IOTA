import { NextResponse } from "next/server";
import { Buffer as NodeBuffer } from "node:buffer";
import { createHash } from "node:crypto";
import type {
  MerkleProofResponse,
  ProcessType,
  ProofJsonRequest,
  ProofUnitsMode,
  ProofResponse,
  RecordRow,
} from "@/app/types/records";
import { buildMerkleLeafProofs } from "@/app/lib/crypto/merkle";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import { sha256Hex } from "@/app/lib/proof/hash";
import { storeBundle } from "@/app/lib/storage/storeBundle";
import { uploadFileToPinata, uploadJsonToPinata } from "@/app/lib/storage/pinata";
import { registerProofOnChain } from "@/app/lib/iota/move";
import { resolveIotaNetworkConfig, toIotaNetwork } from "@/app/lib/iota/networkConfig";
import { getByteLimit, getRuntimeEnv } from "@/app/lib/server/env";
import { enforceContentLengthLimit, estimateDecodedBase64Bytes } from "@/app/lib/server/requestLimits";
import { validateApiAccess } from "@/app/lib/server/apiAuth";
import { safeLog } from "@/app/lib/server/logger";
import { persistProofBestEffort } from "@/app/lib/persistence/proofs";
import { estimateResponseSize, readRequestSize, writeAuditLogBestEffort } from "@/app/lib/security/audit";

export const runtime = "nodejs";

const PROCESS_TYPES: ProcessType[] = [
  "Waste traceability",
  "ESG reporting",
  "Supply chain",
  "Supply chain event",
  "Compliance logs",
  "Media / news integrity",
  "Other",
];

type CanonicalEvidence = {
  photo_hash: string;
  photo_uri: string;
};

type CanonicalProofUnits = {
  mode: "merkle";
  algorithm: MerkleProofResponse["algorithm"];
  root: string;
  leaf_count: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isProofUnitsMode(value: unknown): value is ProofUnitsMode {
  return value === "batch" || value === "merkle";
}

function isValidProcessType(value: string): value is ProcessType {
  return PROCESS_TYPES.includes(value as ProcessType);
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateRecord(value: unknown, index: number): { ok: true; row: RecordRow } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: `records[${index}] must be an object` };
  }

  const candidate = value as Record<string, unknown>;
  if (!isNonEmptyString(candidate.date)) {
    return { ok: false, error: `records[${index}].date is required` };
  }
  if (!isNonEmptyString(candidate.type)) {
    return { ok: false, error: `records[${index}].type is required` };
  }
  if (!isFiniteNumber(candidate.value)) {
    return { ok: false, error: `records[${index}].value must be a finite number` };
  }
  if (!isNonEmptyString(candidate.unit)) {
    return { ok: false, error: `records[${index}].unit is required` };
  }

  if (!isOptionalString(candidate.site)) {
    return { ok: false, error: `records[${index}].site must be a string if provided` };
  }
  if (!isOptionalString(candidate.operator)) {
    return { ok: false, error: `records[${index}].operator must be a string if provided` };
  }
  if (!isOptionalString(candidate.notes)) {
    return { ok: false, error: `records[${index}].notes must be a string if provided` };
  }
  if (!isOptionalString(candidate.record_id)) {
    return { ok: false, error: `records[${index}].record_id must be a string if provided` };
  }

  return {
    ok: true,
    row: {
      date: candidate.date.trim(),
      type: candidate.type.trim(),
      value: candidate.value,
      unit: candidate.unit.trim(),
      ...(normalizeOptionalString(candidate.site) ? { site: normalizeOptionalString(candidate.site) } : {}),
      ...(normalizeOptionalString(candidate.operator)
        ? { operator: normalizeOptionalString(candidate.operator) }
        : {}),
      ...(normalizeOptionalString(candidate.notes) ? { notes: normalizeOptionalString(candidate.notes) } : {}),
      ...(normalizeOptionalString(candidate.record_id)
        ? { record_id: normalizeOptionalString(candidate.record_id) }
        : {}),
    },
  };
}

function isProofJsonRequest(value: unknown): value is ProofJsonRequest {
  if (!isRecord(value)) {
    return false;
  }

  const projectContext = value.project_context;
  const records = value.records;
  const evidence = value.evidence;

  if (!isRecord(projectContext)) {
    return false;
  }

  if (!isNonEmptyString(projectContext.project_name) || !isNonEmptyString(projectContext.process_type)) {
    return false;
  }

  if (projectContext.description !== undefined && !isString(projectContext.description)) {
    return false;
  }

  if (!Array.isArray(records) || records.length === 0) {
    return false;
  }

  if (evidence !== undefined) {
    if (!isRecord(evidence)) {
      return false;
    }
    if (!isNonEmptyString(evidence.photo_base64)) {
      return false;
    }
    if (evidence.filename !== undefined && !isString(evidence.filename)) {
      return false;
    }
    if (evidence.content_type !== undefined && !isString(evidence.content_type)) {
      return false;
    }
  }

  if (value.proof_units_mode !== undefined && !isProofUnitsMode(value.proof_units_mode)) {
    return false;
  }

  return true;
}

function isUnitCountedForProofUnits(unit: string): boolean {
  const normalized = unit.trim().toLowerCase();
  return normalized === "kg" || normalized === "kgs" || normalized === "kilogram" || normalized === "kilograms";
}

function computeTotalUnits(rows: Array<{ value: number; unit: string }>): number {
  return rows.reduce((sum, row) => {
    if (!isUnitCountedForProofUnits(row.unit)) {
      return sum;
    }
    return sum + row.value;
  }, 0);
}

function sortRows(rows: RecordRow[]): RecordRow[] {
  return [...rows].sort((a, b) => {
    return (
      a.date.localeCompare(b.date) ||
      a.type.localeCompare(b.type) ||
      a.value - b.value ||
      a.unit.localeCompare(b.unit)
    );
  });
}

function hexToBytes(hexValue: string): number[] {
  const normalized = hexValue.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Invalid event hash hex");
  }
  return normalized.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
}

function decodeBase64Payload(photoBase64: string): NodeBuffer {
  const trimmed = photoBase64.trim();
  const withPrefix = trimmed.match(/^data:[^;]+;base64,(.+)$/);
  const payload = withPrefix ? withPrefix[1] : trimmed;

  if (!payload || payload.length === 0) {
    throw new Error("Empty base64 payload");
  }

  const buffer = NodeBuffer.from(payload, "base64");
  if (buffer.length === 0) {
    throw new Error("Invalid base64 payload");
  }

  return buffer;
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestSize = readRequestSize(req);
  const endpoint = "/api/proof-json";
  const method = "POST";
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
      endpoint,
      method,
      status_code: status,
      latency_ms: Date.now() - startedAt,
      ip: auditIdentity.clientIp,
      user_agent: userAgent,
      api_key_id: auditIdentity.apiKeyId,
      client_id: auditIdentity.clientId,
      request_size_bytes: requestSize,
      response_size_bytes: estimateResponseSize(body),
      error_code: options?.errorCode ?? (status >= 400 ? "request_failed" : null),
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
        { error: auth.error },
        auth.status,
        { retryAfterSeconds: auth.retryAfterSeconds, errorCode: "auth_or_rate_limit" }
      );
    }

    const jsonLimit = getByteLimit("MAX_JSON_BYTES", 5 * 1024 * 1024);
    const contentLengthCheck = enforceContentLengthLimit(req, jsonLimit);
    if (!contentLengthCheck.ok) {
      return respond({ error: contentLengthCheck.error }, contentLengthCheck.status, { errorCode: "payload_limit" });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return respond({ error: "Content-Type must be application/json" }, 415, { errorCode: "invalid_content_type" });
    }

    let payload: unknown;
    try {
      payload = (await req.json()) as unknown;
    } catch {
      return respond({ error: "Invalid JSON body" }, 400, { errorCode: "invalid_json_body" });
    }

    if (!isProofJsonRequest(payload)) {
      return respond(
        {
          error:
            "Invalid request shape. Required: project_context {project_name, process_type}, non-empty records[], optional evidence.photo_base64",
        },
        400,
        { errorCode: "invalid_payload_shape" }
      );
    }

    const validationErrors: string[] = [];
    const normalizedRows: RecordRow[] = [];

    payload.records.forEach((item, index) => {
      const checked = validateRecord(item, index);
      if (!checked.ok) {
        validationErrors.push(checked.error);
        return;
      }
      normalizedRows.push(checked.row);
    });

    if (validationErrors.length > 0) {
      return respond({ error: validationErrors.join("; ") }, 400, { errorCode: "invalid_record_rows" });
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    warnings.push(...auth.warnings);
    const proofUnitsMode: ProofUnitsMode = payload.proof_units_mode ?? "batch";

    const networkConfig = resolveIotaNetworkConfig({
      requestedNetwork: payload.network,
      mainnetConfirmToken: payload.mainnet_confirm_token,
    });
    if (networkConfig.warning) {
      warnings.push(networkConfig.warning);
    }

    if (!isValidProcessType(payload.project_context.process_type)) {
      warnings.push("project_context.process_type is outside the known MVP set.");
    }

    const issuer = "biosphere-rocks";
    const timestamp = new Date().toISOString();

    let evidence: CanonicalEvidence | undefined;
    if (payload.evidence?.photo_base64) {
      const maxPhotoBytes = getByteLimit("MAX_PHOTO_BYTES", 8 * 1024 * 1024);
      const estimatedBytes = estimateDecodedBase64Bytes(payload.evidence.photo_base64);
      if (estimatedBytes > maxPhotoBytes) {
        return respond(
          { error: `Photo evidence too large. Max allowed is ${maxPhotoBytes} bytes.` },
          413,
          { errorCode: "photo_too_large" }
        );
      }

      if (!process.env.PINATA_JWT || process.env.PINATA_JWT.trim().length === 0) {
        return respond(
          { error: "PINATA_JWT is required when evidence.photo_base64 is provided" },
          400,
          { errorCode: "missing_pinata_jwt" }
        );
      }

      try {
        const bytes = decodeBase64Payload(payload.evidence.photo_base64);
        const photo_hash = createHash("sha256").update(bytes).digest("hex");
        const contentTypeValue =
          payload.evidence.content_type && payload.evidence.content_type.trim().length > 0
            ? payload.evidence.content_type.trim()
            : "application/octet-stream";
        const filename =
          payload.evidence.filename && payload.evidence.filename.trim().length > 0
            ? payload.evidence.filename.trim()
            : "evidence.jpg";

        const uploadInput = new Blob([new Uint8Array(bytes)], { type: contentTypeValue });
        const uploadedPhoto = await uploadFileToPinata(uploadInput, filename);

        evidence = {
          photo_hash,
          photo_uri: uploadedPhoto.uri,
        };
      } catch {
        return respond({ error: "Failed to process or upload photo evidence" }, 502, { errorCode: "photo_upload_failed" });
      }
    }

    const sortedRows = sortRows(normalizedRows);
    const totalUnits = computeTotalUnits(sortedRows);
    const merkleData: MerkleProofResponse | undefined =
      proofUnitsMode === "merkle"
        ? (() => {
            const built = buildMerkleLeafProofs(sortedRows);
            return {
              algorithm: built.algorithm,
              root: built.root,
              leaf_count: built.leaf_count,
              leaves: built.leaves.map((leaf) => ({
                index: leaf.index,
                leaf_hash: leaf.leaf_hash,
              proof: leaf.proof,
            })),
          };
        })()
        : undefined;
    const canonicalProofUnits: CanonicalProofUnits | undefined = merkleData
      ? {
          mode: "merkle",
          algorithm: merkleData.algorithm,
          root: merkleData.root,
          leaf_count: merkleData.leaf_count,
        }
      : undefined;

    const canonicalObj = {
      adapter: "records",
      issuer,
      timestamp,
      project_context: {
        project_name: payload.project_context.project_name.trim(),
        process_type: payload.project_context.process_type.trim(),
        ...(payload.project_context.description && payload.project_context.description.trim().length > 0
          ? { description: payload.project_context.description.trim() }
          : {}),
      },
      rows: sortedRows,
      metrics: {
        total_units: totalUnits,
      },
      ...(canonicalProofUnits ? { proof_units: canonicalProofUnits } : {}),
      ...(evidence ? { evidence } : {}),
    };

    const canonical_string = stableStringify(canonicalObj);
    const event_hash = merkleData?.root ?? sha256Hex(canonical_string);

    const stored = await storeBundle(canonicalObj);
    let uri = stored.uri;

    if (process.env.PINATA_JWT) {
      try {
        const firstBundle = await uploadJsonToPinata(
          {
            canonical: canonicalObj,
            event_hash,
            ...(merkleData ? { proof_units_mode: proofUnitsMode, merkle: merkleData } : {}),
            uri: stored.uri,
            metrics: {
              total_units: totalUnits,
            },
            ...(evidence ? { evidence } : {}),
          },
          "bundle.json"
        );
        uri = firstBundle.uri;

        try {
          await uploadJsonToPinata(
            {
              canonical: canonicalObj,
              event_hash,
              ...(merkleData ? { proof_units_mode: proofUnitsMode, merkle: merkleData } : {}),
              uri,
              metrics: {
                total_units: totalUnits,
              },
              ...(evidence ? { evidence } : {}),
            },
            "bundle.json"
          );
        } catch {
          // Keep primary bundle URI even if secondary write fails.
        }
      } catch {
        warnings.push("Pinata bundle upload failed. Using local URI fallback.");
      }
    }

    const runtimeEnv = getRuntimeEnv();
    const hasIotaEnv = Boolean(networkConfig.rpcUrl) && runtimeEnv.hasIotaSigner;
    const anchorOnchain = runtimeEnv.anchorOnchain;
    const packageId = networkConfig.packageId ?? undefined;
    const iotaNetwork = networkConfig.network;

    let txId: string | undefined;
    let txDigest: string | undefined;
    let objectId: string | null | undefined;
    let explorerTx: string | undefined;
    let explorerObject: string | undefined;
    let explorerPackage: string | undefined;
    let anchorError: string | undefined;

    if (anchorOnchain) {
      const onchainIssuer =
        process.env.IOTA_ISSUER_ADDRESS?.trim() ||
        process.env.IOTA_SENDER_ADDRESS?.trim() ||
        process.env.IOTA_ACTIVE_ADDRESS?.trim();

      if (!hasIotaEnv || !packageId || !onchainIssuer) {
        warnings.push(
          "On-chain anchoring skipped: missing required IOTA env vars (IOTA_RPC_URL, signer key, IOTA_PACKAGE_ID, or issuer address)."
        );
      } else {
        try {
          const onchainTimestamp = Math.floor(Date.now() / 1000);
          const anchored = await registerProofOnChain({
            event_hash_bytes: hexToBytes(event_hash),
            uri_bytes: Array.from(NodeBuffer.from(uri, "utf8")),
            issuer: onchainIssuer,
            timestamp: onchainTimestamp,
          }, {
            network: toIotaNetwork(iotaNetwork),
            rpcUrl: networkConfig.rpcUrl ?? undefined,
            packageId,
            module: networkConfig.moduleName,
          });
          txDigest = anchored.txDigest;
          objectId = anchored.objectId;
          txId = anchored.txId;
          explorerTx = anchored.explorer.tx;
          explorerObject = anchored.explorer.object ?? undefined;
          explorerPackage = packageId
            ? `${networkConfig.explorer.objectBase}${packageId}${
                networkConfig.network === "mainnet" ? "" : `?network=${encodeURIComponent(networkConfig.network)}`
              }`
            : undefined;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown anchor error";
          anchorError = message;
          warnings.push(`On-chain anchoring failed: ${message}`);
        }
      }
    }

    const response: ProofResponse = {
      ok: true,
      proof_units_mode: proofUnitsMode,
      rows_count: sortedRows.length,
      event_hash,
      canonical_string,
      uri,
      issuer,
      timestamp,
      warnings,
      errors,
      metrics: {
        total_units: totalUnits,
      },
      ...(txId ? { txId } : {}),
      ...(txDigest ? { tx_digest: txDigest } : {}),
      ...(objectId !== undefined ? { object_id: objectId } : {}),
      ...(anchorError ? { anchor_error: anchorError } : {}),
      ...(explorerTx || explorerObject || explorerPackage
        ? {
            explorer: {
              ...(explorerTx ? { tx: explorerTx } : {}),
              ...(explorerObject ? { object: explorerObject } : {}),
              ...(explorerPackage ? { package: explorerPackage } : {}),
            },
          }
        : {}),
      ...(merkleData ? { merkle: merkleData } : {}),
      ...(evidence ? { evidence } : {}),
      project_context: canonicalObj.project_context,
      network: iotaNetwork,
    };

    const persisted = await persistProofBestEffort({
      source: "json",
      ...(proofUnitsMode === "merkle" ? { proof_units_mode: proofUnitsMode } : {}),
      rows_count: response.rows_count,
      total_units: response.metrics?.total_units ?? 0,
      event_hash: response.event_hash,
      canonical_string: response.canonical_string,
      ...(response.merkle
        ? {
            merkle: {
              root: response.merkle.root,
              leaf_count: response.merkle.leaf_count,
              algorithm: response.merkle.algorithm,
            },
          }
        : {}),
      uri: response.uri,
      issuer: response.issuer,
      timestamp: response.timestamp,
      ...(response.tx_digest ? { tx_digest: response.tx_digest } : {}),
      ...(response.object_id !== undefined ? { object_id: response.object_id } : {}),
      ...(response.explorer ? { explorer: response.explorer } : {}),
      ...(response.evidence ? { evidence: response.evidence } : {}),
      ...(response.project_context ? { project_context: response.project_context } : {}),
      warnings: [...response.warnings],
      errors: [...response.errors],
    });

    if (persisted.ok) {
      response.proof_db_id = persisted.id;
    } else {
      response.warnings.push("supabase_persist_failed");
    }

    return respond(response as unknown as Record<string, unknown>, 200);
  } catch (error) {
    safeLog("error", "Failed to generate JSON proof bundle", {
      route: "/api/proof-json",
      error: error instanceof Error ? error.message : "unknown",
    });
    return respond({ error: "Failed to generate JSON proof bundle" }, 500, { errorCode: "proof_json_route_exception" });
  }
}
