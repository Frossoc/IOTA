"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Navbar, { type NavbarLang } from "@/app/components/Navbar";

type DashboardShellProps = {
  children: ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const [lang, setLang] = useState<NavbarLang>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    try {
      const saved = window.localStorage.getItem("lang");
      if (saved === "en" || saved === "fr" || saved === "es") {
        return saved;
      }
    } catch {}
    return "en";
  });

  const changeLang = (nextLang: NavbarLang) => {
    setLang(nextLang);
    try {
      window.localStorage.setItem("lang", nextLang);
    } catch {}
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#ffffff", padding: "32px 16px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
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
        {children}
      </div>
    </main>
  );
}
