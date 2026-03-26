import { NextResponse } from "next/server";
import { readProofById } from "@/app/lib/persistence/readProof";
import { getExplorerObjectUrl, getExplorerTxUrl } from "@/app/lib/iota/move";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const result = await readProofById(id);
  if (!result.ok) {
    if (result.error === "supabase_not_configured") {
      return NextResponse.json(
        { ok: false, error: "Persistence is not configured in this environment." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: "Proof lookup failed" }, { status: 500 });
  }

  if (!result.record) {
    return NextResponse.json({ ok: false, error: "Proof not found" }, { status: 404 });
  }

  const record = result.record;
  const hasEvidence = Boolean(record.evidence_photo_hash || record.evidence_photo_uri);
  const explorerTx = record.tx_digest ? getExplorerTxUrl(record.tx_digest) : null;
  const explorerObject = record.object_id ? getExplorerObjectUrl(record.object_id) : null;

  const payload = {
    ok: true,
    bundle_version: "1.0",
    proof_db_id: record.id,
    project: {
      project_name: record.project_name,
      process_type: record.process_type,
      description: record.description,
    },
    summary: {
      rows_count: record.rows_count,
      total_units: record.total_units,
      created_at: record.created_at,
      issuer: "biosphere-rocks",
    },
    integrity: {
      proof_units_mode: record.proof_units_mode,
      event_hash: record.event_hash,
      merkle_root: record.merkle_root,
      merkle_leaf_count: record.merkle_leaf_count,
      merkle_algorithm: record.merkle_algorithm,
      canonical_string: record.canonical_string,
      ipfs_uri: record.ipfs_uri,
      tx_digest: record.tx_digest,
      object_id: record.object_id,
    },
    evidence: hasEvidence
      ? {
          photo_hash: record.evidence_photo_hash,
          photo_uri: record.evidence_photo_uri,
        }
      : null,
    explorer: {
      tx: explorerTx,
      object: explorerObject,
    },
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="proof-bundle-${id}.json"`,
    },
  });
}
