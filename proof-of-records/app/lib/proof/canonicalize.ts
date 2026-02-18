import type { RecordRow } from "@/app/lib/excel/schema";

export type CanonicalPayload = {
  version: "1";
  rows: RecordRow[];
};

function normalizeOptional(value: string | undefined): string {
  return value ?? "";
}

function compareRows(a: RecordRow, b: RecordRow): number {
  return (
    a.date.localeCompare(b.date) ||
    a.type.localeCompare(b.type) ||
    a.unit.localeCompare(b.unit) ||
    a.value - b.value ||
    normalizeOptional(a.site).localeCompare(normalizeOptional(b.site)) ||
    normalizeOptional(a.operator).localeCompare(normalizeOptional(b.operator)) ||
    normalizeOptional(a.record_id).localeCompare(normalizeOptional(b.record_id)) ||
    normalizeOptional(a.notes).localeCompare(normalizeOptional(b.notes))
  );
}

export function canonicalizeRecords(rows: RecordRow[]): CanonicalPayload {
  return {
    version: "1",
    rows: [...rows].sort(compareRows),
  };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const serialized = entries
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(",");
    return `{${serialized}}`;
  }

  return JSON.stringify(value) ?? "null";
}
