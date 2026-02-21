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
  const [objectId, setObjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);

  const loadLastProof = useCallback(() => {
    try {
      const raw = localStorage.getItem("por:last_proof");
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        canonical_string?: unknown;
        event_hash?: unknown;
        txId?: unknown;
        object_id?: unknown;
      };

      if (
        typeof parsed.canonical_string === "string" &&
        parsed.canonical_string.trim().length > 0 &&
        typeof parsed.event_hash === "string" &&
        parsed.event_hash.trim().length > 0
      ) {
        setCanonicalString(parsed.canonical_string);
        setExpectedEventHash(parsed.event_hash);
        if (typeof parsed.object_id === "string" && parsed.object_id.trim().length > 0) {
          setObjectId(parsed.object_id);
        } else if (typeof parsed.txId === "string" && parsed.txId.trim().length > 0) {
          // Backward-compatible fallback when old handoff only had txId.
          setObjectId(parsed.txId);
        }
      }
    } catch {
      // Ignore malformed local cache and keep manual flow available.
    }
  }, []);

  useEffect(() => {
    const expected = searchParams.get("expected_event_hash") ?? "";
    const objectFromQuery = searchParams.get("object_id") ?? searchParams.get("objectId") ?? "";
    setExpectedEventHash(expected);
    if (objectFromQuery) {
      setObjectId(objectFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    loadLastProof();
  }, [loadLastProof]);

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
          expected_event_hash: expectedEventHash.trim().length > 0 ? expectedEventHash : undefined,
          object_id: objectId.trim().length > 0 ? objectId : undefined,
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
  }, [canonicalString, expectedEventHash, objectId]);

  useEffect(() => {
    if (
      AUTO_VERIFY_FROM_HANDOFF &&
      !hasAutoVerified &&
      canonicalString.trim().length > 0 &&
      (expectedEventHash.trim().length > 0 || objectId.trim().length > 0)
    ) {
      setHasAutoVerified(true);
      void onVerify();
    }
  }, [canonicalString, expectedEventHash, objectId, hasAutoVerified, onVerify]);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Verify Proof</h1>
      <p style={{ marginTop: 8 }}>
        Verify local hash consistency and compare against the on-chain Proof object.
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
        <span style={{ fontWeight: 600 }}>object_id</span>
        <input
          value={objectId}
          onChange={(event) => setObjectId(event.target.value)}
          placeholder="0x... Proof object id on-chain"
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

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          onClick={onVerify}
          disabled={loading}
          style={{
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
        <button
          onClick={loadLastProof}
          type="button"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fafafa",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Use last proof
        </button>
      </div>

      {errorMessage ? <p style={{ marginTop: 12, color: "crimson" }}>{errorMessage}</p> : null}

      {result ? (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fcfcfc" }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Local Verification</p>
            <p>
              <strong>computed_event_hash:</strong> <code>{result.computed_event_hash ?? "(none)"}</code>
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>expected_event_hash:</strong> <code>{result.expected_event_hash ?? "(none)"}</code>
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>match:</strong>{" "}
              {result.match === null || result.match === undefined
                ? "Not comparable"
                : result.match
                  ? "Yes"
                  : "No"}
            </p>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fcfcfc" }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>On-Chain Verification</p>
            <p>
              <strong>onchain_event_hash:</strong> <code>{result.onchain_event_hash ?? "(none)"}</code>
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>match_onchain:</strong>{" "}
              {result.match_onchain === null || result.match_onchain === undefined
                ? "Not comparable"
                : result.match_onchain
                  ? "Yes"
                  : "No"}
            </p>
          </section>

          {result.explorer ? (
            <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fcfcfc" }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Explorer Links</p>
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
            </section>
          ) : null}

          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Raw Response JSON</p>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        </div>
      ) : null}
    </main>
  );
}
