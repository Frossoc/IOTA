import type { ProofResponse } from "@/app/types/records";

type ProofSummaryCardProps = {
  proof: ProofResponse;
};

function buildTxUrl(txDigest: string, network?: "testnet" | "mainnet"): string {
  if (network === "mainnet") {
    return `https://explorer.iota.org/txblock/${txDigest}`;
  }
  return `https://explorer.iota.org/txblock/${txDigest}?network=${encodeURIComponent(network ?? "testnet")}`;
}

function buildObjectUrl(objectId: string, network?: "testnet" | "mainnet"): string {
  if (network === "mainnet") {
    return `https://explorer.iota.org/object/${objectId}`;
  }
  return `https://explorer.iota.org/object/${objectId}?network=${encodeURIComponent(network ?? "testnet")}`;
}

export default function ProofSummaryCard({ proof }: ProofSummaryCardProps) {
  const txUrl =
    proof.explorer?.tx ??
    ((proof.tx_digest ?? proof.txId) ? buildTxUrl(proof.tx_digest ?? proof.txId ?? "", proof.network) : null);
  const objectUrl =
    proof.explorer?.object ?? (proof.object_id ? buildObjectUrl(proof.object_id, proof.network) : null);

  return (
    <section
      style={{
        marginTop: 18,
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        background: "#fcfcfc",
        color: "#111827",
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
        Proof summary
      </h2>
      <p style={{ marginTop: 8, color: "#111827" }}>
        <strong>event_hash:</strong> <code style={{ color: "#111827" }}>{proof.event_hash}</code>
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>rows_count:</strong> {proof.rows_count}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>proof_units:</strong> {proof.metrics?.total_units ?? 0}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>uri:</strong> <code style={{ color: "#111827" }}>{proof.uri}</code>
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>issuer:</strong> {proof.issuer}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>timestamp:</strong> {proof.timestamp}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>network:</strong> {proof.network ?? "testnet"}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>proof_units_mode:</strong> {proof.proof_units_mode ?? "batch"}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>Transaction:</strong>{" "}
        {txUrl ? (
          <a href={txUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
            {proof.tx_digest ?? proof.txId ?? txUrl}
          </a>
        ) : (
          "Not available"
        )}
      </p>
      <p style={{ marginTop: 6, color: "#111827" }}>
        <strong>Proof Object:</strong>{" "}
        {objectUrl ? (
          <a href={objectUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
            {proof.object_id ?? objectUrl}
          </a>
        ) : (
          "Not available"
        )}
      </p>
      {proof.proof_units_mode === "merkle" ? (
        <>
          <p style={{ marginTop: 6, color: "#111827" }}>
            <strong>merkle_root:</strong> <code style={{ color: "#111827" }}>{proof.merkle?.root ?? "N/A"}</code>
          </p>
          <p style={{ marginTop: 6, color: "#111827" }}>
            <strong>merkle_leaf_count:</strong> {proof.merkle?.leaf_count ?? 0}
          </p>
        </>
      ) : null}
    </section>
  );
}
