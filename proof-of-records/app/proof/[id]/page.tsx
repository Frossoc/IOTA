import Link from "next/link";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import { resolveEvidenceUrl } from "@/app/lib/storage/gateway";
import CopyButton from "./CopyButton";

type VerifyProofProject = {
  project_name: string | null;
  process_type: string | null;
  description: string | null;
};

type VerifyProofSummary = {
  rows_count: number;
  total_units: number;
  created_at: string | null;
  issuer: string | null;
};

type VerifyProofIntegrity = {
  proof_units_mode: string | null;
  event_hash: string | null;
  merkle_root: string | null;
  merkle_leaf_count: number | null;
  merkle_algorithm: string | null;
  ipfs_uri: string | null;
  tx_digest: string | null;
  object_id: string | null;
};

type VerifyProofEvidence = {
  photo_hash: string | null;
  photo_uri: string | null;
} | null;

type VerifyProofExplorer = {
  tx: string | null;
  object: string | null;
};

type VerifyProofResponse =
  | {
      ok: true;
      proof_db_id: string;
      project: VerifyProofProject;
      summary: VerifyProofSummary;
      integrity: VerifyProofIntegrity;
      evidence: VerifyProofEvidence;
      explorer: VerifyProofExplorer;
    }
  | {
      ok: false;
      error: string;
    };

function labelStyle(): CSSProperties {
  return {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 6,
  };
}

function valueStyle(): CSSProperties {
  return {
    color: "#ffffff",
    fontSize: 14,
    wordBreak: "break-all",
  };
}

function sectionStyle(): CSSProperties {
  return {
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
    background: "#0b0b0b",
  };
}

async function fetchProof(id: string): Promise<{
  status: number;
  body: VerifyProofResponse | null;
}> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const fallbackBase = host ? `${protocol}://${host}` : "http://localhost:3000";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || fallbackBase;
  const response = await fetch(
    `${baseUrl}/api/verify-proof?id=${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );

  try {
    const body = (await response.json()) as VerifyProofResponse;
    return { status: response.status, body };
  } catch {
    return { status: response.status, body: null };
  }
}

export default async function ProofPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchProof(id);

  if (result.status === 404) {
    return (
      <main
        style={{ minHeight: "100vh", background: "#050505", color: "#ffffff", padding: "32px 16px" }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", ...sectionStyle() }}>
          <p style={{ color: "#93c5fd", marginBottom: 12, fontSize: 12, letterSpacing: 0.7 }}>
            PUBLIC VERIFICATION RECORD
          </p>
          <h1 style={{ margin: 0, fontSize: 28, marginBottom: 12 }}>Proof Not Found</h1>
          <p style={{ color: "#d1d5db", marginTop: 0 }}>
            No stored proof was found for this identifier.
          </p>
        </div>
      </main>
    );
  }

  if (!result.body || !result.body.ok) {
    return (
      <main
        style={{ minHeight: "100vh", background: "#050505", color: "#ffffff", padding: "32px 16px" }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", ...sectionStyle() }}>
          <p style={{ color: "#93c5fd", marginBottom: 12, fontSize: 12, letterSpacing: 0.7 }}>
            PUBLIC VERIFICATION RECORD
          </p>
          <h1 style={{ margin: 0, fontSize: 28, marginBottom: 12 }}>Verification Unavailable</h1>
          <p style={{ color: "#d1d5db", marginTop: 0 }}>
            An unexpected error occurred while loading this proof.
          </p>
        </div>
      </main>
    );
  }

  const proof = result.body;
  const evidenceGatewayUrl = resolveEvidenceUrl(proof.evidence?.photo_uri);

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#ffffff", padding: "32px 16px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={sectionStyle()}>
          <p style={{ color: "#93c5fd", marginBottom: 12, fontSize: 12, letterSpacing: 0.7 }}>
            PUBLIC VERIFICATION RECORD
          </p>
          <h1 style={{ margin: 0, fontSize: 30, marginBottom: 8 }}>Proof of Records</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ color: "#9ca3af", fontSize: 13 }}>Proof ID</span>
            <span style={valueStyle()}>{proof.proof_db_id}</span>
            <CopyButton value={proof.proof_db_id} label="Proof ID" />
          </div>
          <div style={{ marginTop: 14 }}>
            <Link
              href={`/api/proof-bundle?id=${encodeURIComponent(proof.proof_db_id)}`}
              style={{
                display: "inline-block",
                borderRadius: 10,
                border: "1px solid #4b5563",
                background: "#e5e7eb",
                color: "#000000",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Download Proof Bundle
            </Link>
          </div>
        </div>

        <section style={sectionStyle()}>
          <h2 style={{ marginTop: 0 }}>Project</h2>
          <p style={labelStyle()}>Project Name</p>
          <p style={valueStyle()}>{proof.project.project_name ?? "N/A"}</p>
          <p style={labelStyle()}>Process Type</p>
          <p style={valueStyle()}>{proof.project.process_type ?? "N/A"}</p>
          <p style={labelStyle()}>Description</p>
          <p style={valueStyle()}>{proof.project.description ?? "N/A"}</p>
        </section>

        <section style={sectionStyle()}>
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          <p style={labelStyle()}>Records Secured</p>
          <p style={valueStyle()}>{proof.summary.rows_count}</p>
          <p style={labelStyle()}>Total Units</p>
          <p style={valueStyle()}>{proof.summary.total_units}</p>
          <p style={labelStyle()}>Created At</p>
          <p style={valueStyle()}>{proof.summary.created_at ?? "N/A"}</p>
        </section>

        <section style={sectionStyle()}>
          <h2 style={{ marginTop: 0 }}>Integrity</h2>
          <p style={labelStyle()}>Event Hash</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ ...valueStyle(), margin: 0 }}>{proof.integrity.event_hash ?? "N/A"}</p>
            {proof.integrity.event_hash ? (
              <CopyButton value={proof.integrity.event_hash} label="Event Hash" />
            ) : null}
          </div>
          <p style={labelStyle()}>Proof Units Mode</p>
          <p style={valueStyle()}>{proof.integrity.proof_units_mode ?? "batch"}</p>
          {proof.integrity.proof_units_mode === "merkle" ? (
            <>
              <p style={labelStyle()}>Merkle Root</p>
              <p style={valueStyle()}>{proof.integrity.merkle_root ?? "N/A"}</p>
              <p style={labelStyle()}>Leaf Count</p>
              <p style={valueStyle()}>{proof.integrity.merkle_leaf_count ?? "N/A"}</p>
            </>
          ) : null}
          <p style={labelStyle()}>IPFS URI</p>
          <p style={valueStyle()}>{proof.integrity.ipfs_uri ?? "N/A"}</p>
          <p style={labelStyle()}>Tx Digest</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ ...valueStyle(), margin: 0 }}>{proof.integrity.tx_digest ?? "N/A"}</p>
            {proof.integrity.tx_digest ? (
              <CopyButton value={proof.integrity.tx_digest} label="Tx Digest" />
            ) : null}
          </div>
          <p style={labelStyle()}>Object ID</p>
          <p style={valueStyle()}>{proof.integrity.object_id ?? "N/A"}</p>
        </section>

        <section style={sectionStyle()}>
          <h2 style={{ marginTop: 0 }}>Evidence</h2>
          {proof.evidence ? (
            <>
              <p style={labelStyle()}>Photo Hash</p>
              <p style={valueStyle()}>{proof.evidence.photo_hash ?? "N/A"}</p>
              <p style={labelStyle()}>Photo URI</p>
              <p style={valueStyle()}>{proof.evidence.photo_uri ?? "N/A"}</p>
              {evidenceGatewayUrl ? (
                <Link
                  href={evidenceGatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#93c5fd", textDecoration: "underline", fontSize: 14 }}
                >
                  Open Evidence
                </Link>
              ) : null}
            </>
          ) : (
            <p style={{ ...valueStyle(), marginTop: 4 }}>No evidence attached</p>
          )}
        </section>

        <section style={sectionStyle()}>
          <h2 style={{ marginTop: 0 }}>Explorer Links</h2>
          {proof.explorer.tx ? (
            <Link
              href={proof.explorer.tx}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#93c5fd", textDecoration: "underline", display: "inline-block", marginRight: 16 }}
            >
              Transaction
            </Link>
          ) : (
            <span style={{ color: "#6b7280", marginRight: 16 }}>Transaction unavailable</span>
          )}
          {proof.explorer.object ? (
            <Link
              href={proof.explorer.object}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#93c5fd", textDecoration: "underline", display: "inline-block" }}
            >
              Proof Object
            </Link>
          ) : (
            <span style={{ color: "#6b7280" }}>Object unavailable</span>
          )}
        </section>

        <footer style={{ color: "#6b7280", fontSize: 12, textAlign: "center", padding: "4px 0 16px" }}>
          Powered by Biosphere Integrity Infrastructure
        </footer>
      </div>
    </main>
  );
}
