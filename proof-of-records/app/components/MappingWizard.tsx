"use client";

import type { ColumnMapping } from "@/app/types/records";

type MappingWizardProps = {
  columns: string[];
  value: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
};

export default function MappingWizard({ columns, value, onChange }: MappingWizardProps) {
  function updateField(field: keyof ColumnMapping, fieldValue: string) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  const fields: Array<{ key: keyof ColumnMapping; label: string }> = [
    { key: "date", label: "Date" },
    { key: "type", label: "Type" },
    { key: "value", label: "Value" },
    { key: "unit", label: "Unit" },
  ];

  return (
    <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Column mapping</h2>
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        {fields.map((field) => (
          <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{field.label}</span>
            <select
              value={value[field.key]}
              onChange={(event) => updateField(field.key, event.target.value)}
              style={{ border: "1px solid #ccc", borderRadius: 8, padding: 8 }}
            >
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={`${field.key}_${column}`} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
