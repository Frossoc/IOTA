import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import DashboardList, { type DashboardProofRow } from "./DashboardList";
import DashboardShell from "./DashboardShell";

export const runtime = "nodejs";

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function parseProofRow(value: unknown): DashboardProofRow | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.event_hash !== "string") {
    return null;
  }

  return {
    id: row.id,
    project_name: typeof row.project_name === "string" ? row.project_name : null,
    process_type: typeof row.process_type === "string" ? row.process_type : null,
    rows_count: toNumber(row.rows_count),
    total_units: toNumber(row.total_units),
    event_hash: row.event_hash,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

async function loadProofs(): Promise<{ proofs: DashboardProofRow[]; error: string | null }> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      proofs: [],
      error: "Persistence is not configured in this environment. The dashboard remains available, but stored proofs will only appear when Supabase credentials are provided.",
    };
  }

  const { data, error } = await client
    .from("proof_of_records")
    .select("id,project_name,process_type,rows_count,total_units,event_hash,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { proofs: [], error: "Failed to load proofs." };
  }

  if (!Array.isArray(data)) {
    return { proofs: [], error: null };
  }

  const parsed = data
    .map(parseProofRow)
    .filter((row): row is DashboardProofRow => row !== null);

  return { proofs: parsed, error: null };
}

export default async function DashboardPage() {
  const { proofs, error } = await loadProofs();

  return (
    <DashboardShell>
        <section
          style={{
            border: "1px solid #1f2937",
            borderRadius: 14,
            background: "#0b0b0b",
            padding: 18,
          }}
        >
          <p style={{ color: "#93c5fd", fontSize: 12, letterSpacing: 0.7, margin: 0 }}>CLIENT DASHBOARD</p>
          <h1 style={{ margin: "8px 0 0 0", fontSize: 30 }}>Proof Records</h1>
          <p style={{ color: "#9ca3af", margin: "8px 0 0 0", fontSize: 14 }}>
            Latest anchored proofs with quick access to public verification and bundle export.
          </p>
        </section>

        {error ? (
          <section
            style={{
              border: "1px solid #7f1d1d",
              borderRadius: 12,
              background: "#1f0a0a",
              color: "#fecaca",
              padding: 14,
            }}
          >
            {error}
          </section>
        ) : null}

        <DashboardList proofs={proofs} />
    </DashboardShell>
  );
}
