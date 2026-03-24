import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { safeLog } from "@/app/lib/server/logger";
import type { ProjectContext } from "@/app/types/records";

export type PersistProofPayload = {
  source: "excel" | "json";
  proof_units_mode?: "batch" | "merkle";
  rows_count: number;
  total_units: number;
  event_hash: string;
  canonical_string: string;
  merkle?: {
    root: string;
    leaf_count: number;
    algorithm: string;
  };
  uri: string;
  issuer: string;
  timestamp: string;
  tx_digest?: string;
  object_id?: string | null;
  explorer?: {
    tx?: string;
    object?: string;
    package?: string;
  };
  evidence?: {
    photo_hash: string;
    photo_uri: string;
  };
  project_context?: ProjectContext;
  warnings: string[];
  errors: string[];
};

export type PersistProofResult =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      error: string;
    };

type ProofInsertRow = {
  event_hash: string;
  canonical_string: string;
  project_name?: string;
  process_type?: string;
  description?: string;
  proof_units_mode?: string;
  rows_count: number;
  total_units: number;
  ipfs_uri: string;
  merkle_root: string | null;
  merkle_leaf_count: number | null;
  merkle_algorithm: string | null;
  evidence_photo_hash: string | null;
  evidence_photo_uri: string | null;
  tx_digest?: string;
  object_id?: string | null;
};

type LegacyProofInsertRow = Omit<
  ProofInsertRow,
  "proof_units_mode" | "merkle_root" | "merkle_leaf_count" | "merkle_algorithm"
>;

function toInsertRow(payload: PersistProofPayload): ProofInsertRow {
  return {
    event_hash: payload.event_hash,
    canonical_string: payload.canonical_string,
    ...(payload.project_context?.project_name
      ? { project_name: payload.project_context.project_name }
      : {}),
    ...(payload.project_context?.process_type
      ? { process_type: payload.project_context.process_type }
      : {}),
    ...(payload.project_context?.description
      ? { description: payload.project_context.description }
      : {}),
    ...(payload.proof_units_mode ? { proof_units_mode: payload.proof_units_mode } : {}),
    rows_count: payload.rows_count,
    total_units: payload.total_units,
    ipfs_uri: payload.uri,
    merkle_root: payload.merkle?.root ?? null,
    merkle_leaf_count: payload.merkle?.leaf_count ?? null,
    merkle_algorithm: payload.merkle?.algorithm ?? null,
    evidence_photo_hash: payload.evidence?.photo_hash ?? null,
    evidence_photo_uri: payload.evidence?.photo_uri ?? null,
    ...(payload.tx_digest ? { tx_digest: payload.tx_digest } : {}),
    ...(payload.object_id !== undefined ? { object_id: payload.object_id } : {}),
  };
}

function parseInsertedId(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const first = value[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }

  const candidate = first as Record<string, unknown>;
  return typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : null;
}

function toLegacyInsertRow(row: ProofInsertRow): LegacyProofInsertRow {
  return {
    event_hash: row.event_hash,
    canonical_string: row.canonical_string,
    ...(row.project_name ? { project_name: row.project_name } : {}),
    ...(row.process_type ? { process_type: row.process_type } : {}),
    ...(row.description ? { description: row.description } : {}),
    rows_count: row.rows_count,
    total_units: row.total_units,
    ipfs_uri: row.ipfs_uri,
    evidence_photo_hash: row.evidence_photo_hash,
    evidence_photo_uri: row.evidence_photo_uri,
    ...(row.tx_digest ? { tx_digest: row.tx_digest } : {}),
    ...(row.object_id !== undefined ? { object_id: row.object_id } : {}),
  };
}

export async function persistProofBestEffort(payload: PersistProofPayload): Promise<PersistProofResult> {
  try {
    const client = createSupabaseServerClient();
    if (!client) {
      return { ok: false, error: "supabase_not_configured" };
    }

    const row = toInsertRow(payload);
    let { data, error } = await client
      .from("proof_of_records")
      .insert(row)
      .select("id")
      .limit(1);

    if (error && payload.proof_units_mode === "merkle") {
      const legacyRow = toLegacyInsertRow(row);
      const fallback = await client
        .from("proof_of_records")
        .insert(legacyRow)
        .select("id")
        .limit(1);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      safeLog("warn", "Supabase persistence failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return { ok: false, error: "supabase_insert_failed" };
    }

    const id = parseInsertedId(data);
    if (!id) {
      return { ok: false, error: "supabase_insert_missing_id" };
    }

    return { ok: true, id };
  } catch (error) {
    safeLog("warn", "Supabase persistence exception", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "supabase_exception" };
  }
}
