"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { findProcessTemplate } from "@/app/lib/templates/processTemplates";
import AskStrategIADashboard from "./AskStrategIADashboard";

export type DashboardProofRow = {
  id: string;
  project_name: string | null;
  process_type: string | null;
  rows_count: number;
  total_units: number;
  event_hash: string;
  created_at: string | null;
};

type DashboardListProps = {
  proofs: DashboardProofRow[];
};

function formatDate(value: string | null): string {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function shortenHash(value: string): string {
  if (value.length <= 18) {
    return value;
  }
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export default function DashboardList({ proofs }: DashboardListProps) {
  const [search, setSearch] = useState("");
  const [processType, setProcessType] = useState("all");

  const processTypes = useMemo(() => {
    const set = new Set<string>();
    for (const proof of proofs) {
      if (proof.process_type && proof.process_type.trim().length > 0) {
        set.add(proof.process_type);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [proofs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return proofs.filter((proof) => {
      const name = (proof.project_name ?? "").toLowerCase();
      const matchesSearch = query.length === 0 || name.includes(query);
      const matchesType = processType === "all" || proof.process_type === processType;
      return matchesSearch && matchesType;
    });
  }, [proofs, search, processType]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: "1px solid #1f2937",
          borderRadius: 12,
          background: "#0b0b0b",
          padding: 14,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ color: "#d1d5db", fontSize: 13 }}>Search project</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Project name..."
            style={{
              border: "1px solid #374151",
              borderRadius: 8,
              background: "#111827",
              color: "#ffffff",
              padding: "8px 10px",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ color: "#d1d5db", fontSize: 13 }}>Process type</span>
          <select
            value={processType}
            onChange={(event) => setProcessType(event.target.value)}
            style={{
              border: "1px solid #374151",
              borderRadius: 8,
              background: "#111827",
              color: "#ffffff",
              padding: "8px 10px",
            }}
          >
            <option value="all">All</option>
            {processTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: 12,
            background: "#0b0b0b",
            padding: 20,
            color: "#9ca3af",
          }}
        >
          No proofs found yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #1f2937", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead style={{ background: "#111827" }}>
              <tr>
                <th style={thStyle}>Project Name</th>
                <th style={thStyle}>Process Type</th>
                <th style={thStyle}>Rows</th>
                <th style={thStyle}>Total Units</th>
                <th style={thStyle}>Event Hash</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((proof) => (
                <tr key={proof.id} style={{ borderTop: "1px solid #1f2937", background: "#0b0b0b" }}>
                  <td style={tdStyle}>{proof.project_name ?? "N/A"}</td>
                  <td style={tdStyle}>
                    <div>{proof.process_type ?? "N/A"}</div>
                    {proof.process_type && findProcessTemplate(proof.process_type) ? (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          borderRadius: 999,
                          border: "1px solid #374151",
                          color: "#9ca3af",
                          fontSize: 11,
                          padding: "1px 8px",
                        }}
                      >
                        Template
                      </span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{proof.rows_count}</td>
                  <td style={tdStyle}>{proof.total_units}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace" }} title={proof.event_hash}>
                    {shortenHash(proof.event_hash)}
                  </td>
                  <td style={tdStyle}>{formatDate(proof.created_at)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        border: "1px solid #14532d",
                        borderRadius: 999,
                        color: "#86efac",
                        background: "#052e16",
                        padding: "2px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Anchored
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/proof/${proof.id}`} style={actionStyle}>
                        View Proof
                      </Link>
                      <Link href={`/api/proof-bundle?id=${encodeURIComponent(proof.id)}`} style={actionStyle}>
                        Bundle
                      </Link>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 11, marginTop: 6 }}>
                      PDF available on proof page.
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AskStrategIADashboard />
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  color: "#d1d5db",
  fontSize: 12,
  padding: "10px 12px",
  letterSpacing: 0.3,
  fontWeight: 600,
};

const tdStyle: CSSProperties = {
  color: "#f3f4f6",
  fontSize: 13,
  padding: "10px 12px",
  verticalAlign: "top",
};

const actionStyle: CSSProperties = {
  display: "inline-block",
  border: "1px solid #4b5563",
  background: "#e5e7eb",
  color: "#000000",
  borderRadius: 8,
  padding: "5px 10px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 12,
};
