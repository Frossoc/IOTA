"use client";

import { useMemo, useState } from "react";

type Lang = "en" | "fr" | "es";
type Topic = "page" | "find" | "actions" | "anchored" | "practice";
type ViewMode = "home" | "guided" | "manual" | "topic";

type TopicContent = {
  label: string;
  title: string;
  body: string;
};

type GuidedStep = {
  title: string;
  body: string;
};

type Copy = {
  trigger: string;
  title: string;
  greeting: string;
  subtitle: string;
  guidedMode: string;
  manualMode: string;
  guidedIntro: string;
  back: string;
  close: string;
  restart: string;
  gotIt: string;
  next: string;
  restartGuide: string;
  exitGuidedMode: string;
  topicsTitle: string;
  guideMe: string;
  options: Record<Topic, TopicContent>;
  guidedSteps: GuidedStep[];
};

const topicOrder: Topic[] = ["page", "find", "actions", "anchored", "practice"];

const copy: Record<Lang, Copy> = {
  en: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Hi, I'm StrategIA. I can help you understand how to use the proof dashboard.",
    subtitle: "Use this space to review what the list shows, what Anchored means, and how to work with stored proofs.",
    guidedMode: "Guide me step by step",
    manualMode: "Explore manually",
    guidedIntro: "Follow this quick walkthrough to move from the proof list to review, export, and sharing.",
    back: "Back",
    close: "Close",
    restart: "Restart",
    gotIt: "Got it",
    next: "Next",
    restartGuide: "Restart guide",
    exitGuidedMode: "Exit guide",
    topicsTitle: "Choose a topic",
    guideMe: "Guide me step by step",
    options: {
      page: {
        label: "What is this page?",
        title: "What is this page?",
        body: "This page lists stored proofs so you can review records that were already generated. It is the easiest place to revisit past proofs without recreating them.",
      },
      find: {
        label: "How do I find a proof?",
        title: "How do I find a proof?",
        body: "Use the search field for project names and the process type filter to narrow the list. The newest proofs appear first, so recent activity is usually visible right away.",
      },
      actions: {
        label: "What can I do with a proof?",
        title: "What can I do with a proof?",
        body: "From each row you can open the public proof page or download the bundle. This helps you inspect the record, share it, and keep a portable copy for later review.",
      },
      anchored: {
        label: "What does Anchored mean?",
        title: "What does Anchored mean?",
        body: "Anchored means the record was processed into a verifiable proof and linked to blockchain-backed integrity. It gives the proof an external reference that can be checked later.",
      },
      practice: {
        label: "How do I use this in practice?",
        title: "How do I use this in practice?",
        body: "Teams can use this dashboard to review, share, and organize proofs over time. It works well as an operational record layer for audits, reporting, and traceability workflows.",
      },
    },
    guidedSteps: [
      {
        title: "Find a proof",
        body: "Start by scanning recent rows or filtering by project and process type. The list is meant to help you quickly identify the proof you want to revisit.",
      },
      {
        title: "Open it",
        body: "Use View Proof to open the public proof page. That gives you a readable overview of the stored record and its integrity references.",
      },
      {
        title: "Inspect the summary",
        body: "Review the core proof information first so you can confirm what the record represents before going deeper into details or sharing it.",
      },
      {
        title: "Download the bundle",
        body: "Use Bundle when you need the portable JSON package. It is useful for keeping an archive or handing the proof to another system or reviewer.",
      },
      {
        title: "Verify or share",
        body: "Once you have reviewed the record, you can verify it independently or share the public proof page and bundle with others.",
      },
    ],
  },
  fr: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Bonjour, je suis StrategIA. Je peux vous aider à comprendre comment utiliser le dashboard des preuves.",
    subtitle: "Utilisez cet espace pour comprendre ce que montre la liste, ce que signifie Anchored, et comment exploiter les preuves enregistrées.",
    guidedMode: "Guide pas à pas",
    manualMode: "Explorer manuellement",
    guidedIntro: "Suivez ce court parcours pour passer de la liste des preuves à la revue, l’export, et le partage.",
    back: "Retour",
    close: "Fermer",
    restart: "Recommencer",
    gotIt: "Compris",
    next: "Suivant",
    restartGuide: "Relancer le guide",
    exitGuidedMode: "Quitter le guide",
    topicsTitle: "Choisissez un sujet",
    guideMe: "Guide pas à pas",
    options: {
      page: {
        label: "Qu’est-ce que cette page ?",
        title: "Qu’est-ce que cette page ?",
        body: "Cette page liste les preuves enregistrées afin de revoir des enregistrements déjà générés. C’est l’endroit le plus simple pour retrouver des preuves passées sans les recréer.",
      },
      find: {
        label: "Comment trouver une preuve ?",
        title: "Comment trouver une preuve ?",
        body: "Utilisez la recherche par nom de projet et le filtre par type de processus pour réduire la liste. Les preuves les plus récentes apparaissent en premier, ce qui facilite la consultation rapide.",
      },
      actions: {
        label: "Que puis-je faire avec une preuve ?",
        title: "Que puis-je faire avec une preuve ?",
        body: "Depuis chaque ligne, vous pouvez ouvrir la page publique de la preuve ou télécharger le bundle. Cela permet d’inspecter l’enregistrement, de le partager, et d’en conserver une copie portable.",
      },
      anchored: {
        label: "Que signifie Anchored ?",
        title: "Que signifie Anchored ?",
        body: "Anchored signifie que l’enregistrement a été traité comme une preuve vérifiable et relié à une couche d’intégrité soutenue par la blockchain. Cela fournit une référence externe vérifiable par la suite.",
      },
      practice: {
        label: "Comment l’utiliser en pratique ?",
        title: "Comment l’utiliser en pratique ?",
        body: "Les équipes peuvent utiliser ce dashboard pour revoir, partager, et organiser les preuves dans le temps. Il sert de couche de suivi opérationnel pour l’audit, le reporting, et la traçabilité.",
      },
    },
    guidedSteps: [
      {
        title: "Trouver une preuve",
        body: "Commencez par parcourir les lignes récentes ou filtrez par projet et type de processus. La liste est pensée pour vous aider à repérer rapidement la preuve à revoir.",
      },
      {
        title: "L’ouvrir",
        body: "Utilisez View Proof pour ouvrir la page publique de la preuve. Vous obtenez ainsi une vue lisible de l’enregistrement et de ses références d’intégrité.",
      },
      {
        title: "Inspecter le résumé",
        body: "Relisez d’abord les informations essentielles afin de confirmer ce que représente l’enregistrement avant d’aller plus loin ou de le partager.",
      },
      {
        title: "Télécharger le bundle",
        body: "Utilisez Bundle si vous avez besoin du package JSON portable. C’est utile pour l’archivage ou pour transmettre la preuve à un autre système ou à un auditeur.",
      },
      {
        title: "Vérifier ou partager",
        body: "Une fois l’enregistrement relu, vous pouvez le vérifier indépendamment ou partager la page publique et le bundle avec d’autres personnes.",
      },
    ],
  },
  es: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Hola, soy StrategIA. Puedo ayudarte a entender cómo usar el dashboard de proofs.",
    subtitle: "Usa este espacio para entender qué muestra la lista, qué significa Anchored y cómo trabajar con proofs guardadas.",
    guidedMode: "Guía paso a paso",
    manualMode: "Explorar manualmente",
    guidedIntro: "Sigue este recorrido corto para pasar de la lista de proofs a la revisión, exportación y compartición.",
    back: "Volver",
    close: "Cerrar",
    restart: "Reiniciar",
    gotIt: "Entendido",
    next: "Siguiente",
    restartGuide: "Reiniciar guía",
    exitGuidedMode: "Salir de la guía",
    topicsTitle: "Elige un tema",
    guideMe: "Guía paso a paso",
    options: {
      page: {
        label: "¿Qué es esta página?",
        title: "¿Qué es esta página?",
        body: "Esta página lista las proofs guardadas para que puedas revisar registros ya generados. Es la forma más sencilla de volver a proofs anteriores sin recrearlas.",
      },
      find: {
        label: "¿Cómo encuentro una proof?",
        title: "¿Cómo encuentro una proof?",
        body: "Usa la búsqueda por nombre de proyecto y el filtro por tipo de proceso para acotar la lista. Las proofs más recientes aparecen primero, así que la actividad reciente suele verse enseguida.",
      },
      actions: {
        label: "¿Qué puedo hacer con una proof?",
        title: "¿Qué puedo hacer con una proof?",
        body: "Desde cada fila puedes abrir la página pública de la proof o descargar el bundle. Esto te permite inspeccionar el registro, compartirlo y conservar una copia portable.",
      },
      anchored: {
        label: "¿Qué significa Anchored?",
        title: "¿Qué significa Anchored?",
        body: "Anchored significa que el registro fue procesado como una proof verificable y vinculado a una capa de integridad respaldada por blockchain. Eso aporta una referencia externa que puede comprobarse después.",
      },
      practice: {
        label: "¿Cómo lo uso en la práctica?",
        title: "¿Cómo lo uso en la práctica?",
        body: "Los equipos pueden usar este dashboard para revisar, compartir y organizar proofs a lo largo del tiempo. Funciona como una capa operativa para auditoría, reporting y trazabilidad.",
      },
    },
    guidedSteps: [
      {
        title: "Encuentra una proof",
        body: "Empieza revisando las filas recientes o filtrando por proyecto y tipo de proceso. La lista está pensada para ayudarte a localizar rápidamente la proof que quieres revisar.",
      },
      {
        title: "Ábrela",
        body: "Usa View Proof para abrir la página pública de la proof. Así obtienes una vista legible del registro guardado y de sus referencias de integridad.",
      },
      {
        title: "Revisa el resumen",
        body: "Primero revisa la información principal para confirmar qué representa el registro antes de entrar en más detalle o compartirlo.",
      },
      {
        title: "Descarga el bundle",
        body: "Usa Bundle cuando necesites el paquete JSON portable. Es útil para archivar la proof o entregarla a otro sistema o revisor.",
      },
      {
        title: "Verifica o comparte",
        body: "Una vez revisado el registro, puedes verificarlo de forma independiente o compartir la página pública y el bundle con otras personas.",
      },
    ],
  },
};

function isLang(value: string | null): value is Lang {
  return value === "en" || value === "fr" || value === "es";
}

export default function AskStrategIADashboard() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    try {
      const saved = window.localStorage.getItem("lang");
      return isLang(saved) ? saved : "en";
    } catch {
      return "en";
    }
  });
  const [view, setView] = useState<ViewMode>("home");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const t = copy[lang];
  const currentStep = t.guidedSteps[stepIndex] ?? null;
  const currentTopic = topic ? t.options[topic] : null;
  const atLastStep = stepIndex >= t.guidedSteps.length - 1;

  const languageButtons = useMemo(
    () =>
      (["en", "fr", "es"] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => {
            setLang(candidate);
            setView("home");
            setTopic(null);
            setStepIndex(0);
            try {
              window.localStorage.setItem("lang", candidate);
            } catch {}
          }}
          className={
            candidate === lang
              ? "text-green-300 opacity-100"
              : "text-white/60 transition hover:text-green-200 hover:opacity-100"
          }
        >
          {candidate.toUpperCase()}
        </button>
      )),
    [lang]
  );

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="relative w-[min(320px,calc(100vw-24px))] rounded-3xl border border-green-500/25 bg-[#090909] p-4 text-white shadow-2xl shadow-black/50">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-green-500/10 pb-3 pr-14">
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">{t.title}</div>
              <div className="mt-1 text-xs text-white/55">{t.subtitle}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setView("home");
                setTopic(null);
                setStepIndex(0);
              }}
              className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 transition hover:border-green-400/40 hover:text-white"
            >
              {t.close}
            </button>
          </div>

          <div className="absolute right-4 top-4 flex gap-2 text-[11px]">{languageButtons}</div>

          {view === "home" ? (
            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm leading-6 text-white/88">
                <p className="m-0 font-medium text-white">{t.greeting}</p>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("guided");
                    setStepIndex(0);
                  }}
                  className="rounded-2xl border border-green-500/30 bg-white/[0.02] px-3 py-2 text-left text-sm text-white transition hover:border-green-400/45 hover:text-green-100"
                >
                  {t.guidedMode}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("manual");
                    setTopic(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-white transition hover:border-green-400/35 hover:text-green-100"
                >
                  {t.manualMode}
                </button>
              </div>
            </div>
          ) : null}

          {view === "manual" ? (
            <div className="grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t.topicsTitle}</div>
              <div className="grid gap-2">
                {topicOrder.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setTopic(entry);
                      setView("topic");
                    }}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-white transition hover:border-green-400/35 hover:text-green-100"
                  >
                    {t.options[entry].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("home")}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-green-400/35 hover:text-white"
                >
                  {t.back}
                </button>
              </div>
            </div>
          ) : null}

          {view === "topic" && currentTopic ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="text-sm font-semibold text-white">{currentTopic.title}</div>
                <p className="mt-2 text-sm leading-6 text-white/82">{currentTopic.body}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("manual");
                    setTopic(null);
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-green-400/35 hover:text-white"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setView("home");
                    setTopic(null);
                  }}
                  className="rounded-full border border-green-500/30 px-3 py-1.5 text-xs text-green-200 transition hover:border-green-400/45 hover:text-green-100"
                >
                  {t.gotIt}
                </button>
              </div>
            </div>
          ) : null}

          {view === "guided" && currentStep ? (
            <div className="grid gap-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t.guideMe}</div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="text-sm font-semibold text-white">{currentStep.title}</div>
                <p className="mt-2 text-sm leading-6 text-white/82">
                  {stepIndex === 0 ? `${t.guidedIntro} ` : ""}
                  {currentStep.body}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex === 0) {
                      setView("home");
                      return;
                    }
                    setStepIndex((current) => Math.max(0, current - 1));
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-green-400/35 hover:text-white"
                >
                  {t.back}
                </button>
                {!atLastStep ? (
                  <button
                    type="button"
                    onClick={() => setStepIndex((current) => Math.min(t.guidedSteps.length - 1, current + 1))}
                    className="rounded-full border border-green-500/30 px-3 py-1.5 text-xs text-green-200 transition hover:border-green-400/45 hover:text-green-100"
                  >
                    {t.next}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStepIndex(0)}
                    className="rounded-full border border-green-500/30 px-3 py-1.5 text-xs text-green-200 transition hover:border-green-400/45 hover:text-green-100"
                  >
                    {t.restartGuide}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setView("home");
                    setStepIndex(0);
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-green-400/35 hover:text-white"
                >
                  {t.exitGuidedMode}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-green-500/30 bg-[#090909] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/40 transition hover:border-green-400/45 hover:text-green-100"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
        {t.trigger}
      </button>
    </div>
  );
}
