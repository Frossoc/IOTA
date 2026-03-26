"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ColumnMapping,
  ParseApiResponse,
  ParseResponse,
  ProcessType,
  ProofResponse,
  VerifyResponse,
} from "@/app/types/records";
import Navbar, { type NavbarLang } from "@/app/components/Navbar";
import UploadDropzone from "@/app/components/UploadDropzone";
import MappingWizard from "@/app/components/MappingWizard";
import PreviewTable from "@/app/components/PreviewTable";
import ProofSummaryCard from "@/app/components/ProofSummaryCard";
import AskStrategIA from "./AskStrategIA";
import ProofInterpretationCard from "./ProofInterpretationCard";
import { findProcessTemplate } from "@/app/lib/templates/processTemplates";
import { resolveEvidenceUrl } from "@/app/lib/storage/gateway";

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
type InputMode = "excel" | "json";
type JsonRecordInput = {
  date: string;
  type: string;
  value: number;
  unit: string;
  site?: string;
  operator?: string;
  notes?: string;
  record_id?: string;
};

const uploadCopy = {
  en: {
    sidebarGuide: "Explore your proof details",
    startLine: "Start by uploading your data to generate your first proof.",
    uploadStepExcel: "Step 2 — Upload your data",
    uploadStepJson: "Step 2 — Add your JSON data",
    datasetLabel: "Dataset",
    datasetHelpExcel: "Upload the spreadsheet that will become the basis of your proof.",
    datasetHelpJson: "Paste a JSON array of records or an object containing a records array.",
    optionalEvidenceLabel: "Optional photo evidence",
    optionalEvidenceHelp: "Add visual support only if your record needs it. This step is optional.",
    nextStepLine: "Next step: verify your proof or share it.",
  },
  fr: {
    sidebarGuide: "Explorez les détails de votre preuve",
    startLine: "Commencez par importer vos données pour générer votre première preuve.",
    uploadStepExcel: "Step 2 — Importer vos données",
    uploadStepJson: "Step 2 — Ajouter vos données JSON",
    datasetLabel: "Jeu de données",
    datasetHelpExcel: "Importez la feuille de calcul qui servira de base à votre preuve.",
    datasetHelpJson: "Collez un tableau JSON de records ou un objet contenant un tableau records.",
    optionalEvidenceLabel: "Preuve photo facultative",
    optionalEvidenceHelp: "Ajoutez un support visuel uniquement si votre enregistrement en a besoin. Cette étape reste facultative.",
    nextStepLine: "Étape suivante : vérifiez votre preuve ou partagez-la.",
  },
  es: {
    sidebarGuide: "Explora los detalles de tu prueba",
    startLine: "Comienza cargando tus datos para generar tu primera prueba.",
    uploadStepExcel: "Step 2 — Cargar tus datos",
    uploadStepJson: "Step 2 — Agregar tus datos JSON",
    datasetLabel: "Conjunto de datos",
    datasetHelpExcel: "Carga la hoja de cálculo que servirá como base de tu proof.",
    datasetHelpJson: "Pega un arreglo JSON de records o un objeto que contenga un arreglo records.",
    optionalEvidenceLabel: "Evidencia fotográfica opcional",
    optionalEvidenceHelp: "Agrega soporte visual solo si tu registro lo necesita. Este paso sigue siendo opcional.",
    nextStepLine: "Paso siguiente: verifica tu prueba o compártela.",
  },
} satisfies Record<NavbarLang, Record<string, string>>;

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
  return `https://explorer.iota.org/txblock/${txDigest}?network=${encodeURIComponent(net)}`;
}

function UploadTabSync({ onTabChange }: { onTabChange: (tab: DashboardTab) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextTab = parseDashboardTab(searchParams.get("tab"));
    if (nextTab) {
      onTabChange(nextTab);
    }
  }, [onTabChange, searchParams]);

  return null;
}

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("create");
  const [lang, setLang] = useState<NavbarLang>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    try {
      const saved = window.localStorage.getItem("lang");
      return saved === "en" || saved === "fr" || saved === "es" ? saved : "en";
    } catch {
      return "en";
    }
  });

  const [inputMode, setInputMode] = useState<InputMode>("excel");
  const [projectName, setProjectName] = useState("");
  const [processType, setProcessType] = useState<ProcessType>("Waste traceability");
  const [description, setDescription] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkChoice>("testnet");
  const [mainnetConfirmInput, setMainnetConfirmInput] = useState("");
  const [proofUnitsMode, setProofUnitsMode] = useState<ProofUnitsChoice>("batch");
  const [jsonInput, setJsonInput] = useState(`[
  {
    "date": "2026-02-21",
    "type": "plastic",
    "value": 5,
    "unit": "kg"
  }
]`);

  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [verifyCanonicalString, setVerifyCanonicalString] = useState("");
  const [verifyExpectedHash, setVerifyExpectedHash] = useState("");
  const [verifyObjectId, setVerifyObjectId] = useState("");
  const [verifyTxDigest, setVerifyTxDigest] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const [proofRaw, setProofRaw] = useState<Record<string, unknown> | null>(null);
  const [verifyRaw, setVerifyRaw] = useState<Record<string, unknown> | null>(null);
  const copyResetTimerRef = useRef<number | null>(null);

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

      applyGeneratedProof(data);
    } catch {
      setErrorMessage("Failed to generate proof bundle.");
    } finally {
      setProofLoading(false);
    }
  }

  function applyGeneratedProof(data: ProofResponse) {
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
      setErrorMessage(`Proof generated with ${data.errors.length} normalization error(s). Review details below.`);
    } else if (data.warnings.length > 0) {
      setErrorMessage(`Proof generated with ${data.warnings.length} warning(s). Review details below.`);
    }

    setActiveTab("summary");
  }

  function parseJsonRecordsInput(input: string): JsonRecordInput[] {
    const parsed = JSON.parse(input) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as JsonRecordInput[];
    }
    if (typeof parsed === "object" && parsed !== null && "records" in parsed) {
      const records = (parsed as { records?: unknown }).records;
      if (Array.isArray(records)) {
        return records as JsonRecordInput[];
      }
    }
    throw new Error("JSON input must be an array of records or an object containing records[].");
  }

  async function fileToBase64(nextFile: File): Promise<string> {
    const buffer = await nextFile.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });
    return window.btoa(binary);
  }

  function downloadExcelTemplate() {
    const csv = ["date,type,value,unit", "2026-02-21,plastic,5,kg"].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "proof-of-records-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function onGenerateJsonProof() {
    if (!projectReady) {
      setErrorMessage("Project Name is mandatory.");
      return;
    }

    setProofLoading(true);
    setErrorMessage(null);
    setProof(null);

    try {
      const payload: Record<string, unknown> = {
        project_context: {
          project_name: projectName.trim(),
          process_type: processType,
          ...(description.trim().length > 0 ? { description: description.trim() } : {}),
        },
        records: parseJsonRecordsInput(jsonInput),
        ...(proofUnitsMode === "merkle" ? { proof_units_mode: "merkle" } : {}),
      };

      if (photo) {
        payload.evidence = {
          photo_base64: await fileToBase64(photo),
          filename: photo.name,
          content_type: photo.type || "image/jpeg",
        };
      }

      if (selectedNetwork === "mainnet" && mainnetUiConfirmed) {
        payload.network = "mainnet";
        payload.mainnet_confirm_token = mainnetConfirmInput.trim();
      }

      const response = await fetch("/api/proof-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as ProofResponse | { error?: string };

      if (!response.ok || !("ok" in data && data.ok)) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to generate proof from JSON.";
        setErrorMessage(message);
        return;
      }

      applyGeneratedProof(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse JSON input.";
      setErrorMessage(message);
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
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setErrorMessage(`Nothing to copy for ${label}.`);
      return;
    }

    const fallbackCopy = (text: string) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
      } else {
        fallbackCopy(trimmed);
      }
      setCopiedKey(label);
      setErrorMessage(null);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedKey((current) => (current === label ? null : current));
      }, 1500);
    } catch {
      setErrorMessage(`Could not copy ${label}.`);
    }
  }

  function getCopyLabel(key: string, idle = "Copy"): string {
    return copiedKey === key ? "Copied" : idle;
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

  const evidenceUrl = resolveEvidenceUrl(proof?.evidence?.photo_uri);
  const uiCopy = uploadCopy[lang];

  const changeLang = (nextLang: NavbarLang) => {
    setLang(nextLang);
    try {
      window.localStorage.setItem("lang", nextLang);
    } catch {}
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      <Suspense fallback={null}>
        <UploadTabSync onTabChange={setActiveTab} />
      </Suspense>
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 py-5 lg:px-6 lg:py-6">
        <Navbar
          lang={lang}
          onChangeLang={changeLang}
          title="Proof of Records"
          subtitle="Verifiable data infrastructure"
          homeLabel="Home"
          biosphereLabel="Biosphere Rocks"
          proofRecordsLabel="Proof Records"
          launchLabel="Launch App"
        />
      </div>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-5 lg:flex-row lg:gap-8 lg:px-6 lg:pb-6">
        <aside className="w-full rounded-2xl border border-gray-800 bg-[#0c0c0c] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[280px] lg:flex-shrink-0 lg:p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Proof of Records</h1>
          <p className="mt-2 text-sm text-gray-400">
            Operational traceability in 3 steps with optional advanced technical review.
          </p>

          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-500">{uiCopy.sidebarGuide}</p>
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

          {activeTab === "create" ? (
            <p className="mb-4 text-sm text-gray-400">{uiCopy.startLine}</p>
          ) : null}

          {errorMessage ? <p style={{ marginTop: 12, color: "crimson" }}>{errorMessage}</p> : null}
          {proof ? (
            <>
              <ProofInterpretationCard
                proof={proof}
                onViewTechnicalDetails={() => setActiveTab("technical")}
                onVerifyProof={() => setActiveTab("verify")}
                onDownloadSummary={() => void onDownloadProofSummary()}
              />
              <p className="mb-4 mt-3 text-sm text-gray-400">{uiCopy.nextStepLine}</p>
            </>
          ) : null}

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
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontWeight: 600 }}>Input Mode</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {(["excel", "json"] as InputMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setInputMode(mode)}
                        className="text-black"
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid #3a3a3a",
                          background: inputMode === mode ? "#ffffff" : "#f3f4f6",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {mode === "excel" ? "Excel" : "JSON"}
                      </button>
                    ))}
                  </div>
                </label>

                <section
                  style={{
                    marginTop: 12,
                    border: "1px solid #3a3a3a",
                    borderRadius: 10,
                    background: "#0b0b0b",
                    padding: 12,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Expected dataset format</h3>
                  <p style={{ margin: "8px 0 0 0", color: "#d1d5db" }}>
                    Minimum required columns: <strong>date</strong>, <strong>type</strong>, <strong>value</strong>,{" "}
                    <strong>unit</strong>.
                  </p>
                  <p style={{ margin: "6px 0 0 0", color: "#9ca3af" }}>
                    Additional columns are allowed and can be ignored unless you choose to map them.
                  </p>
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: 8,
                    }}
                  >
                    <div style={{ border: "1px solid #2f2f2f", borderRadius: 10, padding: 10, background: "#111111" }}>
                      <strong style={{ display: "block" }}>date</strong>
                      <span style={{ color: "#d1d5db" }}>2026-02-21</span>
                    </div>
                    <div style={{ border: "1px solid #2f2f2f", borderRadius: 10, padding: 10, background: "#111111" }}>
                      <strong style={{ display: "block" }}>type</strong>
                      <span style={{ color: "#d1d5db" }}>plastic</span>
                    </div>
                    <div style={{ border: "1px solid #2f2f2f", borderRadius: 10, padding: 10, background: "#111111" }}>
                      <strong style={{ display: "block" }}>value</strong>
                      <span style={{ color: "#d1d5db" }}>5</span>
                    </div>
                    <div style={{ border: "1px solid #2f2f2f", borderRadius: 10, padding: 10, background: "#111111" }}>
                      <strong style={{ display: "block" }}>unit</strong>
                      <span style={{ color: "#d1d5db" }}>kg</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="text-black"
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Download Excel Template
                  </button>
                </section>

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
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    {inputMode === "excel" ? uiCopy.uploadStepExcel : uiCopy.uploadStepJson}
                  </h2>
                  <div
                    style={{
                      marginTop: 12,
                      border: "1px solid #3a3a3a",
                      borderRadius: 10,
                      background: "#0b0b0b",
                      padding: 12,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, color: "#ffffff" }}>{uiCopy.datasetLabel}</p>
                    <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: 14 }}>
                      {inputMode === "excel" ? uiCopy.datasetHelpExcel : uiCopy.datasetHelpJson}
                    </p>
                    {inputMode === "excel" ? (
                      <>
                        <div style={{ marginTop: 10 }}>
                          <UploadDropzone onFileSelected={parseFile} />
                        </div>
                        {file ? <p style={{ marginTop: 10, color: "#d1d5db" }}>Dataset: {file.name}</p> : null}
                        {parseLoading ? <p style={{ marginTop: 10, color: "#d1d5db" }}>Parsing...</p> : null}
                      </>
                    ) : (
                      <textarea
                        value={jsonInput}
                        onChange={(event) => setJsonInput(event.target.value)}
                        rows={12}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          borderRadius: 10,
                          border: "1px solid #3a3a3a",
                          padding: "10px 12px",
                          fontFamily: "monospace",
                          background: "#0f0f0f",
                          color: "#fff",
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      border: "1px solid #2f2f2f",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      padding: 12,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, color: "#ffffff" }}>{uiCopy.optionalEvidenceLabel}</p>
                    <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: 14 }}>{uiCopy.optionalEvidenceHelp}</p>
                    <label style={{ display: "block", marginTop: 10 }}>
                      <span style={{ fontWeight: 600 }}>Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                        style={{ display: "block", marginTop: 6 }}
                      />
                    </label>
                    {photo ? <p style={{ marginTop: 6, color: "#d1d5db" }}>Photo: {photo.name}</p> : null}
                  </div>
              </section>

              {inputMode === "excel" && parse ? (
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

              {inputMode === "json" ? (
                <button
                  onClick={onGenerateJsonProof}
                  disabled={!projectReady || proofLoading || !mainnetUiConfirmed}
                  className="text-black"
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    fontWeight: 600,
                    background: "#fff",
                    cursor: !projectReady || proofLoading || !mainnetUiConfirmed ? "not-allowed" : "pointer",
                  }}
                >
                  {proofLoading ? "Generating proof..." : "Generate Proof from JSON"}
                </button>
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
                  <p style={{ marginTop: 8 }}>
                    Status: <strong>Proof generated</strong>
                  </p>
                  <p>
                    Hash: <code>{proof.event_hash}</code>
                  </p>
                  <p>Timestamp: {proof.timestamp}</p>
                  <p>Integrity Status: Verified</p>
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
                        {getCopyLabel("event_hash")}
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
                          {getCopyLabel("tx_digest")}
                        </button>
                      ) : null}
                    </p>
                    <p>
                      <strong>object_id:</strong> <code>{proof.object_id ?? "(none)"}</code>{" "}
                      {proof.object_id ? (
                        <button className="text-black" onClick={() => void copyText("object_id", proof.object_id ?? "")}>
                          {getCopyLabel("object_id")}
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
                            {getCopyLabel("photo_hash")}
                          </button>
                        </p>
                        <p>
                          <strong>photo_uri:</strong>{" "}
                          {evidenceUrl ? (
                            <a href={evidenceUrl} target="_blank" rel="noopener noreferrer">
                              {proof.evidence.photo_uri}
                            </a>
                          ) : (
                            <span>{proof.evidence.photo_uri}</span>
                          )}{" "}
                          <button
                            className="text-black"
                            onClick={() => void copyText("photo_uri", proof.evidence?.photo_uri ?? "")}
                          >
                            {getCopyLabel("photo_uri")}
                          </button>
                        </p>
                        {evidenceUrl ? (
                          <a
                            href={evidenceUrl}
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
                            Open Evidence
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
                    {getCopyLabel("integration JSON", "Copy JSON")}
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
                    {getCopyLabel("integration curl", "Copy curl")}
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
