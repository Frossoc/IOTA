import type { FieldMapping, RawSpreadsheetRow } from "@/app/types/records";
import type { RecordRow } from "@/app/lib/excel/schema";

function getTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseIsoDate(value: unknown): string | null {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(normalized)) {
    return null;
  }

  return normalized;
}

function optionalCell(raw: RawSpreadsheetRow, key: string): string | undefined {
  const text = getTrimmedString(raw[key]);
  return text.length > 0 ? text : undefined;
}

export function normalizeRows(
  rawRows: RawSpreadsheetRow[],
  mapping: FieldMapping
): {
  rows: RecordRow[];
  errors: string[];
  warnings: string[];
} {
  const rows: RecordRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;

    const rawDate = raw[mapping.date];
    const rawType = raw[mapping.type];
    const rawValue = raw[mapping.value];
    const rawUnit = raw[mapping.unit];

    if (
      getTrimmedString(rawDate).length === 0 ||
      getTrimmedString(rawType).length === 0 ||
      getTrimmedString(rawUnit).length === 0 ||
      rawValue === undefined ||
      rawValue === null ||
      getTrimmedString(rawValue).length === 0
    ) {
      errors.push(`Row ${rowNumber}: Missing required field.`);
      return;
    }

    const date = parseIsoDate(rawDate);
    if (!date) {
      errors.push(`Row ${rowNumber}: Invalid date format.`);
      return;
    }

    const numericValue = parseNumeric(rawValue);
    if (numericValue === null) {
      errors.push(`Row ${rowNumber}: Value is not numeric.`);
      return;
    }

    if (numericValue < 0) {
      warnings.push(`Row ${rowNumber}: Negative value detected.`);
    }

    const normalizedRow: RecordRow = {
      date,
      type: getTrimmedString(rawType),
      value: numericValue,
      unit: getTrimmedString(rawUnit),
      site: optionalCell(raw, "site"),
      operator: optionalCell(raw, "operator"),
      notes: optionalCell(raw, "notes"),
      record_id: optionalCell(raw, "record_id"),
    };

    rows.push(normalizedRow);
  });

  return { rows, errors, warnings };
}
