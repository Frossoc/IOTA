"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProofOfRecordsModal from "@/app/components/ProofOfRecordsModal";

export type NavbarLang = "en" | "fr" | "es";

type NavbarProps = {
  lang: NavbarLang;
  onChangeLang: (lang: NavbarLang) => void;
  title: string;
  subtitle: string;
  homeLabel: string;
  biosphereLabel: string;
  proofRecordsLabel: string;
  dashboardLabel: string;
  launchLabel: string;
};

export default function Navbar({
  lang,
  onChangeLang,
  title,
  subtitle,
  homeLabel,
  biosphereLabel,
  proofRecordsLabel,
  dashboardLabel,
  launchLabel,
}: NavbarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          paddingBottom: 28,
          paddingTop: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "#101010",
              flexShrink: 0,
            }}
          >
            <Image src="/biosphere.jpg" alt="Biosphere" width={42} height={42} style={{ objectFit: "cover" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "#d1d5db", letterSpacing: 0.5 }}>{title}</p>
            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#6b7280" }}>{subtitle}</p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
            marginLeft: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#8e96a3",
                  fontSize: 13,
                }}
              >
                {homeLabel}
              </Link>
              <Link
                href="https://www.biosphere.rocks"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  color: "#8e96a3",
                  fontSize: 13,
                }}
              >
                {biosphereLabel}
              </Link>
            </nav>

            <div
              style={{
                display: "flex",
                gap: 8,
                zIndex: 2,
              }}
            >
              {(["en", "fr", "es"] as NavbarLang[]).map((code) => {
                const active = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeLang(code)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                      color: active ? "#ffffff" : "#aeb4bf",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {code.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                color: "#d1d5db",
                fontSize: 14,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {proofRecordsLabel}
            </button>
            <Link
              href="/dashboard"
              style={{
                textDecoration: "none",
                color: "#d1d5db",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {dashboardLabel}
            </Link>
            <Link
              href="/upload"
              style={{
                textDecoration: "none",
                color: "#050505",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 16px",
                borderRadius: 999,
                background: "#f3f4f6",
              }}
            >
              {launchLabel}
            </Link>
          </nav>
        </div>
      </header>

      <ProofOfRecordsModal lang={lang} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
