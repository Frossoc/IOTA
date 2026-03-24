"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ColumnMapping,
  ParseApiResponse,
  ParseResponse,
  ProcessType,
  ProofResponse,
  VerifyResponse,
} from "@/app/types/records";
import UploadDropzone from "@/app/components/UploadDropzone";
import MappingWizard from "@/app/components/MappingWizard";
import PreviewTable from "@/app/components/PreviewTable";
import ProofSummaryCard from "@/app/components/ProofSummaryCard";
import AskStrategIA from "./AskStrategIA";
import { findProcessTemplate } from "@/app/lib/templates/processTemplates";

const EMPTY_MAPPING: ColumnMapping = {
  date: "",
  type: "",
  value: "",
  unit: "",
};

const PROCESS_OPTIONS: ProcessType[] = [
  "Waste traceability",
  "ESG reporting",
  "Supply chain event",
  "Compliance logs",
  "Media / news integrity",
  "Supply chain",
  "Other",
];

type DashboardTab = "create" | "verify" | "summary" | "technical" | "integrations";
type NetworkChoice = "testnet" | "mainnet";
type ProofUnitsChoice = "batch" | "merkle";

function parseDashboardTab(value: string | null): DashboardTab | null {
  if (
    value === "create" ||
    value === "verify" ||
    value === "summary" ||
    value === "technical" ||
    value === "integrations"
  ) {
    return value;
  }

  return null;
}

function extractTxDigest(value: ProofResponse | null): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.tx_digest && value.tx_digest.trim().length > 0) {
    return value.tx_digest;
  }
  if (value.txId && value.txId.trim().length > 0) {
    return value.txId;
  }
  if (value.explorer?.tx) {
    const match = value.explorer.tx.match(/\/(?:transaction|txblock)\/([^/?#]+)/i);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

function buildTxBlockUrl(txDigest: string, network = "testnet"): string {
  const net = network.trim();
  if (net === "mainnet") {
    return `https://explorer.iota.org/txblock/${txDigest}`;
  }
  return `https://explorer.iota.org/?network=${encodeURIComponent(net)}/txblock/${txDigest}`;
}

function toIpfsGatewayUrl(ipfsUri: string): string | null {
  const trimmed = ipfsUri.trim();
  if (!trimmed.startsWith("ipfs://")) {
    return null;
  }

  const path = trimmed.slice("ipfs://".length).replace(/^\/+/, "");
  if (!path) {
    return null;
  }

  const configuredGateway = process.env.NEXT_PUBLIC_GATEWAY_URL?.trim();
  const base = configuredGateway && configuredGateway.length > 0 ? configuredGateway : "https://ipfs.io";
  const normalizedBase = base.replace(/\/+$/, "");

  return `${normalizedBase}/ipfs/${path}`;
}

export default function UploadPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>("create");

  const [projectName, setProjectName] = useState("");
  const [processType, setProcessType] = useState<ProcessType>("Waste traceability");
  const [description, setDescription] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkChoice>("testnet");
  const [mainnetConfirmInput, setMainnetConfirmInput] = useState("");
  const [proofUnitsMode, setProofUnitsMode] = useState<ProofUnitsChoice>("batch");

  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyCanonicalString, setVerifyCanonicalString] = useState("");
  const [verifyExpectedHash, setVerifyExpectedHash] = useState("");
  const [verifyObjectId, setVerifyObjectId] = useState("");
  const [verifyTxDigest, setVerifyTxDigest] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const [proofRaw, setProofRaw] = useState<Record<string, unknown> | null>(null);
  const [verifyRaw, setVerifyRaw] = useState<Record<string, unknown> | null>(null);

  const mappingReady = useMemo(
    () =>
      mapping.date.trim().length > 0 &&
      mapping.type.trim().length > 0 &&
      mapping.value.trim().length > 0 &&
      mapping.unit.trim().length > 0,
    [mapping]
  );

  const projectReady = projectName.trim().length > 0;
  const selectedTemplate = findProcessTemplate(processType);
  const mainnetUiConfirmed =
    selectedNetwork !== "mainnet" || mainnetConfirmInput.trim().toUpperCase() === "MAINNET";

  useEffect(() => {
    const nextTab = parseDashboardTab(searchParams.get("tab"));
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

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
    if (!file || !parse || !mappingReady || !projectReady) {
      setErrorMessage("Project Name and required mappings are mandatory.");
      return;
    }

    setProofLoading(true);
    setErrorMessage(null);
    setProof(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append(
        "project_context",
        JSON.stringify({
          project_name: projectName.trim(),
          process_type: processType,
          description: description.trim(),
        })
      );
      if (photo) {
        formData.append("photo", photo);
      }
      if (selectedNetwork === "mainnet" && mainnetUiConfirmed) {
        formData.append("network", "mainnet");
        formData.append("mainnet_confirm_token", mainnetConfirmInput.trim());
      }
      if (proofUnitsMode === "merkle") {
        formData.append("proof_units_mode", "merkle");
      }

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
      setProofRaw(data as unknown as Record<string, unknown>);
      setVerifyCanonicalString(data.canonical_string);
      setVerifyExpectedHash(data.event_hash);
      setVerifyObjectId(data.object_id ?? "");
      setVerifyTxDigest(data.tx_digest ?? data.txId ?? "");
      localStorage.setItem(
        "por:last_proof",
        JSON.stringify({
          event_hash: data.event_hash,
          canonical_string: data.canonical_string,
          uri: data.uri,
          ...(data.txId ? { txId: data.txId } : {}),
          ...(data.tx_digest ? { tx_digest: data.tx_digest } : {}),
          ...(data.object_id ? { object_id: data.object_id } : {}),
          timestamp: data.timestamp,
        })
      );

      if (data.errors.length > 0) {
        setErrorMessage(
          `Proof generated with ${data.errors.length} normalization error(s). Review details below.`
        );
      } else if (data.warnings.length > 0) {
        setErrorMessage(
          `Proof generated with ${data.warnings.length} warning(s). Review details below.`
        );
      }

      setActiveTab("summary");
    } catch {
      setErrorMessage("Failed to generate proof bundle.");
    } finally {
      setProofLoading(false);
    }
  }

  async function onVerify() {
    if (verifyCanonicalString.trim().length === 0) {
      setVerifyError("canonical_string is required.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical_string: verifyCanonicalString,
          expected_event_hash: verifyExpectedHash.trim().length > 0 ? verifyExpectedHash : undefined,
          object_id:
            verifyObjectId.trim().length > 0 && verifyObjectId.trim().toLowerCase().startsWith("0x")
              ? verifyObjectId.trim()
              : undefined,
          tx_digest: verifyTxDigest.trim().length > 0 ? verifyTxDigest.trim() : undefined,
          ...(selectedNetwork === "mainnet" && mainnetUiConfirmed
            ? {
                network: "mainnet" as const,
                mainnet_confirm_token: mainnetConfirmInput.trim(),
              }
            : {}),
        }),
      });

      const data = (await response.json()) as VerifyResponse | { error?: string };

      if (!response.ok || !("ok" in data && data.ok)) {
        const message =
          "error" in data && typeof data.error === "string" ? data.error : "Verification failed.";
        setVerifyError(message);
        return;
      }

      setVerifyResult(data);
      setVerifyRaw(data as unknown as Record<string, unknown>);
      setActiveTab("technical");
    } catch {
      setVerifyError("Verification failed.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function onDownloadProofSummary() {
    if (!proof) {
      setErrorMessage("No proof available to export.");
      return;
    }

    try {
      const payload = {
        project_context: proof.project_context ?? {
          project_name: projectName,
          process_type: processType,
          ...(description.trim().length > 0 ? { description } : {}),
        },
        rows_count: proof.rows_count,
        metrics: {
          total_units: proof.metrics?.total_units ?? 0,
        },
        event_hash: proof.event_hash,
        uri: proof.uri,
        tx_digest: proof.tx_digest ?? proof.txId,
        object_id: proof.object_id ?? null,
        explorer: proof.explorer,
        evidence: proof.evidence,
        timestamp: proof.timestamp,
        issuer: proof.issuer,
      };

      const response = await fetch("/api/proof-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setErrorMessage("Failed to generate PDF summary.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "proof-summary.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Failed to generate PDF summary.");
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setErrorMessage(`${label} copied to clipboard.`);
    } catch {
      setErrorMessage(`Could not copy ${label}.`);
    }
  }

  const txDigest = extractTxDigest(proof);
  const txExplorer = txDigest ? buildTxBlockUrl(txDigest, process.env.NEXT_PUBLIC_IOTA_NETWORK ?? "testnet") : null;
  const integrationJsonExample = `{
  "project_context": {
    "project_name": "External App Proof",
    "process_type": "Waste traceability",
    "description": "Created from bios.rocks"
  },
  "records": [
    {
      "date": "2026-02-21T00:00:00.000Z",
      "type": "plastic",
      "value": 5,
      "unit": "kg"
    },
    {
      "date": "2026-02-22T00:00:00.000Z",
      "type": "plastic",
      "value": 7,
      "unit": "kg"
    }
  ]
}`;
  const integrationCurlExample = `curl -sS -X POST http://localhost:3002/api/proof-json \\
  -H 'Content-Type: application/json' \\
  --data-binary '{
    "project_context": {
      "project_name": "External App Proof",
      "process_type": "Waste traceability",
      "description": "Created from bios.rocks"
    },
    "records": [
      { "date": "2026-02-21T00:00:00.000Z", "type": "plastic", "value": 5, "unit": "kg" },
      { "date": "2026-02-22T00:00:00.000Z", "type": "plastic", "value": 7, "unit": "kg" }
    ]
  }'`;
  const tabs: Array<{ key: DashboardTab; label: string }> = [
    { key: "create", label: "Create Proof" },
    { key: "verify", label: "Verify" },
    { key: "summary", label: "Proof Summary" },
    { key: "technical", label: "Technical Details" },
    { key: "integrations", label: "Integrations" },
  ];
  const activeTabTitle = tabs.find((tab) => tab.key === activeTab)?.label ?? "Dashboard";

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute left-6 top-4 z-40 opacity-80">
        <Image
          src="/biosphere.jpg"
          alt="Biosphere"
          width={30}
          height={30}
          className="h-8 w-auto object-contain opacity-75 transition hover:opacity-100"
        />
      </div>
      <div className="pointer-events-none absolute right-6 top-4 z-40 opacity-80">
        <Image
          src="/iota.png"
          alt="IOTA"
          width={30}
          height={30}
          className="h-8 w-auto object-contain opacity-75 transition hover:opacity-100"
        />
      </div>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 lg:flex-row lg:gap-8 lg:px-6 lg:py-6">
        <aside className="w-full rounded-2xl border border-gray-800 bg-[#0c0c0c] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[280px] lg:flex-shrink-0 lg:p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Proof of Records</h1>
          <p className="mt-2 text-sm text-gray-400">
            Operational traceability in 3 steps with optional advanced technical review.
          </p>

          <nav className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`text-black whitespace-nowrap rounded-xl border px-3 py-2 text-left text-sm font-semibold transition lg:w-full ${
                      isActive
                        ? "border-gray-500 bg-gray-200 shadow-[inset_3px_0_0_0_#1f2937]"
                        : "border-gray-700 bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="mt-6 hidden text-xs text-gray-500 lg:block">
            Powered by Biosphere Integrity Infrastructure
          </div>
        </aside>

        <section className="flex-1 rounded-2xl border border-gray-800 bg-[#101010] p-4 shadow-[0_12px_45px_rgba(0,0,0,0.45)] lg:p-6">
          <header className="mb-4 border-b border-gray-800 pb-3">
            <h2 className="text-2xl font-bold tracking-wide text-white">{activeTabTitle}</h2>
          </header>

          {errorMessage ? <p style={{ marginTop: 12, color: "crimson" }}>{errorMessage}</p> : null}

          {activeTab === "create" ? (
            <>
              <section
                style={{
                  marginTop: 18,
                  border: "1px solid #2f2f2f",
                  borderRadius: 12,
                  padding: 14,
                  background: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Step 1 — Project Context</h2>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Project Name *</span>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 10,
                      border: "1px solid #3a3a3a",
                      padding: "10px 12px",
                      background: "#0f0f0f",
                      color: "#fff",
                    }}
                  />
                </label>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Process Type</span>
                  <select
                    value={processType}
                    onChange={(event) => setProcessType(event.target.value as ProcessType)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 10,
                      border: "1px solid #3a3a3a",
                      padding: "10px 12px",
                      background: "#0f0f0f",
                      color: "#fff",
                    }}
                  >
                    {PROCESS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Network</span>
                  <select
                    value={selectedNetwork}
                    onChange={(event) => setSelectedNetwork(event.target.value as NetworkChoice)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 10,
                      border: "1px solid #3a3a3a",
                      padding: "10px 12px",
                      background: "#0f0f0f",
                      color: "#fff",
                    }}
                  >
                    <option value="testnet">Testnet (default)</option>
                    <option value="mainnet">Mainnet</option>
                  </select>
                </label>
                {selectedNetwork === "mainnet" ? (
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      border: "1px solid #7f1d1d",
                      background: "#2b0f0f",
                      padding: "10px 12px",
                      color: "#fecaca",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      Mainnet creates real blockchain transactions and may incur cost.
                    </p>
                    <label style={{ display: "block", marginTop: 8 }}>
                      <span style={{ fontWeight: 600 }}>Type MAINNET to enable</span>
                      <input
                        value={mainnetConfirmInput}
                        onChange={(event) => setMainnetConfirmInput(event.target.value)}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          borderRadius: 10,
                          border: "1px solid #7f1d1d",
                          padding: "10px 12px",
                          background: "#0f0f0f",
                          color: "#fff",
                        }}
                      />
                    </label>
                  </div>
                ) : null}
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Description (optional)</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 10,
                      border: "1px solid #3a3a3a",
                      padding: "10px 12px",
                      background: "#0f0f0f",
                      color: "#fff",
                    }}
                  />
                </label>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Proof Units Mode</span>
                  <select
                    value={proofUnitsMode}
                    onChange={(event) => setProofUnitsMode(event.target.value as ProofUnitsChoice)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      borderRadius: 10,
                      border: "1px solid #3a3a3a",
                      padding: "10px 12px",
                      background: "#0f0f0f",
                      color: "#fff",
                    }}
                  >
                    <option value="batch">Batch proof</option>
                    <option value="merkle">Record-level proof (Merkle)</option>
                  </select>
                </label>
                {proofUnitsMode === "merkle" ? (
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      border: "1px solid #0f766e",
                      background: "#082f2f",
                      padding: "10px 12px",
                      color: "#ccfbf1",
                    }}
                  >
                    Each record will be individually verifiable while only one root is anchored on-chain.
                  </div>
                ) : null}

                <section
                  style={{
                    marginTop: 12,
                    border: "1px solid #3a3a3a",
                    borderRadius: 10,
                    background: "#0b0b0b",
                    padding: 12,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
                    Template Guidance
                  </h3>
                  {selectedTemplate ? (
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      <p style={{ margin: 0, color: "#d1d5db" }}>
                        <strong>{selectedTemplate.label}:</strong> {selectedTemplate.description}
                      </p>
                      <p style={{ margin: 0, color: "#9ca3af" }}>
                        <strong>Example fields:</strong> {selectedTemplate.exampleFields.join(", ")}
                      </p>
                      <p style={{ margin: 0, color: "#9ca3af" }}>
                        <strong>Example metrics:</strong> {selectedTemplate.exampleMetrics.join(", ")}
                      </p>
                      {selectedTemplate.notes ? (
                        <p style={{ margin: 0, color: "#9ca3af" }}>
                          <strong>Notes:</strong> {selectedTemplate.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p style={{ marginTop: 8, marginBottom: 0, color: "#9ca3af" }}>
                      No specific template guidance yet. Continue with your current mapping and records schema.
                    </p>
                  )}
                </section>
              </section>

              <section
                style={{
                  marginTop: 16,
                  border: "1px solid #2f2f2f",
                  borderRadius: 12,
                  padding: 14,
                  background: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Step 2 — Upload Evidence</h2>
                <UploadDropzone onFileSelected={parseFile} />
                {file ? <p style={{ marginTop: 10, color: "#d1d5db" }}>Dataset: {file.name}</p> : null}
                {parseLoading ? <p style={{ marginTop: 10, color: "#d1d5db" }}>Parsing...</p> : null}

                <label style={{ display: "block", marginTop: 12 }}>
                  <span style={{ fontWeight: 600 }}>Upload Photo Evidence (optional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                    style={{ display: "block", marginTop: 6 }}
                  />
                </label>
                {photo ? <p style={{ marginTop: 6, color: "#d1d5db" }}>Photo: {photo.name}</p> : null}
              </section>

              {parse ? (
                <>
                  <p style={{ marginTop: 14, color: "#d1d5db" }}>
                    Detected {parse.columns.length} columns, {parse.totalRows} data rows.
                  </p>

                  <section style={{ marginTop: 18 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Raw Preview</h2>
                    <PreviewTable rows={parse.preview} maxRows={10} />
                  </section>

                  <MappingWizard columns={parse.columns} value={mapping} onChange={setMapping} />

                  <button
                    onClick={onGenerateProof}
                    disabled={!mappingReady || !projectReady || proofLoading || !mainnetUiConfirmed}
                    className="text-black"
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      fontWeight: 600,
                      background: "#fff",
                      cursor:
                        !mappingReady || !projectReady || proofLoading || !mainnetUiConfirmed
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {proofLoading ? "Generating proof..." : "Generate Proof"}
                  </button>
                  {selectedNetwork === "mainnet" && !mainnetUiConfirmed ? (
                    <p style={{ marginTop: 8, color: "#fca5a5" }}>
                      Mainnet confirmation required: type MAINNET to continue.
                    </p>
                  ) : null}
                </>
              ) : null}

              {proof ? (
                <section
                  style={{
                    marginTop: 18,
                    border: "1px solid #2f2f2f",
                    borderRadius: 12,
                    padding: 16,
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                >
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Step 3 — Proof Created</h2>
                  <p style={{ marginTop: 8 }}>Project: {projectName}</p>
                  <p>Process: {processType}</p>
                  <p>Network: {proof.network ?? selectedNetwork}</p>
                  <p>Records: {proof.rows_count}</p>
                  <p>Integrity Status: Verified</p>
                  <p>
                    Evidence:{" "}
                    {proof.evidence?.photo_hash && proof.evidence?.photo_uri ? "Attached ✅" : "None"}
                  </p>
                  <p>
                    Proof ID: <code>{proof.object_id ?? "(pending)"}</code>
                  </p>
                  <p style={{ marginTop: 8 }}>
                    Your project data is now cryptographically secured and publicly verifiable.
                  </p>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {txExplorer ? (
                      <a href={txExplorer} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
                        View on Explorer
                      </a>
                    ) : null}
                    <button
                      className="text-black"
                      type="button"
                      onClick={() => void onDownloadProofSummary()}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Download Proof Summary
                    </button>
                    <Link
                      href={`/verify?${new URLSearchParams({
                        expected_event_hash: proof.event_hash,
                        ...(proof.object_id ? { object_id: proof.object_id } : {}),
                        ...(txDigest ? { tx_digest: txDigest } : {}),
                      }).toString()}`}
                      style={{ fontWeight: 700 }}
                    >
                      Verification Link
                    </Link>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {activeTab === "summary" ? (
            <section style={{ marginTop: 18 }}>
              {proof ? <ProofSummaryCard proof={proof} /> : <p style={{ color: "#d1d5db" }}>No proof generated yet.</p>}
            </section>
          ) : null}

          {activeTab === "verify" ? (
            <section
              style={{
                marginTop: 18,
                border: "1px solid #2f2f2f",
                borderRadius: 12,
                padding: 14,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Verify</h2>

              <label style={{ display: "block", marginTop: 10 }}>
                <span style={{ fontWeight: 600 }}>expected_event_hash (optional)</span>
                <input
                  value={verifyExpectedHash}
                  onChange={(event) => setVerifyExpectedHash(event.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 10,
                    border: "1px solid #3a3a3a",
                    padding: "10px 12px",
                    background: "#0f0f0f",
                    color: "#fff",
                  }}
                />
              </label>

              <label style={{ display: "block", marginTop: 10 }}>
                <span style={{ fontWeight: 600 }}>object_id</span>
                <input
                  value={verifyObjectId}
                  onChange={(event) => setVerifyObjectId(event.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 10,
                    border: "1px solid #3a3a3a",
                    padding: "10px 12px",
                    fontFamily: "monospace",
                    background: "#0f0f0f",
                    color: "#fff",
                  }}
                />
              </label>

              <label style={{ display: "block", marginTop: 10 }}>
                <span style={{ fontWeight: 600 }}>tx_digest (fallback)</span>
                <input
                  value={verifyTxDigest}
                  onChange={(event) => setVerifyTxDigest(event.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 10,
                    border: "1px solid #3a3a3a",
                    padding: "10px 12px",
                    fontFamily: "monospace",
                    background: "#0f0f0f",
                    color: "#fff",
                  }}
                />
              </label>

              <label style={{ display: "block", marginTop: 10 }}>
                <span style={{ fontWeight: 600 }}>canonical_string</span>
                <textarea
                  value={verifyCanonicalString}
                  onChange={(event) => setVerifyCanonicalString(event.target.value)}
                  rows={8}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 10,
                    border: "1px solid #3a3a3a",
                    padding: "10px 12px",
                    fontFamily: "monospace",
                    background: "#0f0f0f",
                    color: "#fff",
                  }}
                />
              </label>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={onVerify}
                  disabled={verifyLoading}
                  className="text-black"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    fontWeight: 600,
                    cursor: verifyLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {verifyLoading ? "Verifying..." : "Verify"}
                </button>
                <button
                  type="button"
                  className="text-black"
                  onClick={() => {
                    if (proof) {
                      setVerifyCanonicalString(proof.canonical_string);
                      setVerifyExpectedHash(proof.event_hash);
                      setVerifyObjectId(proof.object_id ?? "");
                      setVerifyTxDigest(proof.tx_digest ?? proof.txId ?? "");
                    }
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  Use latest proof data
                </button>
              </div>

              {verifyError ? <p style={{ marginTop: 10, color: "crimson" }}>{verifyError}</p> : null}

              {verifyResult ? (
                <div style={{ marginTop: 12 }}>
                  <p>
                    <strong>computed_event_hash:</strong> <code>{verifyResult.computed_event_hash ?? "(none)"}</code>
                  </p>
                  <p>
                    <strong>onchain_event_hash:</strong> <code>{verifyResult.onchain_event_hash ?? "(none)"}</code>
                  </p>
                  <p>
                    <strong>match_onchain:</strong> {String(verifyResult.match_onchain)}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === "technical" ? (
            <section
              style={{
                marginTop: 18,
                border: "1px solid #2f2f2f",
                borderRadius: 12,
                padding: 14,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Technical Details</h2>

              {proof ? (
                <>
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <p>
                      <strong>event_hash:</strong> <code>{proof.event_hash}</code>{" "}
                      <button className="text-black" onClick={() => void copyText("event_hash", proof.event_hash)}>
                        Copy
                      </button>
                    </p>
                    <p>
                      <strong>network:</strong> <code>{proof.network ?? selectedNetwork}</code>
                    </p>
                    <p>
                      <strong>tx_digest:</strong> <code>{proof.tx_digest ?? proof.txId ?? "(none)"}</code>{" "}
                      {proof.tx_digest || proof.txId ? (
                        <button
                          className="text-black"
                          onClick={() =>
                            void copyText("tx_digest", proof.tx_digest ?? proof.txId ?? "")
                          }
                        >
                          Copy
                        </button>
                      ) : null}
                    </p>
                    <p>
                      <strong>object_id:</strong> <code>{proof.object_id ?? "(none)"}</code>{" "}
                      {proof.object_id ? (
                        <button className="text-black" onClick={() => void copyText("object_id", proof.object_id ?? "")}>
                          Copy
                        </button>
                      ) : null}
                    </p>
                    <p>
                      <strong>Explorer (tx):</strong> {proof.explorer?.tx ?? txExplorer ?? "(none)"}
                    </p>
                    <p>
                      <strong>Explorer (object):</strong> {proof.explorer?.object ?? "(none)"}
                    </p>
                  </div>

                  <section style={{ marginTop: 12, border: "1px solid #2f2f2f", borderRadius: 10, padding: 10 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Evidence</h3>
                    {proof.evidence?.photo_hash && proof.evidence?.photo_uri ? (
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        <p>
                          <strong>photo_hash:</strong> <code>{proof.evidence.photo_hash}</code>{" "}
                          <button
                            className="text-black"
                            onClick={() => void copyText("photo_hash", proof.evidence?.photo_hash ?? "")}
                          >
                            Copy
                          </button>
                        </p>
                        <p>
                          <strong>photo_uri:</strong>{" "}
                          <a href={proof.evidence.photo_uri} target="_blank" rel="noopener noreferrer">
                            {proof.evidence.photo_uri}
                          </a>{" "}
                          <button
                            className="text-black"
                            onClick={() => void copyText("photo_uri", proof.evidence?.photo_uri ?? "")}
                          >
                            Copy
                          </button>
                        </p>
                        {toIpfsGatewayUrl(proof.evidence.photo_uri) ? (
                          <a
                            href={toIpfsGatewayUrl(proof.evidence.photo_uri) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black"
                            style={{
                              display: "inline-block",
                              width: "fit-content",
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "#fff",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            Open Evidence (IPFS)
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <p style={{ marginTop: 8, color: "#d1d5db" }}>Evidence: none.</p>
                    )}
                  </section>

                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 700 }}>canonical_string</summary>
                    <pre
                      style={{
                        marginTop: 8,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {proof.canonical_string}
                    </pre>
                  </details>
                </>
              ) : (
                <p style={{ marginTop: 8, color: "#d1d5db" }}>No proof response available yet.</p>
              )}

              <section style={{ marginTop: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Raw JSON: /api/proof</h3>
                <pre
                  style={{
                    marginTop: 6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {proofRaw ? JSON.stringify(proofRaw, null, 2) : "(no data)"}
                </pre>
              </section>

              <section style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Raw JSON: /api/verify</h3>
                <pre
                  style={{
                    marginTop: 6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {verifyRaw ? JSON.stringify(verifyRaw, null, 2) : "(no data)"}
                </pre>
              </section>
            </section>
          ) : null}

          {activeTab === "integrations" ? (
            <section
              style={{
                marginTop: 18,
                border: "1px solid #2f2f2f",
                borderRadius: 12,
                padding: 14,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Integrations</h2>
              <p style={{ marginTop: 8, color: "#d1d5db" }}>
                Use /api/proof-json to anchor proofs from external apps (bios.rocks).
              </p>

              <section style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Minimal JSON payload</h3>
                  <button
                    type="button"
                    className="text-black"
                    onClick={() => void copyText("integration JSON", integrationJsonExample)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Copy JSON
                  </button>
                </div>
                <pre
                  style={{
                    marginTop: 8,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 1.5,
                    border: "1px solid #2f2f2f",
                    borderRadius: 10,
                    padding: 10,
                    background: "#0b0b0b",
                  }}
                >
                  {integrationJsonExample}
                </pre>
              </section>

              <section style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>curl example</h3>
                  <button
                    type="button"
                    className="text-black"
                    onClick={() => void copyText("integration curl", integrationCurlExample)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Copy curl
                  </button>
                </div>
                <pre
                  style={{
                    marginTop: 8,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 1.5,
                    border: "1px solid #2f2f2f",
                    borderRadius: 10,
                    padding: 10,
                    background: "#0b0b0b",
                  }}
                >
                  {integrationCurlExample}
                </pre>
              </section>
            </section>
          ) : null}
        </section>
      </div>
      <AskStrategIA />
    </main>
  );
}
