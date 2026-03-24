import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Buffer as NodeBuffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { ColumnMapping, ProcessType, ProjectContext, ProofResponse } from "@/app/types/records";
import { normalizeRows } from "@/app/lib/excel/normalize";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import { sha256Hex } from "@/app/lib/proof/hash";
import { storeBundle } from "@/app/lib/storage/storeBundle";
import { uploadFileToPinata, uploadJsonToPinata } from "@/app/lib/storage/pinata";
import { mintProofUnitsToken, registerProofOnChain } from "@/app/lib/iota/move";
import { resolveIotaNetworkConfig, toIotaNetwork } from "@/app/lib/iota/networkConfig";
import { getByteLimit, getRuntimeEnv } from "@/app/lib/server/env";
import { enforceContentLengthLimit } from "@/app/lib/server/requestLimits";
import { validateApiAccess } from "@/app/lib/server/apiAuth";
import { safeLog } from "@/app/lib/server/logger";
import { persistProofBestEffort } from "@/app/lib/persistence/proofs";
import { estimateResponseSize, readRequestSize, writeAuditLogBestEffort } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type CellTextValue = {
  text: string;
};

type RichTextValue = {
  richText: Array<{ text?: string }>;
};

const PROCESS_TYPES: ProcessType[] = [
  "Waste traceability",
  "ESG reporting",
  "Supply chain",
  "Supply chain event",
  "Compliance logs",
  "Media / news integrity",
  "Other",
];

function isCellTextValue(value: unknown): value is CellTextValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as { text?: unknown }).text === "string"
  );
}

function isRichTextValue(value: unknown): value is RichTextValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "richText" in value &&
    Array.isArray((value as { richText?: unknown }).richText)
  );
}

function cellToPrimitive(value: unknown): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isCellTextValue(value)) {
    return value.text;
  }

  if (isRichTextValue(value)) {
    return value.richText.map((part) => part.text ?? "").join("");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function isColumnMapping(value: unknown): value is ColumnMapping {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.date === "string" &&
    candidate.date.trim().length > 0 &&
    typeof candidate.type === "string" &&
    candidate.type.trim().length > 0 &&
    typeof candidate.value === "string" &&
    candidate.value.trim().length > 0 &&
    typeof candidate.unit === "string" &&
    candidate.unit.trim().length > 0
  );
}

function isProcessType(value: unknown): value is ProcessType {
  return typeof value === "string" && PROCESS_TYPES.includes(value as ProcessType);
}

function isProjectContext(value: unknown): value is ProjectContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.project_name === "string" &&
    candidate.project_name.trim().length > 0 &&
    isProcessType(candidate.process_type) &&
    (candidate.description === undefined || typeof candidate.description === "string")
  );
}

async function parseFirstSheetRows(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer: NodeBuffer = NodeBuffer.from(new Uint8Array(buffer));
  type LoadArg = Parameters<(typeof workbook.xlsx.load)>[0];
  await workbook.xlsx.load(nodeBuffer as unknown as LoadArg);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const columns: string[] = [];

  headerRow.eachCell((cell, colNumber) => {
    const name = String(cellToPrimitive(cell.value) ?? "").trim();
    columns.push(name || `col_${colNumber}`);
  });

  const rawRows: Record<string, unknown>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount === 0) {
      continue;
    }

    const record: Record<string, unknown> = {};
    columns.forEach((columnName, index) => {
      record[columnName] = cellToPrimitive(row.getCell(index + 1).value);
    });

    const hasData = Object.values(record).some((v) => String(v ?? "").trim().length > 0);
    if (hasData) {
      rawRows.push(record);
    }
  }

  return rawRows;
}

function isUnitCountedForProofUnits(unit: string): boolean {
  const normalized = unit.trim().toLowerCase();
  return normalized === "kg" || normalized === "kgs" || normalized === "kilogram" || normalized === "kilograms";
}

function computeTotalUnits(
  rows: Array<{
    value: number;
    unit: string;
  }>
): number {
  return rows.reduce((sum, row) => {
    if (!isUnitCountedForProofUnits(row.unit)) {
      return sum;
    }
    return sum + row.value;
  }, 0);
}

function hexToBytes(hexValue: string): number[] {
  const normalized = hexValue.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Invalid event hash hex");
  }
  return normalized.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestSize = readRequestSize(req);
  const endpoint = "/api/proof";
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

    const uploadLimit = getByteLimit("MAX_MULTIPART_BYTES", 25 * 1024 * 1024);
    const contentLengthCheck = enforceContentLengthLimit(req, uploadLimit);
    if (!contentLengthCheck.ok) {
      return respond({ error: contentLengthCheck.error }, contentLengthCheck.status, { errorCode: "payload_limit" });
    }

    const form = await req.formData();
    const file = form.get("file");
    const mappingRaw = form.get("mapping");
    const projectContextRaw = form.get("project_context");
    const requestedNetwork = form.get("network");
    const mainnetConfirmToken = form.get("mainnet_confirm_token");
    const photo = form.get("photo");

    if (!(file instanceof File)) {
      return respond({ error: "Missing file" }, 400, { errorCode: "missing_file" });
    }

    if (typeof mappingRaw !== "string") {
      return respond({ error: "Missing mapping" }, 400, { errorCode: "missing_mapping" });
    }

    let parsedMapping: unknown;
    try {
      parsedMapping = JSON.parse(mappingRaw);
    } catch {
      return respond({ error: "Invalid mapping JSON" }, 400, { errorCode: "invalid_mapping_json" });
    }

    if (!isColumnMapping(parsedMapping)) {
      return respond({ error: "Invalid mapping shape" }, 400, { errorCode: "invalid_mapping_shape" });
    }

    const contextWarnings: string[] = [];
    let projectContext: ProjectContext | undefined;
    if (typeof projectContextRaw === "string" && projectContextRaw.trim().length > 0) {
      try {
        const parsedContext = JSON.parse(projectContextRaw) as unknown;
        if (isProjectContext(parsedContext)) {
          projectContext = {
            project_name: parsedContext.project_name.trim(),
            process_type: parsedContext.process_type,
            ...(parsedContext.description && parsedContext.description.trim().length > 0
              ? { description: parsedContext.description.trim() }
              : {}),
          };
        } else {
          contextWarnings.push("Invalid project_context ignored.");
        }
      } catch {
        contextWarnings.push("Malformed project_context ignored.");
      }
    }

    const buffer = await file.arrayBuffer();
    const rawRows = await parseFirstSheetRows(buffer);

    const { rows, errors, warnings } = normalizeRows(rawRows, parsedMapping);
    warnings.push(...auth.warnings);
    warnings.push(...contextWarnings);

    const networkConfig = resolveIotaNetworkConfig({
      requestedNetwork,
      mainnetConfirmToken,
    });
    if (networkConfig.warning) {
      warnings.push(networkConfig.warning);
    }

    const issuer = "biosphere-rocks";
    const timestamp = new Date().toISOString();
    let evidence:
      | {
          photo_hash: string;
          photo_uri: string;
        }
      | undefined;

    if (photo instanceof File) {
      if (!process.env.PINATA_JWT) {
        return respond(
          { error: "PINATA_JWT is required when photo evidence is provided" },
          400,
          { errorCode: "missing_pinata_jwt" }
        );
      }

      try {
        const photoBytes = await photo.arrayBuffer();
        const photo_hash = createHash("sha256")
          .update(NodeBuffer.from(photoBytes))
          .digest("hex");
        const uploadedPhoto = await uploadFileToPinata(photo, photo.name || "evidence.jpg");
        evidence = {
          photo_hash,
          photo_uri: uploadedPhoto.uri,
        };
      } catch {
        return respond({ error: "Failed to upload photo evidence" }, 502, { errorCode: "photo_upload_failed" });
      }
    }

    const sortedRows =
      errors.length > 0
        ? []
        : [...rows].sort((a, b) => {
            return (
              a.date.localeCompare(b.date) ||
              a.type.localeCompare(b.type) ||
              a.value - b.value ||
              a.unit.localeCompare(b.unit)
            );
          });
    const totalUnits = computeTotalUnits(sortedRows);

    const canonicalObj = {
      adapter: "records",
      issuer,
      timestamp,
      ...(projectContext ? { project_context: projectContext } : {}),
      rows: sortedRows,
      metrics: {
        total_units: totalUnits,
      },
      ...(evidence ? { evidence } : {}),
    };

    const canonical_string = stableStringify(canonicalObj);
    const event_hash = sha256Hex(canonical_string);
    const stored = await storeBundle(canonicalObj);
    let uri = stored.uri;
    let txId: string | undefined;
    let txDigest: string | undefined;
    let objectId: string | null | undefined;
    let explorerTx: string | undefined;
    let explorerObject: string | undefined;
    let explorerPackage: string | undefined;
    let anchorError: string | undefined;
    let token:
      | {
          supply: number;
          txId: string;
          explorerTx: string;
        }
      | undefined;

    if (process.env.PINATA_JWT) {
      try {
        const firstBundle = await uploadJsonToPinata(
          {
            canonical: canonicalObj,
            event_hash,
            uri: stored.uri,
            metrics: {
              total_units: totalUnits,
            },
            ...(evidence ? { evidence } : {}),
          },
          "bundle.json"
        );
        uri = firstBundle.uri;

        // Best-effort second write so bundle.json includes the resolved bundle URI.
        try {
          await uploadJsonToPinata(
            {
              canonical: canonicalObj,
              event_hash,
              uri,
              metrics: {
                total_units: totalUnits,
              },
              ...(evidence ? { evidence } : {}),
            },
            "bundle.json"
          );
        } catch {
          // Ignore secondary write failures and keep primary URI.
        }
      } catch {
        // Keep existing local URI fallback for MVP resilience.
      }
    }

    const runtimeEnv = getRuntimeEnv();
    const hasIotaEnv = Boolean(networkConfig.rpcUrl) && runtimeEnv.hasIotaSigner;
    const anchorOnchain = runtimeEnv.anchorOnchain;
    const packageId = networkConfig.packageId ?? undefined;
    const iotaNetwork = networkConfig.network;

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
          explorerPackage = packageId ? `${networkConfig.explorer.objectBase}${packageId}` : undefined;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown anchor error";
          anchorError = message;
          warnings.push(`On-chain anchoring failed: ${message}`);
        }
      }
    }

    if (hasIotaEnv) {
      try {
        const shouldMint = process.env.IOTA_ENABLE_PROOF_UNITS_MINT === "1";
        if (shouldMint && totalUnits > 0) {
          const minted = await mintProofUnitsToken({
            supply: totalUnits,
            event_hash,
            uri,
          });
          token = {
            supply: totalUnits,
            txId: minted.txId,
            explorerTx: minted.explorerTx,
          };
        }
      } catch {
        // Keep response working even when token minting fails.
      }
    }

    const response: ProofResponse = {
      ok: true,
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
      ...(token ? { token } : {}),
      ...(evidence ? { evidence } : {}),
      ...(projectContext ? { project_context: projectContext } : {}),
      network: iotaNetwork,
    };

    const persisted = await persistProofBestEffort({
      source: "excel",
      rows_count: response.rows_count,
      total_units: response.metrics?.total_units ?? 0,
      event_hash: response.event_hash,
      canonical_string: response.canonical_string,
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
    safeLog("error", "Failed to generate proof bundle", {
      route: "/api/proof",
      error: error instanceof Error ? error.message : "unknown",
    });
    return respond({ error: "Failed to generate proof bundle" }, 500, { errorCode: "proof_route_exception" });
  }
}
