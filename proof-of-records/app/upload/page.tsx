"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnMapping, ParseApiResponse, ParseResponse, ProofResponse } from "@/app/types/records";
import UploadDropzone from "@/app/components/UploadDropzone";
import MappingWizard from "@/app/components/MappingWizard";
import PreviewTable from "@/app/components/PreviewTable";
import ProofSummaryCard from "@/app/components/ProofSummaryCard";

const EMPTY_MAPPING: ColumnMapping = {
  date: "",
  type: "",
  value: "",
  unit: "",
};
const AUTO_NAVIGATE_AFTER_PROOF = false;

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mappingReady = useMemo(
    () =>
      mapping.date.trim().length > 0 &&
      mapping.type.trim().length > 0 &&
      mapping.value.trim().length > 0 &&
      mapping.unit.trim().length > 0,
    [mapping]
  );

  async function parseFile(nextFile: File) {
    setFile(nextFile);
    setParseLoading(true);
    setErrorMessage(null);
    setProof(null);
    setParse(null);
    setMapping(EMPTY_MAPPING);

    try {
      const formData = new FormData();
      formData.append("file", nextFile);

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ParseApiResponse;

      if (!response.ok || data.error) {
        setErrorMessage(data.error ?? "Failed to parse spreadsheet.");
        setParse(null);
        return;
      }

      setParse(data);
      setMapping({
        date: data.columns[0] ?? "",
        type: data.columns[1] ?? "",
        value: data.columns[2] ?? "",
        unit: data.columns[3] ?? "",
      });
    } catch {
      setErrorMessage("Failed to parse spreadsheet.");
      setParse(null);
    } finally {
      setParseLoading(false);
    }
  }

  async function onGenerateProof() {
    if (!file || !parse || !mappingReady) {
      return;
    }

    setProofLoading(true);
    setErrorMessage(null);
    setProof(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));

      const response = await fetch("/api/proof", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ProofResponse | { error?: string };

      if (!response.ok || !("ok" in data && data.ok)) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to generate proof bundle.";
        setErrorMessage(message);
        return;
      }

      setProof(data);
      localStorage.setItem(
        "por:last_proof",
        JSON.stringify({
          event_hash: data.event_hash,
          canonical_string: data.canonical_string,
          uri: data.uri,
          ...(data.txId ? { txId: data.txId } : {}),
          timestamp: data.timestamp,
        })
      );
      if (AUTO_NAVIGATE_AFTER_PROOF) {
        const params = new URLSearchParams({
          expected_event_hash: data.event_hash,
          ...(data.txId ? { txId: data.txId } : {}),
        });
        router.push(`/verify?${params.toString()}`);
      }

      if (data.errors.length > 0) {
        setErrorMessage(
          `Proof generated with ${data.errors.length} normalization error(s). Review details below.`
        );
      } else if (data.warnings.length > 0) {
        setErrorMessage(
          `Proof generated with ${data.warnings.length} warning(s). Review details below.`
        );
      }
    } catch {
      setErrorMessage("Failed to generate proof bundle.");
    } finally {
      setProofLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Proof of Records: Upload</h1>
      <p style={{ marginTop: 8 }}>
        Upload an Excel/CSV file, map required fields, and build a verifiable proof bundle.
      </p>

      <UploadDropzone onFileSelected={parseFile} />
      {file ? <p style={{ marginTop: 10, color: "#555" }}>Selected: {file.name}</p> : null}
      {parseLoading ? <p style={{ marginTop: 10, color: "#555" }}>Parsing...</p> : null}

      {errorMessage ? <p style={{ marginTop: 14, color: "crimson" }}>{errorMessage}</p> : null}

      {parse ? (
        <>
          <p style={{ marginTop: 14, color: "#555" }}>
            Detected {parse.columns.length} columns, {parse.totalRows} data rows.
          </p>

          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Raw preview</h2>
            <PreviewTable rows={parse.preview} maxRows={10} />
          </section>

          <MappingWizard columns={parse.columns} value={mapping} onChange={setMapping} />

          <button
            onClick={onGenerateProof}
            disabled={!mappingReady || proofLoading}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              fontWeight: 600,
              background: "#fff",
              cursor: !mappingReady || proofLoading ? "not-allowed" : "pointer",
            }}
          >
            {proofLoading ? "Generating proof..." : "Generate Proof"}
          </button>
        </>
      ) : null}

      {proof ? (
        <>
          <ProofSummaryCard proof={proof} />

          <div style={{ marginTop: 10 }}>
            <Link
              href={`/verify?${new URLSearchParams({
                expected_event_hash: proof.event_hash,
                ...(proof.txId ? { txId: proof.txId } : {}),
              }).toString()}`}
              style={{ fontWeight: 700 }}
            >
              Go to verify →
            </Link>
          </div>

          {proof.errors.length > 0 ? (
            <section style={{ marginTop: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#a10" }}>Errors</h3>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {proof.errors.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {proof.warnings.length > 0 ? (
            <section style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#8a6a00" }}>Warnings</h3>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {proof.warnings.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
