import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>Proof of Records</h1>
      <p style={{ marginTop: 8 }}>
        Turn spreadsheets into canonical JSON proofs with deterministic SHA-256 hashes.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
        <Link href="/upload" style={{ fontWeight: 700 }}>
          Go to Upload →
        </Link>
        <Link href="/verify" style={{ fontWeight: 700 }}>
          Go to Verify →
        </Link>
      </div>
    </main>
  );
}
