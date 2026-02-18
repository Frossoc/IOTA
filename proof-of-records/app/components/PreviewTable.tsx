import { useMemo } from "react";

type PreviewTableProps = {
  rows: Record<string, unknown>[];
  maxRows?: number;
};

function toDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function PreviewTable({ rows, maxRows = 10 }: PreviewTableProps) {
  const visibleRows = rows.slice(0, maxRows);

  const columns = useMemo(
    () =>
      Array.from(
        visibleRows.reduce<Set<string>>((acc, row) => {
          Object.keys(row).forEach((key) => acc.add(key));
          return acc;
        }, new Set<string>())
      ),
    [visibleRows]
  );

  if (visibleRows.length === 0) {
    return <p style={{ marginTop: 8, color: "#666" }}>No rows to display.</p>;
  }

  return (
    <div style={{ marginTop: 8, overflowX: "auto", border: "1px solid #ddd", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid #ddd",
                  background: "#fafafa",
                  fontSize: 13,
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={`row_${rowIndex}`}>
              {columns.map((column) => (
                <td
                  key={`${rowIndex}_${column}`}
                  style={{ padding: "8px 10px", borderBottom: "1px solid #eee", fontSize: 13 }}
                >
                  {toDisplay(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
