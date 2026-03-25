"use client";

import { useMemo, useState } from "react";
import type { ProofResponse } from "@/app/types/records";

type Lang = "en" | "fr" | "es";

type ProofInterpretationCardProps = {
  proof: ProofResponse;
  onViewTechnicalDetails: () => void;
  onVerifyProof: () => void;
  onDownloadSummary: () => void;
};

type CardCopy = {
  statusTitle: string;
  statusBody: string;
  meaningTitle: string;
  meaningItems: Array<{ icon: string; title: string; description: string }>;
  processTitle: string;
  processLine: string;
  insightTitle: string;
  insightBody: string;
  nextStep: string;
  verifyAction: string;
  technicalAction: string;
  summaryAction: string;
  proofRef: string;
  records: string;
};

const copy: Record<Lang, CardCopy> = {
  en: {
    statusTitle: "Your record is now verifiable",
    statusBody: "It has been securely processed and can now be independently checked.",
    meaningTitle: "What this means",
    meaningItems: [
      {
        icon: "🔒",
        title: "Integrity",
        description: "Your data cannot be modified without detection.",
      },
      {
        icon: "🔍",
        title: "Verifiable",
        description: "Anyone can independently check this record.",
      },
      {
        icon: "📦",
        title: "Portable",
        description: "You can share this proof with others.",
      },
    ],
    processTitle: "Process",
    processLine: "Data → Hash → Anchor → Verifiable",
    insightTitle: "StrategIA insight",
    insightBody:
      "Your record is now independently verifiable and can be used as a trusted reference.",
    nextStep: "Next step: Verify your proof or share it externally.",
    verifyAction: "Verify this proof",
    technicalAction: "View technical details",
    summaryAction: "Download summary",
    proofRef: "Proof ref",
    records: "records",
  },
  fr: {
    statusTitle: "Votre enregistrement est maintenant vérifiable",
    statusBody: "Il a été traité de manière sécurisée et peut désormais être contrôlé indépendamment.",
    meaningTitle: "Ce que cela signifie",
    meaningItems: [
      {
        icon: "🔒",
        title: "Intégrité",
        description: "Vos données ne peuvent pas être modifiées sans être détectées.",
      },
      {
        icon: "🔍",
        title: "Vérifiable",
        description: "Ce registre peut être contrôlé indépendamment.",
      },
      {
        icon: "📦",
        title: "Portable",
        description: "Vous pouvez partager cette preuve avec d'autres parties.",
      },
    ],
    processTitle: "Processus",
    processLine: "Data → Hash → Anchor → Verifiable",
    insightTitle: "StrategIA insight",
    insightBody:
      "Votre enregistrement est désormais vérifiable indépendamment et peut servir de référence fiable.",
    nextStep: "Étape suivante : Verify votre proof ou partagez-la à l’externe.",
    verifyAction: "Verify this proof",
    technicalAction: "View Technical",
    summaryAction: "Download Summary",
    proofRef: "Réf. proof",
    records: "records",
  },
  es: {
    statusTitle: "Tu registro ya es verificable",
    statusBody: "Se ha procesado de forma segura y ahora puede comprobarse de manera independiente.",
    meaningTitle: "Qué significa esto",
    meaningItems: [
      {
        icon: "🔒",
        title: "Integridad",
        description: "Tus datos no pueden modificarse sin dejar rastro.",
      },
      {
        icon: "🔍",
        title: "Verificable",
        description: "Este registro puede comprobarse de forma independiente.",
      },
      {
        icon: "📦",
        title: "Portable",
        description: "Puedes compartir esta proof con otras personas.",
      },
    ],
    processTitle: "Proceso",
    processLine: "Data → Hash → Anchor → Verifiable",
    insightTitle: "StrategIA insight",
    insightBody:
      "Tu registro ya es verificable de forma independiente y puede usarse como referencia confiable.",
    nextStep: "Siguiente paso: Verify tu proof o compártela externamente.",
    verifyAction: "Verify this proof",
    technicalAction: "View Technical",
    summaryAction: "Download Summary",
    proofRef: "Ref. proof",
    records: "records",
  },
};

export default function ProofInterpretationCard({
  proof,
  onViewTechnicalDetails,
  onVerifyProof,
  onDownloadSummary,
}: ProofInterpretationCardProps) {
  const [lang] = useState<Lang>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    const saved = window.localStorage.getItem("lang");
    return saved === "fr" || saved === "es" || saved === "en" ? saved : "en";
  });

  const t = useMemo(() => copy[lang], [lang]);

  return (
    <section
      style={{
        marginBottom: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#86efac", fontSize: 13, fontWeight: 700 }}>✔ {t.statusTitle}</p>
          <p style={{ margin: "6px 0 0 0", color: "#d1d5db", fontSize: 14, lineHeight: 1.55 }}>{t.statusBody}</p>
        </div>
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          {proof.proof_db_id ? `${t.proofRef} ${proof.proof_db_id}` : `${proof.rows_count} ${t.records}`}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={{ margin: 0, color: "#9ca3af", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
          {t.meaningTitle}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          {t.meaningItems.map((item) => (
            <div
              key={item.title}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                padding: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 17 }}>{item.icon}</p>
              <p style={{ margin: "8px 0 0 0", color: "#ffffff", fontWeight: 700, fontSize: 14 }}>{item.title}</p>
              <p style={{ margin: "5px 0 0 0", color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          padding: 12,
        }}
      >
        <p style={{ margin: 0, color: "#9ca3af", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
          {t.processTitle}
        </p>
        <p style={{ margin: "8px 0 0 0", color: "#f8fafc", fontSize: 14, fontWeight: 600 }}>{t.processLine}</p>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          padding: 12,
        }}
      >
        <p style={{ margin: 0, color: "#86efac", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
          {t.insightTitle}
        </p>
        <p style={{ margin: "8px 0 0 0", color: "#d1d5db", fontSize: 14, lineHeight: 1.55 }}>{t.insightBody}</p>
        <p style={{ margin: "8px 0 0 0", color: "#9ca3af", fontSize: 13 }}>{t.nextStep}</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          onClick={onVerifyProof}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid rgba(134,239,172,0.28)",
            background: "rgba(255,255,255,0.98)",
            color: "#050505",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {t.verifyAction}
        </button>
        <button
          type="button"
          onClick={onViewTechnicalDetails}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "transparent",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          {t.technicalAction}
        </button>
        <button
          type="button"
          onClick={onDownloadSummary}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "transparent",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          {t.summaryAction}
        </button>
      </div>
    </section>
  );
}
