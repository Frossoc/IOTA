"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VerifyResponse } from "@/app/types/records";

type VerifyApiError = {
  error?: string;
};
const AUTO_VERIFY_FROM_HANDOFF = false;

export default function VerifyPage() {
  const searchParams = useSearchParams();

  const [expectedEventHash, setExpectedEventHash] = useState("");
  const [canonicalString, setCanonicalString] = useState("");
  const [txId, setTxId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);

  useEffect(() => {
    const expected = searchParams.get("expected_event_hash") ?? "";
    const tx = searchParams.get("txId") ?? "";
    setExpectedEventHash(expected);
    setTxId(tx);
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("por:last_proof");
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        canonical_string?: unknown;
        event_hash?: unknown;
        txId?: unknown;
      };

      if (
        typeof parsed.canonical_string === "string" &&
        parsed.canonical_string.trim().length > 0 &&
        typeof parsed.event_hash === "string" &&
        parsed.event_hash.trim().length > 0
      ) {
        setCanonicalString(parsed.canonical_string);
        setExpectedEventHash(parsed.event_hash);
        if (typeof parsed.txId === "string" && parsed.txId.trim().length > 0) {
          setTxId(parsed.txId);
        }
      }
    } catch {
      // Ignore malformed local cache and keep manual flow available.
    }
  }, []);

  const onVerify = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical_string: canonicalString,
          expected_event_hash: expectedEventHash,
          txId: txId || undefined,
        }),
      });

      const data = (await response.json()) as VerifyResponse | VerifyApiError;

      if (!response.ok || !("ok" in data && data.ok)) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Verification failed.";
        setErrorMessage(message);
        return;
      }

      setResult(data);
    } catch {
      setErrorMessage("Verification failed.");
    } finally {
      setLoading(false);
    }
  }, [canonicalString, expectedEventHash, txId]);

  useEffect(() => {
    if (
      AUTO_VERIFY_FROM_HANDOFF &&
      !hasAutoVerified &&
      canonicalString.trim().length > 0 &&
      expectedEventHash.trim().length > 0
    ) {
      setHasAutoVerified(true);
      void onVerify();
    }
  }, [canonicalString, expectedEventHash, hasAutoVerified, onVerify]);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Verify Proof</h1>
      <p style={{ marginTop: 8 }}>
        Verify a canonical payload hash against an expected event hash.
      </p>

      <label style={{ display: "block", marginTop: 16 }}>
        <span style={{ fontWeight: 600 }}>expected_event_hash</span>
        <input
          value={expectedEventHash}
          onChange={(event) => setExpectedEventHash(event.target.value)}
          placeholder="sha256 hex"
          style={{
            width: "100%",
            marginTop: 6,
            borderRadius: 10,
            border: "1px solid #ccc",
            padding: "10px 12px",
          }}
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        <span style={{ fontWeight: 600 }}>canonical_string</span>
        <textarea
          value={canonicalString}
          onChange={(event) => setCanonicalString(event.target.value)}
          rows={10}
          placeholder='{"rows":[...],"version":"1"}'
          style={{
            width: "100%",
            marginTop: 6,
            borderRadius: 10,
            border: "1px solid #ccc",
            padding: "10px 12px",
            fontFamily: "monospace",
          }}
        />
      </label>

      <button
        onClick={onVerify}
        disabled={loading}
        style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          fontWeight: 600,
          background: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Verifying..." : "Verify"}
      </button>

      {errorMessage ? <p style={{ marginTop: 12, color: "crimson" }}>{errorMessage}</p> : null}

      {result ? (
        <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <p>
            <strong>Computed hash:</strong> <code>{result.computed_event_hash ?? "(none)"}</code>
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>Expected hash:</strong> <code>{result.expected_event_hash ?? "(none)"}</code>
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>Match:</strong>{" "}
            {result.match === null || result.match === undefined
              ? "Not comparable"
              : result.match
                ? "Yes"
                : "No"}
          </p>

          {result.explorer ? (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontWeight: 600 }}>Explorer links</p>
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {result.explorer.tx ? (
                  <li>
                    <a href={result.explorer.tx} target="_blank" rel="noreferrer">
                      Transaction
                    </a>
                  </li>
                ) : null}
                {result.explorer.object ? (
                  <li>
                    <a href={result.explorer.object} target="_blank" rel="noreferrer">
                      Object
                    </a>
                  </li>
                ) : null}
                {result.explorer.package ? (
                  <li>
                    <a href={result.explorer.package} target="_blank" rel="noreferrer">
                      Package
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
