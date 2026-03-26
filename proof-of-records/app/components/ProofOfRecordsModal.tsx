"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { NavbarLang } from "@/app/components/Navbar";

type ProofOfRecordsModalProps = {
  lang: NavbarLang;
  open: boolean;
  onClose: () => void;
};

const modalCopy = {
  en: {
    eyebrow: "Product Overview",
    title: "Proof of Records",
    subtitle: "Turn operational data into verifiable records.",
    description:
      "Infrastructure layer for data integrity: canonicalization, hashing, timestamp, verification, and evidence anchoring.",
    pricing: [
      { title: "Free", price: "3 records / month", bullets: ["Entry-level access", "Basic proof generation"] },
      { title: "Pro", price: "EUR29 / month", bullets: ["Continuous usage", "Dashboard + verification"] },
      { title: "Usage", price: "Pay per record", bullets: ["Scales with your operations", "Flexible for variable volume"] },
    ],
    ecosystemTitle: "Part of the Biosphere Rocks infrastructure.",
    ecosystemBody:
      "Available as a standalone product or as an integrated layer inside StrategIA Impact Agent.",
    openDashboard: "Open Dashboard",
    exploreServices: "Explore Biosphere Services",
  },
  fr: {
    eyebrow: "Présentation produit",
    title: "Proof of Records",
    subtitle: "Transformez des données opérationnelles en enregistrements vérifiables.",
    description:
      "Couche d’infrastructure pour l’intégrité des données : canonicalisation, hashing, horodatage, vérification et ancrage des preuves.",
    pricing: [
      { title: "Free", price: "3 enregistrements / mois", bullets: ["Accès initial", "Génération de preuve de base"] },
      { title: "Pro", price: "29 EUR / mois", bullets: ["Usage continu", "Dashboard + vérification"] },
      { title: "Usage", price: "Paiement par enregistrement", bullets: ["Évolue avec vos opérations", "Flexible selon votre volume"] },
    ],
    ecosystemTitle: "Fait partie de l’infrastructure Biosphere Rocks.",
    ecosystemBody:
      "Disponible comme produit autonome ou comme couche intégrée dans StrategIA Impact Agent.",
    openDashboard: "Ouvrir le dashboard",
    exploreServices: "Explorer les services Biosphere",
  },
  es: {
    eyebrow: "Visión general",
    title: "Proof of Records",
    subtitle: "Convierte datos operativos en registros verificables.",
    description:
      "Capa de infraestructura para integridad de datos: canonicalización, hashing, timestamp, verificación y anclaje de evidencia.",
    pricing: [
      { title: "Free", price: "3 registros / mes", bullets: ["Acceso inicial", "Generación básica de proof"] },
      { title: "Pro", price: "29 EUR / mes", bullets: ["Uso continuo", "Dashboard + verificación"] },
      { title: "Usage", price: "Pago por registro", bullets: ["Escala con tus operaciones", "Flexible para volumen variable"] },
    ],
    ecosystemTitle: "Forma parte de la infraestructura de Biosphere Rocks.",
    ecosystemBody:
      "Disponible como producto independiente o como capa integrada dentro de StrategIA Impact Agent.",
    openDashboard: "Abrir el dashboard",
    exploreServices: "Explorar servicios de Biosphere",
  },
} satisfies Record<NavbarLang, { eyebrow: string; title: string; subtitle: string; description: string; pricing: Array<{ title: string; price: string; bullets: string[] }>; ecosystemTitle: string; ecosystemBody: string; openDashboard: string; exploreServices: string }>;

export default function ProofOfRecordsModal({ lang, open, onClose }: ProofOfRecordsModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const copy = modalCopy[lang];

  return (
    <div
      aria-modal="true"
      role="dialog"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.68)",
        backdropFilter: "blur(6px)",
        padding: "24px 16px",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#0a0a0a",
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
          padding: 24,
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <p
              style={{
                margin: 0,
                color: "#86efac",
                fontSize: 12,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              {copy.eyebrow}
            </p>
            <h2 style={{ margin: "10px 0 0 0", fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1.02 }}>
              {copy.title}
            </h2>
            <p style={{ margin: "10px 0 0 0", color: "#d1d5db", fontSize: 16, lineHeight: 1.65 }}>
              {copy.subtitle}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#ffffff",
              width: 36,
              height: 36,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <p style={{ margin: "16px 0 0 0", color: "#b6bcc8", fontSize: 15, lineHeight: 1.75, maxWidth: 620 }}>
          {copy.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 22,
          }}
        >
          {copy.pricing.map((tier) => (
            <div
              key={tier.title}
              style={{
                borderRadius: 20,
                border: tier.title === "Pro" ? "1px solid rgba(134,239,172,0.35)" : "1px solid rgba(255,255,255,0.08)",
                background: tier.title === "Pro" ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                padding: "18px 16px",
              }}
            >
              <p style={{ margin: 0, color: tier.title === "Pro" ? "#86efac" : "#9ca3af", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
                {tier.title}
              </p>
              <p style={{ margin: "10px 0 0 0", fontSize: 20, fontWeight: 700 }}>{tier.price}</p>
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {tier.bullets.map((bullet) => (
                  <p key={bullet} style={{ margin: 0, color: "#c7cbd4", fontSize: 14, lineHeight: 1.5 }}>
                    {bullet}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            padding: "16px 18px",
          }}
        >
          <p style={{ margin: 0, color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
            {copy.ecosystemTitle}
          </p>
          <p style={{ margin: "8px 0 0 0", color: "#b6bcc8", fontSize: 14, lineHeight: 1.65 }}>
            {copy.ecosystemBody}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
          <Link
            href="/dashboard"
            onClick={onClose}
            style={{
              textDecoration: "none",
              color: "#050505",
              background: "#f3f4f6",
              padding: "12px 16px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {copy.openDashboard}
          </Link>
          <Link
            href="https://www.biosphere.rocks/services"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              color: "#f3f4f6",
              padding: "12px 16px",
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {copy.exploreServices}
          </Link>
        </div>
      </div>
    </div>
  );
}
