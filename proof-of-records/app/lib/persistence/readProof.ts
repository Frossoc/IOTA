import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { safeLog } from "@/app/lib/server/logger";

export type StoredProofRecord = {
  id: string;
  canonical_string: string | null;
  project_name: string | null;
  process_type: string | null;
  description: string | null;
  proof_units_mode: string | null;
  rows_count: number;
  total_units: number;
  created_at: string | null;
  event_hash: string;
  merkle_root: string | null;
  merkle_leaf_count: number | null;
  merkle_algorithm: string | null;
  ipfs_uri: string | null;
  tx_digest: string | null;
  object_id: string | null;
  evidence_photo_hash: string | null;
  evidence_photo_uri: string | null;
};

export type ReadProofResult =
  | { ok: true; record: StoredProofRecord | null }
  | { ok: false; error: string };

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toNumber(value, 0);
}

function parseRecord(value: unknown): StoredProofRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.event_hash !== "string") {
    return null;
  }

  return {
    id: row.id,
    canonical_string: toStringOrNull(row.canonical_string),
    project_name: toStringOrNull(row.project_name),
    process_type: toStringOrNull(row.process_type),
    description: toStringOrNull(row.description),
    proof_units_mode: toStringOrNull(row.proof_units_mode),
    rows_count: toNumber(row.rows_count, 0),
    total_units: toNumber(row.total_units, 0),
    created_at: toStringOrNull(row.created_at),
    event_hash: row.event_hash,
    merkle_root: toStringOrNull(row.merkle_root),
    merkle_leaf_count: toNullableNumber(row.merkle_leaf_count),
    merkle_algorithm: toStringOrNull(row.merkle_algorithm),
    ipfs_uri: toStringOrNull(row.ipfs_uri),
    tx_digest: toStringOrNull(row.tx_digest),
    object_id: toStringOrNull(row.object_id),
    evidence_photo_hash: toStringOrNull(row.evidence_photo_hash),
    evidence_photo_uri: toStringOrNull(row.evidence_photo_uri),
  };
}

export async function readProofById(id: string): Promise<ReadProofResult> {
  try {
    const client = createSupabaseServerClient();
    if (!client) {
      return { ok: false, error: "supabase_not_configured" };
    }

    let data: unknown = null;
    let error: { message: string } | null = null;

    const primary = await client
      .from("proof_of_records")
      .select(
        "id,canonical_string,project_name,process_type,description,proof_units_mode,rows_count,total_units,created_at,event_hash,merkle_root,merkle_leaf_count,merkle_algorithm,ipfs_uri,tx_digest,object_id,evidence_photo_hash,evidence_photo_uri"
      )
      .eq("id", id)
      .limit(1);
    data = primary.data;
    error = primary.error;

    if (error) {
      const fallback = await client
        .from("proof_of_records")
        .select(
          "id,canonical_string,project_name,process_type,description,rows_count,total_units,created_at,event_hash,ipfs_uri,tx_digest,object_id,evidence_photo_hash,evidence_photo_uri"
        )
        .eq("id", id)
        .limit(1);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      safeLog("warn", "readProofById failed", { message: error.message });
      return { ok: false, error: "supabase_read_failed" };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return { ok: true, record: null };
    }

    return {
      ok: true,
      record: parseRecord(data[0]),
    };
  } catch (error) {
    safeLog("warn", "readProofById exception", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "supabase_read_exception" };
  }
}
