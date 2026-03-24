"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Lang = "en" | "fr" | "es";
type Topic = "create" | "verify" | "summary" | "technical" | "integrations";
type ViewMode = "home" | "manual" | "guided" | "why";
type ContextType = "upload" | "verify" | "default";
type ActionKey =
  | "goToCreateProof"
  | "uploadYourFile"
  | "addPhotoEvidence"
  | "generateProofNow"
  | "viewProofSummary"
  | "viewDetails"
  | "openVerify"
  | "exploreIntegrations"
  | "exportProof";
type GuidedStep = {
  title: string;
  body: string;
  actions: ActionKey[];
};

type TopicContent = {
  label: string;
  title: string;
  body: string;
};

type Copy = {
  trigger: string;
  title: string;
  greeting: string;
  subtitle: string;
  contextualGreeting: Record<ContextType, string>;
  guidedMode: string;
  manualMode: string;
  whyThisMatters: string;
  whyThisMattersTitle: string;
  whyThisMattersBody: string[];
  guidedGreeting: string;
  guidedIntro: string;
  back: string;
  close: string;
  restart: string;
  gotIt: string;
  next: string;
  exitGuidedMode: string;
  exploreManually: string;
  restartGuide: string;
  manualTitle: string;
  guidedActionLabels: {
    [key in ActionKey]: string;
  };
  manualActionLabels: Record<Topic, string[]>;
  options: Record<Topic, TopicContent>;
  guidedSteps: GuidedStep[];
};

const copy: Record<Lang, Copy> = {
  en: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Hi, I'm StrategIA. I can guide you through Proof of Records and help you understand each step.",
    subtitle: "Choose how you want to explore the flow and I will keep it simple.",
    contextualGreeting: {
      upload: "You're in the Create Proof section. Start by uploading your data to generate your first proof.",
      verify: "You're in the verification section. Here you can check if a proof matches its expected integrity.",
      default: "Hi, I'm StrategIA. I can guide you through Proof of Records and help you understand each step.",
    },
    guidedMode: "Guided Mode",
    manualMode: "Explore Manually",
    whyThisMatters: "Why this matters",
    whyThisMattersTitle: "Why this matters",
    whyThisMattersBody: [
      "Most operational data can be edited, duplicated, or questioned after the fact.",
      "Proof of Records helps turn data into a verifiable record that can be checked independently for traceability, auditability, and trust.",
    ],
    guidedGreeting: "Hi, I'm StrategIA. I can guide you through your first Proof of Records.",
    guidedIntro: "Follow these short steps to see what happens, why it matters, and what comes next.",
    back: "Back",
    close: "Close",
    restart: "Restart",
    gotIt: "Got it",
    next: "Next",
    exitGuidedMode: "Exit guided mode",
    exploreManually: "Explore manually",
    restartGuide: "Restart guide",
    manualTitle: "Explore Manually",
    guidedActionLabels: {
      goToCreateProof: "Go to Create Proof",
      uploadYourFile: "Upload your file",
      addPhotoEvidence: "Add photo evidence",
      generateProofNow: "Generate proof now",
      viewProofSummary: "View Proof Summary",
      viewDetails: "View Details",
      openVerify: "Open Verify",
      exploreIntegrations: "Explore integrations",
      exportProof: "Export proof",
    },
    manualActionLabels: {
      create: ["Go to Create Proof"],
      verify: ["Open Verify"],
      summary: ["View Summary"],
      technical: ["View Details"],
      integrations: ["Explore integrations"],
    },
    options: {
      create: {
        label: "Create Proof",
        title: "Create Proof",
        body: "This is the main starting point for creating a new proof from your data. It is where you turn records into something verifiable later for traceability and review.",
      },
      verify: {
        label: "Verify",
        title: "Verify",
        body: "This section helps you confirm whether a proof matches its expected hash or blockchain record. It is useful when you need to check integrity without relying on trust alone.",
      },
      summary: {
        label: "Proof Summary",
        title: "Proof Summary",
        body: "Here you can review the proof in a readable format, inspect its core integrity information, and export a PDF summary for sharing or auditability.",
      },
      technical: {
        label: "Technical Details",
        title: "Technical Details",
        body: "This section exposes the technical proof metadata, including hashes, transaction details, identifiers, and canonical content used to support verification.",
      },
      integrations: {
        label: "Integrations",
        title: "Integrations",
        body: "This area is designed for platforms and external systems that want to generate proofs programmatically. It helps bring verifiable records into operational products and workflows.",
      },
    },
    guidedSteps: [
      {
        title: "Create Proof",
        body: "This is where your proof begins. You start with your data and prepare it to become a verifiable record. From here, the workflow moves into data preparation.",
        actions: ["goToCreateProof"],
      },
      {
        title: "Add Data",
        body: "Add your spreadsheet or structured dataset here. The system will normalize it and turn it into a deterministic proof base so it can be checked later.",
        actions: ["uploadYourFile"],
      },
      {
        title: "Add Evidence (optional)",
        body: "You can also attach photo evidence. This step is optional, but useful when your record needs visual support for traceability or audit context.",
        actions: ["addPhotoEvidence"],
      },
      {
        title: "Generate Proof",
        body: "When you generate the proof, the system creates a deterministic integrity record. That gives you a consistent proof that can later be verified independently.",
        actions: ["generateProofNow"],
      },
      {
        title: "Review Summary",
        body: "After generation, you can review the summary, inspect technical details, and export supporting proof files. This helps you confirm everything before sharing.",
        actions: ["viewProofSummary"],
      },
      {
        title: "Verify or Export",
        body: "You can verify your proof, download the summary, or export the bundle for sharing and auditing. This is the final step for independent checking and reuse.",
        actions: ["openVerify", "exportProof"],
      },
    ],
  },
  fr: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Bonjour, je suis StrategIA. Je peux vous guider dans Proof of Records et vous expliquer chaque étape.",
    subtitle: "Choisissez comment vous voulez explorer le parcours, et je vous l'expliquerai simplement.",
    contextualGreeting: {
      upload: "Vous êtes dans la section de création de preuve. Commencez par importer vos données.",
      verify: "Vous êtes dans la section de vérification. Vous pouvez vérifier l'intégrité d'une preuve.",
      default: "Bonjour, je suis StrategIA. Je peux vous guider dans Proof of Records et vous expliquer chaque étape.",
    },
    guidedMode: "Mode guidé",
    manualMode: "Explorer manuellement",
    whyThisMatters: "Pourquoi c’est important",
    whyThisMattersTitle: "Pourquoi c’est important",
    whyThisMattersBody: [
      "De nombreuses données opérationnelles peuvent être modifiées, dupliquées ou contestées après coup.",
      "Proof of Records aide à transformer ces données en un enregistrement vérifiable, contrôlable indépendamment pour la traçabilité, l’auditabilité et la confiance.",
    ],
    guidedGreeting: "Je peux vous guider dans votre premier Proof of Records.",
    guidedIntro: "Suivez ces étapes courtes pour comprendre ce que vous faites, pourquoi c’est utile, et ce qui vient ensuite.",
    back: "Retour",
    close: "Fermer",
    restart: "Recommencer",
    gotIt: "Compris",
    next: "Suivant",
    exitGuidedMode: "Quitter le mode guidé",
    exploreManually: "Explorer manuellement",
    restartGuide: "Relancer le guide",
    manualTitle: "Explorer manuellement",
    guidedActionLabels: {
      goToCreateProof: "Aller à Create Proof",
      uploadYourFile: "Importer votre fichier",
      addPhotoEvidence: "Ajouter une photo",
      generateProofNow: "Générer la preuve",
      viewProofSummary: "Voir Proof Summary",
      viewDetails: "Voir Details",
      openVerify: "Ouvrir Verify",
      exploreIntegrations: "Explorer les intégrations",
      exportProof: "Exporter la preuve",
    },
    manualActionLabels: {
      create: ["Aller à Create Proof"],
      verify: ["Ouvrir Verify"],
      summary: ["Voir Summary"],
      technical: ["Voir Details"],
      integrations: ["Explorer les intégrations"],
    },
    options: {
      create: {
        label: "Create Proof",
        title: "Create Proof",
        body: "C'est le point de départ principal pour créer une nouvelle preuve à partir de vos données. Vous transformez ici vos enregistrements en un actif vérifiable pour la traçabilité et le contrôle.",
      },
      verify: {
        label: "Verify",
        title: "Verify",
        body: "Cette section vous aide à confirmer qu'une preuve correspond bien au hash attendu ou à son enregistrement blockchain. C'est utile pour vérifier l'intégrité sans confiance implicite.",
      },
      summary: {
        label: "Proof Summary",
        title: "Proof Summary",
        body: "Ici, vous pouvez relire la preuve dans un format accessible, vérifier les informations essentielles, et exporter un PDF pour le partage ou l’auditabilité.",
      },
      technical: {
        label: "Technical Details",
        title: "Technical Details",
        body: "Cette section expose les métadonnées techniques de la preuve, notamment les hash, les détails de transaction, les identifiants et le contenu canonique utilisés pour la vérification.",
      },
      integrations: {
        label: "Integrations",
        title: "Integrations",
        body: "Cette zone est pensée pour les plateformes et systèmes externes qui veulent générer des preuves par programmation. Elle facilite l'intégration de données vérifiables dans des produits réels.",
      },
    },
    guidedSteps: [
      {
        title: "Create Proof",
        body: "C'est ici que votre preuve commence. Vous partez de vos données pour les transformer en un enregistrement vérifiable. L'étape suivante consiste à préparer les données à traiter.",
        actions: ["goToCreateProof"],
      },
      {
        title: "Add Data",
        body: "Ajoutez ici votre feuille de calcul ou vos données structurées. Le système les normalise afin de produire une base déterministe qui pourra être vérifiée plus tard.",
        actions: ["uploadYourFile"],
      },
      {
        title: "Add Evidence (optional)",
        body: "Vous pouvez aussi joindre une preuve photo. Cette étape est optionnelle, mais utile lorsque l'enregistrement a besoin d'un support visuel pour la traçabilité ou l'audit.",
        actions: ["addPhotoEvidence"],
      },
      {
        title: "Generate Proof",
        body: "Lorsque vous générez la preuve, le système crée un enregistrement d'intégrité déterministe. Vous obtenez ainsi une preuve cohérente qui pourra être vérifiée indépendamment.",
        actions: ["generateProofNow"],
      },
      {
        title: "Review Summary",
        body: "Après la génération, vous pouvez relire le résumé, vérifier les détails techniques, et exporter les fichiers utiles. Cela permet de confirmer la preuve avant de la partager.",
        actions: ["viewProofSummary"],
      },
      {
        title: "Verify or Export",
        body: "Vous pouvez vérifier la preuve, télécharger le résumé, ou exporter le bundle pour partage et audit. C'est l'étape finale pour le contrôle indépendant et la réutilisation.",
        actions: ["openVerify", "exportProof"],
      },
    ],
  },
  es: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Hola, soy StrategIA. Puedo guiarte en Proof of Records y ayudarte a entender cada paso.",
    subtitle: "Elige cómo quieres recorrer el flujo y te lo explico de forma simple.",
    contextualGreeting: {
      upload: "Estás en la sección de creación de prueba. Empieza subiendo tus datos.",
      verify: "Estás en la sección de verificación. Aquí puedes comprobar la integridad de una prueba.",
      default: "Hola, soy StrategIA. Puedo guiarte en Proof of Records y ayudarte a entender cada paso.",
    },
    guidedMode: "Modo guiado",
    manualMode: "Explorar manualmente",
    whyThisMatters: "Por qué importa",
    whyThisMattersTitle: "Por qué importa",
    whyThisMattersBody: [
      "Muchos datos operativos pueden modificarse, duplicarse o ponerse en duda después del hecho.",
      "Proof of Records ayuda a convertir esos datos en un registro verificable, comprobable de forma independiente para trazabilidad, auditabilidad y confianza.",
    ],
    guidedGreeting: "Puedo guiarte en tu primer Proof of Records.",
    guidedIntro: "Sigue estos pasos cortos para entender qué estás haciendo, por qué importa, y qué viene después.",
    back: "Volver",
    close: "Cerrar",
    restart: "Reiniciar",
    gotIt: "Entendido",
    next: "Siguiente",
    exitGuidedMode: "Salir del modo guiado",
    exploreManually: "Explorar manualmente",
    restartGuide: "Reiniciar guía",
    manualTitle: "Explorar manualmente",
    guidedActionLabels: {
      goToCreateProof: "Ir a Create Proof",
      uploadYourFile: "Sube tu archivo",
      addPhotoEvidence: "Agregar evidencia fotográfica",
      generateProofNow: "Generar proof ahora",
      viewProofSummary: "Ver Proof Summary",
      viewDetails: "Ver Details",
      openVerify: "Abrir Verify",
      exploreIntegrations: "Explorar integrations",
      exportProof: "Exportar proof",
    },
    manualActionLabels: {
      create: ["Ir a Create Proof"],
      verify: ["Abrir Verify"],
      summary: ["Ver Summary"],
      technical: ["Ver Details"],
      integrations: ["Explorar integrations"],
    },
    options: {
      create: {
        label: "Create Proof",
        title: "Create Proof",
        body: "Este es el punto principal para crear una nueva proof a partir de tus datos. Aquí conviertes registros en algo verificable después, con trazabilidad y contexto.",
      },
      verify: {
        label: "Verify",
        title: "Verify",
        body: "Esta sección te ayuda a confirmar si una proof coincide con su hash esperado o con su registro en blockchain. Sirve para comprobar integridad sin depender solo de la confianza.",
      },
      summary: {
        label: "Proof Summary",
        title: "Proof Summary",
        body: "Aquí puedes revisar la proof en un formato legible, consultar la información principal y exportar un PDF para compartir o respaldar auditorías.",
      },
      technical: {
        label: "Technical Details",
        title: "Technical Details",
        body: "Esta sección muestra los metadatos técnicos de la proof, incluyendo hashes, detalles de transacción, identificadores y contenido canónico usado para verificar.",
      },
      integrations: {
        label: "Integrations",
        title: "Integrations",
        body: "Esta área está pensada para plataformas y sistemas externos que quieren generar proofs de forma programática. Facilita integrar registros verificables en productos y flujos reales.",
      },
    },
    guidedSteps: [
      {
        title: "Create Proof",
        body: "Aquí empieza tu proof. Partes de tus datos para convertirlos en un registro verificable. El siguiente paso es preparar la información que vas a procesar.",
        actions: ["goToCreateProof"],
      },
      {
        title: "Add Data",
        body: "Agrega aquí tu hoja de cálculo o dataset estructurado. El sistema lo normaliza para construir una base determinista que pueda verificarse después.",
        actions: ["uploadYourFile"],
      },
      {
        title: "Add Evidence (optional)",
        body: "También puedes adjuntar evidencia fotográfica. Es opcional, pero útil cuando el registro necesita soporte visual para trazabilidad o auditoría.",
        actions: ["addPhotoEvidence"],
      },
      {
        title: "Generate Proof",
        body: "Cuando generas la proof, el sistema crea un registro determinista de integridad. Así obtienes una prueba consistente que luego puede verificarse de forma independiente.",
        actions: ["generateProofNow"],
      },
      {
        title: "Review Summary",
        body: "Después de generarla, puedes revisar el resumen, inspeccionar los detalles técnicos y exportar archivos de soporte. Eso te ayuda a confirmar todo antes de compartir.",
        actions: ["viewProofSummary"],
      },
      {
        title: "Verify or Export",
        body: "Puedes verificar la proof, descargar el resumen o exportar el bundle para compartir y auditar. Es el paso final para validación independiente y reutilización.",
        actions: ["openVerify", "exportProof"],
      },
    ],
  },
};

const topicOrder: Topic[] = ["create", "verify", "summary", "technical", "integrations"];

export default function AskStrategIA() {
  const router = useRouter();
  const [context] = useState<ContextType>(() => {
    if (typeof window === "undefined") {
      return "default";
    }

    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes("upload")) {
      return "upload";
    }
    if (pathname.includes("verify")) {
      return "verify";
    }
    return "default";
  });
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    const saved = window.localStorage.getItem("lang");
    return saved === "en" || saved === "fr" || saved === "es" ? saved : "en";
  });
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);

  const t = useMemo(() => copy[lang], [lang]);

  const reset = () => {
    setActiveTopic(null);
    setGuidedStepIndex(0);
    setViewMode("home");
  };

  const changeLang = (nextLang: Lang) => {
    setLang(nextLang);
    window.localStorage.setItem("lang", nextLang);
    setActiveTopic(null);
    setGuidedStepIndex(0);
    setViewMode("home");
  };

  const openGuidedMode = () => {
    setActiveTopic(null);
    setGuidedStepIndex(0);
    setViewMode("guided");
  };

  const openManualMode = () => {
    setActiveTopic(null);
    setGuidedStepIndex(0);
    setViewMode("manual");
  };

  const openWhyMode = () => {
    setActiveTopic(null);
    setGuidedStepIndex(0);
    setViewMode("why");
  };

  const closePanel = () => {
    setOpen(false);
    setActiveTopic(null);
    setGuidedStepIndex(0);
    setViewMode("home");
  };

  const guidedStep = t.guidedSteps[guidedStepIndex];
  const activeTopicContent = activeTopic ? t.options[activeTopic] : null;
  const isLastGuidedStep = guidedStepIndex === t.guidedSteps.length - 1;
  const greeting = t.contextualGreeting[context];

  const runAction = (action: ActionKey) => {
    const targetByAction: Record<ActionKey, string> = {
      goToCreateProof: "/upload?tab=create",
      uploadYourFile: "/upload?tab=create",
      addPhotoEvidence: "/upload?tab=create",
      generateProofNow: "/upload?tab=create",
      viewProofSummary: "/upload?tab=summary",
      viewDetails: "/upload?tab=technical",
      openVerify: "/upload?tab=verify",
      exploreIntegrations: "/upload?tab=integrations",
      exportProof: "/upload?tab=integrations",
    };

    router.push(targetByAction[action]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[320px] flex-col items-end gap-3">
      {open ? (
        <div className="relative w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-green-500/20 bg-[#0d0d0d] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="absolute right-3 top-3 flex gap-2 text-[11px]">
            {(["en", "fr", "es"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => changeLang(code)}
                className={`transition ${lang === code ? "font-bold text-green-300 opacity-100" : "text-gray-400 opacity-60 hover:text-green-200 hover:opacity-100"}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-start justify-between gap-3 border-b border-green-500/10 px-4 py-3 pr-20">
            <div>
              <p className="m-0 text-sm font-semibold text-white">{t.title}</p>
              <p className="m-0 mt-1 text-xs text-gray-400">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-full border border-gray-700 px-2 py-1 text-[11px] text-gray-300 transition hover:border-green-500/50 hover:text-green-200"
            >
              {t.close}
            </button>
          </div>

          <div className="px-4 py-4">
            {viewMode === "home" ? (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3 text-sm leading-6 text-gray-200">
                  {greeting}
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={openGuidedMode}
                    className="rounded-xl border border-green-500/30 bg-[#151515] px-3 py-2 text-left text-sm font-medium text-white transition hover:border-green-400/50 hover:bg-[#1a1a1a]"
                  >
                    {t.guidedMode}
                  </button>
                  <button
                    type="button"
                    onClick={openManualMode}
                    className="rounded-xl border border-gray-800 bg-[#111111] px-3 py-2 text-left text-sm text-gray-100 transition hover:border-green-500/40 hover:bg-[#171717]"
                  >
                    {t.manualMode}
                  </button>
                  <button
                    type="button"
                    onClick={openWhyMode}
                    className="rounded-xl border border-gray-800 bg-[#111111] px-3 py-2 text-left text-sm text-gray-100 transition hover:border-green-500/40 hover:bg-[#171717]"
                  >
                    {t.whyThisMatters}
                  </button>
                </div>
              </>
            ) : viewMode === "manual" && !activeTopic ? (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3 text-sm leading-6 text-gray-200">
                  {greeting}
                </div>

                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{t.manualTitle}</p>
                </div>

                <div className="mt-3 grid gap-2">
                  {topicOrder.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setActiveTopic(topic)}
                      className="rounded-xl border border-gray-800 bg-[#111111] px-3 py-2 text-left text-sm text-gray-100 transition hover:border-gray-600 hover:bg-[#171717]"
                    >
                      {t.options[topic].label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("home")}
                      className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                    >
                      {t.back}
                    </button>
                </div>
              </>
            ) : viewMode === "why" ? (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3">
                  <p className="m-0 text-sm font-semibold text-white">{t.whyThisMattersTitle}</p>
                  <p className="m-0 mt-2 text-sm leading-6 text-gray-300">{t.whyThisMattersBody[0]}</p>
                  <p className="m-0 mt-3 text-sm leading-6 text-gray-300">{t.whyThisMattersBody[1]}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => runAction("goToCreateProof")}
                      className="rounded-full border border-green-500/30 bg-white/5 px-3 py-2 text-xs font-medium text-green-200 transition hover:border-green-400/50 hover:bg-white/10 hover:text-green-100"
                    >
                      {t.guidedActionLabels.goToCreateProof}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("home")}
                    className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-full border border-green-500/30 bg-gray-100 px-3 py-2 text-xs font-semibold text-black transition hover:border-green-400/50 hover:bg-white"
                  >
                    {t.gotIt}
                  </button>
                </div>
              </>
            ) : viewMode === "guided" ? (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3">
                  <p className="m-0 text-sm font-semibold text-white">{t.guidedGreeting}</p>
                  <p className="m-0 mt-2 text-sm leading-6 text-gray-300">{t.guidedIntro}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-800 bg-[#111111] px-4 py-3">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {guidedStepIndex + 1} / {t.guidedSteps.length}
                  </p>
                  <p className="m-0 mt-2 text-sm font-semibold text-white">{guidedStep.title}</p>
                  <p className="m-0 mt-2 text-sm leading-6 text-gray-300">{guidedStep.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guidedStep.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => runAction(action)}
                        className="rounded-full border border-green-500/25 bg-white/5 px-3 py-2 text-xs font-medium text-gray-100 transition hover:border-green-400/50 hover:bg-white/10 hover:text-green-100"
                      >
                        {t.guidedActionLabels[action]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {guidedStepIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => setGuidedStepIndex((value) => value - 1)}
                      className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                    >
                      {t.back}
                    </button>
                  ) : null}

                  {!isLastGuidedStep ? (
                    <button
                      type="button"
                      onClick={() => setGuidedStepIndex((value) => Math.min(value + 1, t.guidedSteps.length - 1))}
                      className="rounded-full border border-green-500/30 bg-gray-100 px-3 py-2 text-xs font-semibold text-black transition hover:border-green-400/50 hover:bg-white"
                    >
                      {t.next}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setGuidedStepIndex(0)}
                        className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                      >
                        {t.restartGuide}
                      </button>
                      <button
                        type="button"
                        onClick={openManualMode}
                        className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                      >
                        {t.exploreManually}
                      </button>
                      <button
                        type="button"
                        onClick={closePanel}
                        className="rounded-full border border-green-500/30 bg-gray-100 px-3 py-2 text-xs font-semibold text-black transition hover:border-green-400/50 hover:bg-white"
                      >
                        {t.gotIt}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewMode("home")}
                    className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                  >
                    {t.exitGuidedMode}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3">
                  <p className="m-0 text-sm font-semibold text-white">{activeTopicContent?.title}</p>
                  <p className="m-0 mt-2 text-sm leading-6 text-gray-300">{activeTopicContent?.body}</p>
                  {activeTopic ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.manualActionLabels[activeTopic].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            runAction(
                              activeTopic === "create"
                                ? "goToCreateProof"
                                : activeTopic === "verify"
                                  ? "openVerify"
                                  : activeTopic === "summary"
                                    ? "viewProofSummary"
                                    : activeTopic === "technical"
                                      ? "viewDetails"
                                      : "exploreIntegrations"
                            )
                          }
                          className="rounded-full border border-green-500/25 bg-white/5 px-3 py-2 text-xs font-medium text-gray-100 transition hover:border-green-400/50 hover:bg-white/10 hover:text-green-100"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-green-500/50 hover:text-green-200"
                  >
                    {t.restart}
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-full border border-green-500/30 bg-gray-100 px-3 py-2 text-xs font-semibold text-black transition hover:border-green-400/50 hover:bg-white"
                  >
                    {t.gotIt}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-green-500/35 bg-[#111111] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition hover:border-green-400/50 hover:bg-[#181818]"
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {t.trigger}
        </span>
      </button>
    </div>
  );
}
