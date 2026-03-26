"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";

type Lang = "en" | "fr" | "es";

const translations = {
  en: {
    heroTitle: "Proof of Records",
    heroTagline: "Turn operational data into verifiable records anchored on IOTA",
    heroDescription:
      "From spreadsheets and JSON to independently verifiable proof, built for traceability, auditability, and trust.",
    heroDifferentiator: "Most systems certify files. Proof of Records certifies the underlying data.",
    ctaPrimary: "Launch App",
    ctaSecondary: "View Demo",
    problemTitle: "The Problem",
    problemText:
      "Spreadsheets, logs, and operational records can be edited, duplicated, or questioned after the fact. Organizations need integrity, traceability, and public verification.",
    solutionTitle: "The Solution",
    solutionText:
      "Proof of Records canonicalizes structured data, generates deterministic hashes, anchors proofs on IOTA, and exposes public verification paths for third-party review.",
    howItWorks: "How It Works",
    howItWorksText:
      "A simple workflow that keeps operations familiar while adding a cryptographic proof layer behind the scenes.",
    features: "Key Features",
    featuresText:
      "Built for real operational proof workflows, with verification, evidence handling, and delivery paths for audits and public trust.",
    useCases: "Use Cases",
    useCasesText:
      "Designed for sectors where structured records need to remain verifiable across time, organizations, and stakeholders.",
    trustTitle: "Built for high-integrity records, not blockchain theater.",
    trustText:
      "Built with Biosphere infrastructure, anchored on IOTA testnet, and designed for verifiable operational data that needs to be checked by organizations, partners, and the public.",
    notarizationTitle: "More than document notarization",
    notarizationText:
      "Proof of Records is not limited to one file type or one workflow. It provides a reusable trust layer for operational data across reporting, compliance, supply chains, impact, and beyond.",
    aboutBiosphereTitle: "About Biosphere Rocks",
    aboutBiosphereText:
      "Proof of Records is one operational layer of the broader Biosphere Rocks infrastructure, a system designed to make real-world data verifiable, traceable, and auditable.",
    aboutBiosphereLink: "Explore Biosphere Rocks",
    finalTitle: "Bring verifiable records into the workflow you already use.",
    finalPrimary: "Open Dashboard",
    finalSecondary: "Explore Proof Records",
    biosphereLine: "Part of the Biosphere Rocks ecosystem",
    biosphereFooter: "Built as part of the Biosphere Rocks infrastructure",
    navProofs: "Proof Records",
    navLaunch: "Launch App",
    navHome: "Home",
    navBiosphere: "Biosphere Rocks",
    heroBadge: "Deeptech integrity layer",
    proofStatsInput: "Input",
    proofStatsAnchor: "Anchor",
    proofStatsVerify: "Verification",
    proofStatsInputValue: "Excel + JSON",
    proofStatsAnchorValue: "IOTA testnet",
    proofStatsVerifyValue: "Public + API",
    integrityEyebrow: "Integrity by design",
    integrityText: "Operational data that can be checked, shared, and trusted.",
    integritySubtext:
      "Built for organizations that need structured records to stand up to audits, public scrutiny, and cross-party verification.",
    startExploring: "Start Exploring",
  },
  fr: {
    heroTitle: "Proof of Records",
    heroTagline: "Transformez les donnees operationnelles en enregistrements verifiables ancres sur IOTA",
    heroDescription:
      "Des feuilles de calcul et du JSON vers une preuve verifiable independamment, concue pour la tracabilite, l'auditabilite et la confiance.",
    heroDifferentiator:
      "La plupart des systemes certifient des fichiers. Proof of Records certifie les donnees sous-jacentes.",
    ctaPrimary: "Ouvrir l'application",
    ctaSecondary: "Voir la demo",
    problemTitle: "Le probleme",
    problemText:
      "Les feuilles de calcul, journaux et donnees operationnelles peuvent etre modifies, dupliques ou contestes apres coup. Les organisations ont besoin d'integrite, de tracabilite et de verification publique.",
    solutionTitle: "La solution",
    solutionText:
      "Proof of Records canonicalise les donnees structurees, genere des hachages deterministes, ancre les preuves sur IOTA et expose des chemins de verification publique.",
    howItWorks: "Fonctionnement",
    howItWorksText:
      "Un flux simple qui conserve des operations familières tout en ajoutant une couche de preuve cryptographique.",
    features: "Fonctionnalites",
    featuresText:
      "Concu pour des flux de preuve operationnels avec verification, gestion des preuves visuelles et livrables pour audits et confiance publique.",
    useCases: "Cas d'usage",
    useCasesText:
      "Concu pour les secteurs ou les donnees structurees doivent rester verifiables dans le temps et entre plusieurs acteurs.",
    trustTitle: "Concu pour des enregistrements a haute integrite.",
    trustText:
      "Construit avec l'infrastructure Biosphere, ancre sur IOTA testnet, et pense pour des donnees operationnelles verifiables par des organisations, partenaires et publics.",
    notarizationTitle: "Plus que de la notarisation documentaire",
    notarizationText:
      "Proof of Records ne se limite ni a un type de fichier ni a un workflow unique. Il fournit une couche de confiance reutilisable pour les donnees operationnelles a travers le reporting, la conformite, la supply chain, l'impact et au-dela.",
    aboutBiosphereTitle: "A propos de Biosphere Rocks",
    aboutBiosphereText:
      "Proof of Records est une couche operationnelle de l'infrastructure plus large Biosphere Rocks, un systeme concu pour rendre les donnees du monde reel verifiables, tracables et auditables.",
    aboutBiosphereLink: "Découvrir Biosphere Rocks",
    finalTitle: "Integrez des preuves verifiables dans les flux que vous utilisez deja.",
    finalPrimary: "Ouvrir le dashboard",
    finalSecondary: "Explorer les preuves",
    biosphereLine: "Fait partie de l'ecosysteme Biosphere Rocks",
    biosphereFooter: "Construit dans l'infrastructure Biosphere Rocks",
    navProofs: "Registre des preuves",
    navLaunch: "Ouvrir l'application",
    navHome: "Accueil",
    navBiosphere: "Biosphere Rocks",
    heroBadge: "Couche d'integrite deeptech",
    proofStatsInput: "Entree",
    proofStatsAnchor: "Ancrage",
    proofStatsVerify: "Verification",
    proofStatsInputValue: "Excel + JSON",
    proofStatsAnchorValue: "IOTA testnet",
    proofStatsVerifyValue: "Public + API",
    integrityEyebrow: "Integrite par conception",
    integrityText: "Des donnees operationnelles qui peuvent etre controlees, partagees et defendues.",
    integritySubtext:
      "Concu pour les organisations qui ont besoin de dossiers fiables pour les audits, l'examen public et la verification entre parties.",
    startExploring: "Commencer",
  },
  es: {
    heroTitle: "Proof of Records",
    heroTagline: "Convierte datos operativos en registros verificables anclados en IOTA",
    heroDescription:
      "De hojas de calculo y JSON a proof verificable de forma independiente, creada para trazabilidad, auditabilidad y confianza.",
    heroDifferentiator:
      "La mayoria de los sistemas certifican archivos. Proof of Records certifica los datos subyacentes.",
    ctaPrimary: "Abrir aplicacion",
    ctaSecondary: "Ver demo",
    problemTitle: "El problema",
    problemText:
      "Las hojas de calculo, registros y datos operativos pueden ser modificados, duplicados o cuestionados despues del hecho. Las organizaciones necesitan integridad, trazabilidad y verificacion publica.",
    solutionTitle: "La solucion",
    solutionText:
      "Proof of Records canoniza datos estructurados, genera hashes deterministas, ancla pruebas en IOTA y expone rutas de verificacion publica.",
    howItWorks: "Como funciona",
    howItWorksText:
      "Un flujo simple que mantiene la operacion familiar mientras agrega una capa criptografica de prueba.",
    features: "Caracteristicas",
    featuresText:
      "Disenado para flujos reales de prueba operativa, con verificacion, evidencia y entregables para auditorias y confianza publica.",
    useCases: "Casos de uso",
    useCasesText:
      "Pensado para sectores donde los registros estructurados deben seguir siendo verificables en el tiempo y entre organizaciones.",
    trustTitle: "Disenado para registros de alta integridad.",
    trustText:
      "Construido con infraestructura Biosphere, anclado en IOTA testnet, y disenado para datos operativos verificables por organizaciones, aliados y publico.",
    notarizationTitle: "Mas que notarizacion documental",
    notarizationText:
      "Proof of Records no se limita a un tipo de archivo ni a un solo flujo de trabajo. Proporciona una capa de confianza reutilizable para datos operativos en reporting, cumplimiento, supply chain, impacto y mas alla.",
    aboutBiosphereTitle: "Sobre Biosphere Rocks",
    aboutBiosphereText:
      "Proof of Records es una capa operativa de la infraestructura mas amplia de Biosphere Rocks, un sistema disenado para hacer que los datos del mundo real sean verificables, trazables y auditables.",
    aboutBiosphereLink: "Explorar Biosphere Rocks",
    finalTitle: "Lleva registros verificables al flujo de trabajo que ya utilizas.",
    finalPrimary: "Abrir dashboard",
    finalSecondary: "Explorar proofs",
    biosphereLine: "Parte del ecosistema Biosphere Rocks",
    biosphereFooter: "Construido como parte de la infraestructura Biosphere Rocks",
    navProofs: "Registros de proof",
    navLaunch: "Abrir aplicacion",
    navHome: "Home",
    navBiosphere: "Biosphere Rocks",
    heroBadge: "Capa deeptech de integridad",
    proofStatsInput: "Entrada",
    proofStatsAnchor: "Anclaje",
    proofStatsVerify: "Verificacion",
    proofStatsInputValue: "Excel + JSON",
    proofStatsAnchorValue: "IOTA testnet",
    proofStatsVerifyValue: "Publico + API",
    integrityEyebrow: "Integridad por diseno",
    integrityText: "Datos operativos que pueden verificarse, compartirse y sostenerse.",
    integritySubtext:
      "Creado para organizaciones que necesitan registros solidos frente a auditorias, escrutinio publico y verificacion entre partes.",
    startExploring: "Comenzar",
  },
} satisfies Record<Lang, Record<string, string>>;

const featureCards = [
  {
    title: {
      en: "Excel + JSON input",
      fr: "Entree Excel + JSON",
      es: "Entrada Excel + JSON",
    },
    description: {
      en: "Start from spreadsheets or structured API payloads without changing operational workflows.",
      fr: "Commencez a partir de feuilles de calcul ou de payloads structures sans changer les operations.",
      es: "Comienza desde hojas de calculo o payloads estructurados sin cambiar los flujos operativos.",
    },
  },
  {
    title: {
      en: "Optional photo evidence",
      fr: "Preuve photo optionnelle",
      es: "Evidencia fotografica opcional",
    },
    description: {
      en: "Attach supporting visual evidence and bind it to the proof record.",
      fr: "Ajoutez une preuve visuelle et liez-la a l'enregistrement de preuve.",
      es: "Adjunta evidencia visual y vincúlala al registro de prueba.",
    },
  },
  {
    title: {
      en: "Public proof page",
      fr: "Page publique de preuve",
      es: "Pagina publica de proof",
    },
    description: {
      en: "Publish a verification page that can be shared with partners, auditors, and the public.",
      fr: "Publiez une page de verification partageable avec partenaires, auditeurs et public.",
      es: "Publica una pagina de verificacion para socios, auditores y publico.",
    },
  },
  {
    title: {
      en: "Proof bundle export",
      fr: "Export du bundle",
      es: "Exportacion del bundle",
    },
    description: {
      en: "Download canonical proof data for archival, audits, or downstream systems.",
      fr: "Telechargez les donnees canoniques pour archivage, audits ou systemes tiers.",
      es: "Descarga datos canonicos para archivo, auditorias o sistemas externos.",
    },
  },
  {
    title: {
      en: "Merkle proof mode",
      fr: "Mode de preuve Merkle",
      es: "Modo de prueba Merkle",
    },
    description: {
      en: "Enable record-level verification while anchoring a single root commitment on-chain.",
      fr: "Permet une verification par enregistrement avec un seul root ancre on-chain.",
      es: "Permite verificacion por registro anclando una sola raiz on-chain.",
    },
  },
  {
    title: {
      en: "API integration",
      fr: "Integration API",
      es: "Integracion API",
    },
    description: {
      en: "Use protected endpoints for automated proof creation and verification pipelines.",
      fr: "Utilisez des endpoints proteges pour des pipelines automatises de preuve et verification.",
      es: "Usa endpoints protegidos para pipelines automatizados de prueba y verificacion.",
    },
  },
] satisfies Array<{ title: Record<Lang, string>; description: Record<Lang, string> }>;

const useCases = {
  en: ["Waste traceability", "ESG reporting", "Compliance logs", "Media / news integrity", "Supply chain event"],
  fr: ["Traçabilite des dechets", "Reporting ESG", "Journaux de conformite", "Integrite media / info", "Evenement supply chain"],
  es: ["Trazabilidad de residuos", "Reportes ESG", "Logs de cumplimiento", "Integridad de medios / noticias", "Evento supply chain"],
} satisfies Record<Lang, string[]>;

const steps = [
  {
    number: "01",
    title: {
      en: "Upload data",
      fr: "Importer les donnees",
      es: "Subir datos",
    },
    description: {
      en: "Bring in operational records from Excel or JSON inputs.",
      fr: "Importez des enregistrements operationnels depuis Excel ou JSON.",
      es: "Incorpora registros operativos desde Excel o JSON.",
    },
  },
  {
    number: "02",
    title: {
      en: "Generate proof",
      fr: "Generer la preuve",
      es: "Generar proof",
    },
    description: {
      en: "Canonicalize the dataset and create a deterministic integrity commitment.",
      fr: "Canonicalisez le dataset et creez un engagement deterministe d'integrite.",
      es: "Canoniza el dataset y crea un compromiso determinista de integridad.",
    },
  },
  {
    number: "03",
    title: {
      en: "Anchor on IOTA",
      fr: "Ancrer sur IOTA",
      es: "Anclar en IOTA",
    },
    description: {
      en: "Register the proof on IOTA testnet without exposing blockchain complexity to the operator.",
      fr: "Enregistrez la preuve sur IOTA testnet sans exposer la complexite blockchain.",
      es: "Registra la proof en IOTA testnet sin exponer complejidad blockchain.",
    },
  },
  {
    number: "04",
    title: {
      en: "Verify publicly",
      fr: "Verifier publiquement",
      es: "Verificar publicamente",
    },
    description: {
      en: "Share a public proof page, bundle, or verification endpoint for third-party review.",
      fr: "Partagez une page publique, un bundle, ou un endpoint de verification.",
      es: "Comparte una pagina publica, bundle o endpoint de verificacion.",
    },
  },
] satisfies Array<{ number: string; title: Record<Lang, string>; description: Record<Lang, string> }>;

function sectionTitle(eyebrow: string, title: string, description: string) {
  return (
    <div style={{ maxWidth: 760 }}>
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: 12,
          letterSpacing: 1.8,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>
      <h2
        style={{
          margin: "10px 0 0 0",
          fontSize: "clamp(28px, 4vw, 42px)",
          lineHeight: 1.05,
          color: "#ffffff",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "14px 0 0 0",
          color: "#b4b8c2",
          fontSize: 17,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "fr" || saved === "es") {
      setLang(saved);
    }
  }, []);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };

  const t = translations[lang];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at 85% 12%, rgba(80,120,255,0.12), transparent 24%), #050505",
        color: "#ffffff",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 20px 96px 20px", position: "relative" }}>
        <Navbar
          lang={lang}
          onChangeLang={changeLang}
          title={t.heroTitle}
          subtitle="Verifiable data infrastructure"
          homeLabel={t.navHome}
          biosphereLabel={t.navBiosphere}
          proofRecordsLabel={t.navProofs}
          launchLabel={t.navLaunch}
        />

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 28,
            alignItems: "stretch",
            padding: "24px 0 72px 0",
          }}
        >
          <div
            style={{
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              padding: "36px 32px",
              boxShadow: "0 28px 80px rgba(0,0,0,0.35)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#9ca3af",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.8,
              }}
            >
              {t.heroTagline}
            </p>
            <h1
              style={{
                margin: "14px 0 0 0",
                fontSize: "clamp(42px, 8vw, 82px)",
                lineHeight: 0.95,
                letterSpacing: -2,
              }}
            >
              {t.heroTitle}
            </h1>
            <p
              style={{
                margin: "22px 0 0 0",
                color: "#c7cbd4",
                fontSize: 19,
                lineHeight: 1.75,
                maxWidth: 620,
              }}
            >
              {t.heroDescription}
            </p>
            <p
              style={{
                margin: "12px 0 0 0",
                color: "#9ca3af",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {t.biosphereLine}
            </p>
            <p
              style={{
                margin: "16px 0 0 0",
                color: "#f3f4f6",
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 640,
              }}
            >
              {t.heroDifferentiator}
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 30 }}>
              <Link
                href="/upload"
                style={{
                  textDecoration: "none",
                  color: "#050505",
                  background: "#f3f4f6",
                  padding: "14px 18px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {t.ctaPrimary}
              </Link>
              <Link
                href="/dashboard"
                style={{
                  textDecoration: "none",
                  color: "#f3f4f6",
                  padding: "14px 18px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 15,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {t.ctaSecondary}
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
                marginTop: 34,
              }}
            >
              {[
                { label: t.proofStatsInput, value: t.proofStatsInputValue },
                { label: t.proofStatsAnchor, value: t.proofStatsAnchorValue },
                { label: t.proofStatsVerify, value: t.proofStatsVerifyValue },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.025)",
                    padding: "16px 18px",
                  }}
                >
                  <p style={{ margin: 0, color: "#818793", fontSize: 12, textTransform: "uppercase" }}>{item.label}</p>
                  <p style={{ margin: "8px 0 0 0", color: "#ffffff", fontSize: 18, fontWeight: 700 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderRadius: 28,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#0a0a0a",
              minHeight: 520,
              position: "relative",
              boxShadow: "0 28px 80px rgba(0,0,0,0.35)",
            }}
          >
            <Image
              src="/biosphere.jpg"
              alt="Biosphere infrastructure"
              fill
              style={{ objectFit: "cover", opacity: 0.28 }}
              priority
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.7) 58%, rgba(0,0,0,0.9) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f9fafb",
                    fontSize: 12,
                    letterSpacing: 0.6,
                  }}
                >
                  {t.heroBadge}
                </div>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "grid",
                    placeItems: "center",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Image src="/iota.png" alt="IOTA" width={32} height={32} style={{ objectFit: "contain" }} />
                </div>
              </div>

              <div
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(10,10,10,0.58)",
                  backdropFilter: "blur(10px)",
                  padding: "22px 22px 20px 22px",
                  maxWidth: 420,
                  alignSelf: "flex-end",
                }}
              >
                <p style={{ margin: 0, color: "#9ca3af", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  {t.integrityEyebrow}
                </p>
                <p style={{ margin: "10px 0 0 0", fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{t.integrityText}</p>
                <p style={{ margin: "12px 0 0 0", color: "#c7cbd4", fontSize: 15, lineHeight: 1.7 }}>
                  {t.integritySubtext}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "24px 0 72px 0" }}>
          {sectionTitle(t.problemTitle, t.problemTitle, t.problemText)}
        </section>

        <section style={{ padding: "0 0 80px 0" }}>
          {sectionTitle(t.solutionTitle, t.solutionTitle, t.solutionText)}
        </section>

        <section style={{ padding: "0 0 80px 0" }}>
          {sectionTitle(t.notarizationTitle, t.notarizationTitle, t.notarizationText)}
        </section>

        <section style={{ padding: "0 0 84px 0" }}>
          {sectionTitle(t.howItWorks, t.howItWorks, t.howItWorksText)}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            {steps.map((step) => (
              <div
                key={step.number}
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  padding: "22px 20px",
                }}
              >
                <p style={{ margin: 0, color: "#6b7280", fontSize: 13, letterSpacing: 1.2 }}>{step.number}</p>
                <h3 style={{ margin: "14px 0 0 0", fontSize: 22 }}>{step.title[lang]}</h3>
                <p style={{ margin: "12px 0 0 0", color: "#c7cbd4", lineHeight: 1.7, fontSize: 15 }}>
                  {step.description[lang]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: "0 0 84px 0" }}>
          {sectionTitle(t.features, t.features, t.featuresText)}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            {featureCards.map((feature) => (
              <div
                key={feature.title.en}
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  padding: "22px 20px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 21 }}>{feature.title[lang]}</h3>
                <p style={{ margin: "12px 0 0 0", color: "#c7cbd4", lineHeight: 1.7, fontSize: 15 }}>
                  {feature.description[lang]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: "0 0 84px 0" }}>
          {sectionTitle(t.useCases, t.useCases, t.useCasesText)}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
            {useCases[lang].map((item) => (
              <div
                key={item}
                style={{
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#eef2f7",
                  fontSize: 15,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: "28px 0 84px 0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              alignItems: "center",
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
              padding: "30px 26px",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 12, letterSpacing: 1.8, textTransform: "uppercase" }}>
                Trust / Infrastructure
              </p>
              <h2 style={{ margin: "12px 0 0 0", fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.08 }}>
                {t.trustTitle}
              </h2>
            </div>
            <div style={{ color: "#c7cbd4", fontSize: 16, lineHeight: 1.8 }}>{t.trustText}</div>
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                padding: "18px 18px 16px 18px",
                color: "#c7cbd4",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#9ca3af",
                  fontSize: 12,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {t.aboutBiosphereTitle}
              </p>
              <p style={{ margin: "10px 0 0 0", fontSize: 15, lineHeight: 1.7 }}>{t.aboutBiosphereText}</p>
              <Link
                href="https://www.biosphere.rocks"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginTop: 14,
                  textDecoration: "none",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 13,
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                {t.aboutBiosphereLink}
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            paddingTop: 10,
          }}
        >
          <div
            style={{
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "34px 28px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 12, letterSpacing: 1.8, textTransform: "uppercase" }}>
              {t.startExploring}
            </p>
            <h2 style={{ margin: "14px 0 0 0", fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1.06 }}>
              {t.finalTitle}
            </h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 26 }}>
              <Link
                href="/upload"
                style={{
                  textDecoration: "none",
                  color: "#050505",
                  background: "#f3f4f6",
                  padding: "14px 18px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {t.finalPrimary}
              </Link>
              <Link
                href="/dashboard"
                style={{
                  textDecoration: "none",
                  color: "#f3f4f6",
                  padding: "14px 18px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 15,
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {t.finalSecondary}
              </Link>
            </div>
            <p style={{ margin: "18px 0 0 0", color: "#8f96a3", fontSize: 13 }}>{t.biosphereFooter}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
