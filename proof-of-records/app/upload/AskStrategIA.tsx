"use client";

import { useMemo, useState } from "react";

type Lang = "en" | "fr" | "es";
type Topic = "create" | "verify" | "summary" | "technical" | "integrations" | "guide";

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
  back: string;
  close: string;
  restart: string;
  gotIt: string;
  options: Record<Topic, TopicContent>;
};

const copy: Record<Lang, Copy> = {
  en: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Hi, I'm StrategIA. I can guide you through Proof of Records.",
    subtitle: "Choose a topic to get a quick guided explanation.",
    back: "Back",
    close: "Close",
    restart: "Restart",
    gotIt: "Got it",
    options: {
      create: {
        label: "Create Proof",
        title: "Create Proof",
        body: "This is where you create a new proof. Upload Excel or structured data, optionally attach photo evidence, choose the proof mode if available, and generate the proof.",
      },
      verify: {
        label: "Verify",
        title: "Verify",
        body: "This section is for checking an existing proof. You can compare local data against an expected hash or validate it against the on-chain proof reference.",
      },
      summary: {
        label: "Proof Summary",
        title: "Proof Summary",
        body: "Review the generated proof, inspect the main integrity information, and download the PDF summary when you need a shareable record.",
      },
      technical: {
        label: "Technical Details",
        title: "Technical Details",
        body: "This area shows advanced metadata such as the event hash, tx digest, object id, canonical content, and other technical proof information.",
      },
      integrations: {
        label: "Integrations",
        title: "Integrations",
        body: "Use /api/proof-json when external apps need to create proofs programmatically. This is useful for products and platforms such as bios.rocks.",
      },
      guide: {
        label: "Guide me step by step",
        title: "Step-by-step guide",
        body: "1. Create Proof. 2. Add data. 3. Add evidence if needed. 4. Generate the proof. 5. Review the summary. 6. Verify or export the result.",
      },
    },
  },
  fr: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Bonjour, je suis StrategIA. Je peux vous guider dans Proof of Records.",
    subtitle: "Choisissez un sujet pour obtenir une explication guidee.",
    back: "Retour",
    close: "Fermer",
    restart: "Recommencer",
    gotIt: "Compris",
    options: {
      create: {
        label: "Create Proof",
        title: "Create Proof",
        body: "C'est ici que vous creez une nouvelle preuve. Importez un fichier Excel ou des donnees structurees, ajoutez eventuellement une photo, choisissez le mode de preuve si disponible, puis generez la preuve.",
      },
      verify: {
        label: "Verify",
        title: "Verify",
        body: "Cette section sert a verifier une preuve existante. Vous pouvez comparer des donnees locales a un hash attendu ou verifier la reference ancree on-chain.",
      },
      summary: {
        label: "Proof Summary",
        title: "Proof Summary",
        body: "Consultez la preuve generee, verifiez les informations principales et telechargez le resume PDF pour le partage ou l'archivage.",
      },
      technical: {
        label: "Technical Details",
        title: "Technical Details",
        body: "Cette zone presente les metadonnees avancees comme l'event hash, le tx digest, l'object id, les donnees canoniques et d'autres informations techniques.",
      },
      integrations: {
        label: "Integrations",
        title: "Integrations",
        body: "Utilisez /api/proof-json lorsque des applications externes doivent creer des preuves par programmation. C'est utile pour des plateformes comme bios.rocks.",
      },
      guide: {
        label: "Guide me step by step",
        title: "Guide pas a pas",
        body: "1. Create Proof. 2. Ajoutez les donnees. 3. Ajoutez une preuve visuelle si besoin. 4. Generez la preuve. 5. Relisez le resume. 6. Verifiez ou exportez le resultat.",
      },
    },
  },
  es: {
    trigger: "Ask StrategIA",
    title: "Ask StrategIA",
    greeting: "Hola, soy StrategIA. Puedo guiarte por Proof of Records.",
    subtitle: "Elige un tema para recibir una explicacion guiada.",
    back: "Volver",
    close: "Cerrar",
    restart: "Reiniciar",
    gotIt: "Entendido",
    options: {
      create: {
        label: "Create Proof",
        title: "Create Proof",
        body: "Aqui es donde creas una nueva proof. Sube Excel o datos estructurados, adjunta evidencia fotografica si quieres, elige el modo de proof si esta disponible y genera la prueba.",
      },
      verify: {
        label: "Verify",
        title: "Verify",
        body: "Esta seccion sirve para verificar una proof existente. Puedes comparar datos locales contra un hash esperado o validar la referencia on-chain.",
      },
      summary: {
        label: "Proof Summary",
        title: "Proof Summary",
        body: "Revisa la proof generada, consulta la informacion principal y descarga el resumen en PDF cuando necesites un registro compartible.",
      },
      technical: {
        label: "Technical Details",
        title: "Technical Details",
        body: "Esta area muestra metadatos avanzados como event hash, tx digest, object id, datos canonicos y otra informacion tecnica de la proof.",
      },
      integrations: {
        label: "Integrations",
        title: "Integrations",
        body: "Usa /api/proof-json cuando aplicaciones externas necesiten crear proofs programaticamente. Es util para plataformas como bios.rocks.",
      },
      guide: {
        label: "Guide me step by step",
        title: "Guia paso a paso",
        body: "1. Create Proof. 2. Agrega datos. 3. Agrega evidencia si hace falta. 4. Genera la proof. 5. Revisa el resumen. 6. Verifica o exporta el resultado.",
      },
    },
  },
};

const topicOrder: Topic[] = ["create", "verify", "summary", "technical", "integrations", "guide"];

export default function AskStrategIA() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    const saved = window.localStorage.getItem("lang");
    return saved === "en" || saved === "fr" || saved === "es" ? saved : "en";
  });
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  const t = useMemo(() => copy[lang], [lang]);

  const reset = () => {
    setActiveTopic(null);
  };

  const changeLang = (nextLang: Lang) => {
    setLang(nextLang);
    window.localStorage.setItem("lang", nextLang);
    setActiveTopic(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[320px] flex-col items-end gap-3">
      {open ? (
        <div className="relative w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-gray-800 bg-[#0d0d0d] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="absolute right-3 top-3 flex gap-2 text-[11px]">
            {(["en", "fr", "es"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => changeLang(code)}
                className={`transition ${lang === code ? "font-bold text-white opacity-100" : "text-gray-400 opacity-60 hover:opacity-100"}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-start justify-between gap-3 border-b border-gray-800 px-4 py-3 pr-20">
            <div>
              <p className="m-0 text-sm font-semibold text-white">{t.title}</p>
              <p className="m-0 mt-1 text-xs text-gray-400">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-gray-700 px-2 py-1 text-[11px] text-gray-300 transition hover:border-gray-500 hover:text-white"
            >
              {t.close}
            </button>
          </div>

          <div className="px-4 py-4">
            {!activeTopic ? (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3 text-sm leading-6 text-gray-200">
                  {t.greeting}
                </div>

                <div className="mt-4 grid gap-2">
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
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-800 bg-[#141414] px-4 py-3">
                  <p className="m-0 text-sm font-semibold text-white">{t.options[activeTopic].title}</p>
                  <p className="m-0 mt-2 text-sm leading-6 text-gray-300">{t.options[activeTopic].body}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:text-white"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:text-white"
                  >
                    {t.restart}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-black transition hover:bg-white"
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
        className="rounded-full border border-gray-700 bg-[#111111] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition hover:border-gray-500 hover:bg-[#181818]"
      >
        {t.trigger}
      </button>
    </div>
  );
}
