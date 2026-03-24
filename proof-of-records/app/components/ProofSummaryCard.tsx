import type { ProofResponse } from "@/app/types/records";

type ProofSummaryCardProps = {
  proof: ProofResponse;
};

export default function ProofSummaryCard({ proof }: ProofSummaryCardProps) {
  return (
    <section
      style={{
        marginTop: 18,
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        background: "#fcfcfc",
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700 }} className="text-xl font-semibold text-white tracking-wide">
        Proof summary
      </h2>
      <p style={{ marginTop: 8 }}>
        <strong>event_hash:</strong> <code>{proof.event_hash}</code>
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>rows_count:</strong> {proof.rows_count}
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>proof_units:</strong> {proof.metrics?.total_units ?? 0}
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>uri:</strong> <code>{proof.uri}</code>
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>issuer:</strong> {proof.issuer}
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>timestamp:</strong> {proof.timestamp}
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>network:</strong> {proof.network ?? "testnet"}
      </p>
      <p style={{ marginTop: 6 }}>
        <strong>proof_units_mode:</strong> {proof.proof_units_mode ?? "batch"}
      </p>
      {proof.proof_units_mode === "merkle" ? (
        <>
          <p style={{ marginTop: 6 }}>
            <strong>merkle_root:</strong> <code>{proof.merkle?.root ?? "N/A"}</code>
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>merkle_leaf_count:</strong> {proof.merkle?.leaf_count ?? 0}
          </p>
        </>
      ) : null}
    </section>
  );
}
