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
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Proof summary</h2>
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
    </section>
  );
}
