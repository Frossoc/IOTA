"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VerifyResponse } from "@/app/types/records";

type VerifyApiError = {
  error?: string;
};
const AUTO_VERIFY_FROM_HANDOFF = false;

function buildTxBlockUrl(txDigest: string, network?: string) {
  const net = (network ?? "testnet").trim();
  if (net === "mainnet") {
    return `https://explorer.iota.org/txblock/${txDigest}`;
  }
  return `https://explorer.iota.org/txblock/${txDigest}?network=${encodeURIComponent(net)}`;
}

function extractTxDigestFromExplorerUrl(urlValue: string): string | null {
  const trimmed = urlValue.trim();
  if (!trimmed) {
    return null;
  }

  const txBlockMatch = trimmed.match(/\/txblock\/([^/?#]+)/i);
  if (txBlockMatch?.[1]) {
    return decodeURIComponent(txBlockMatch[1]);
  }

  const txMatch = trimmed.match(/\/transaction\/([^/?#]+)/i);
  if (txMatch?.[1]) {
    return decodeURIComponent(txMatch[1]);
  }

  return null;
}

export default function VerifyPage() {
  const searchParams = useSearchParams();

  const [expectedEventHash, setExpectedEventHash] = useState("");
  const [canonicalString, setCanonicalString] = useState("");
  const [objectId, setObjectId] = useState("");
  const [txDigest, setTxDigest] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);

  const normalizedObjectId = objectId.trim();
  const normalizedTxDigest = txDigest.trim();
  const objectIdToSend =
    normalizedObjectId.length > 0 && normalizedObjectId.toLowerCase().startsWith("0x")
      ? normalizedObjectId
      : undefined;
  const txDigestToSend = normalizedTxDigest.length > 0 ? normalizedTxDigest : undefined;
  const resultWithTx = result as (VerifyResponse & { tx_digest?: string }) | null;
  const txDigestFromResponse =
    (resultWithTx?.tx_digest && resultWithTx.tx_digest.trim().length > 0
      ? resultWithTx.tx_digest.trim()
      : undefined) ??
    (result?.explorer?.tx ? extractTxDigestFromExplorerUrl(result.explorer.tx) ?? undefined : undefined) ??
    txDigestToSend;
  const transactionExplorerUrl = txDigestFromResponse ? buildTxBlockUrl(txDigestFromResponse, "testnet") : null;

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
        tx_digest?: unknown;
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
        }
        if (typeof parsed.tx_digest === "string" && parsed.tx_digest.trim().length > 0) {
          setTxDigest(parsed.tx_digest);
        } else if (typeof parsed.txId === "string" && parsed.txId.trim().length > 0) {
          setTxDigest(parsed.txId);
        }
      }
    } catch {
      // Ignore malformed local cache and keep manual flow available.
    }
  }, []);

  useEffect(() => {
    const expected = searchParams.get("expected_event_hash") ?? "";
    const objectFromQuery = searchParams.get("object_id") ?? searchParams.get("objectId") ?? "";
    const txFromQuery = searchParams.get("tx_digest") ?? searchParams.get("txId") ?? "";
    setExpectedEventHash(expected);
    if (objectFromQuery) {
      setObjectId(objectFromQuery);
    }
    if (txFromQuery) {
      setTxDigest(txFromQuery);
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
          object_id: objectIdToSend,
          tx_digest: txDigestToSend,
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
  }, [canonicalString, expectedEventHash, objectIdToSend, txDigestToSend]);

  useEffect(() => {
    if (
      AUTO_VERIFY_FROM_HANDOFF &&
      !hasAutoVerified &&
      canonicalString.trim().length > 0 &&
      (expectedEventHash.trim().length > 0 || objectIdToSend !== undefined || txDigestToSend !== undefined)
    ) {
      setHasAutoVerified(true);
      void onVerify();
    }
  }, [canonicalString, expectedEventHash, objectIdToSend, txDigestToSend, hasAutoVerified, onVerify]);

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
        <span style={{ fontWeight: 600 }}>tx_digest (fallback)</span>
        <input
          value={txDigest}
          onChange={(event) => setTxDigest(event.target.value)}
          placeholder="Base58 tx digest (optional)"
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
          className="text-black"
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
          className="text-black"
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

      <section style={{ marginTop: 12, border: "1px dashed #ccc", borderRadius: 10, padding: 10 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Request preview</p>
        <pre
          style={{
            margin: "8px 0 0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(
            {
              canonical_string: canonicalString,
              expected_event_hash: expectedEventHash.trim().length > 0 ? expectedEventHash : undefined,
              object_id: objectIdToSend,
              tx_digest: txDigestToSend,
            },
            null,
            2
          )}
        </pre>
      </section>

      {errorMessage ? <p style={{ marginTop: 12, color: "crimson" }}>{errorMessage}</p> : null}

      {result ? (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fcfcfc" }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }} className="text-xl font-semibold text-gray-900 tracking-wide">
              Local Verification
            </p>
            <p>
              <strong className="text-gray-300">computed_event_hash:</strong>{" "}
              <code className="text-blue-400 break-all">{result.computed_event_hash ?? "(none)"}</code>
            </p>
            <p style={{ marginTop: 6 }}>
              <strong className="text-gray-300">expected_event_hash:</strong>{" "}
              <code className="text-blue-400 break-all">{result.expected_event_hash ?? "(none)"}</code>
            </p>
            <p style={{ marginTop: 6 }}>
              <strong className="text-gray-300">match:</strong>{" "}
              <span
                className={
                  result.match === null || result.match === undefined
                    ? "text-yellow-400"
                    : result.match
                      ? "text-green-400 font-semibold"
                      : "text-red-400 font-semibold"
                }
              >
                {result.match === null || result.match === undefined
                  ? "Not comparable"
                  : result.match
                    ? "Yes"
                    : "No"}
              </span>
            </p>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fcfcfc" }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }} className="text-xl font-semibold text-gray-900 tracking-wide">
              On-Chain Verification
            </p>
            <p>
              <strong className="text-gray-300">onchain_event_hash:</strong>{" "}
              <code className="text-blue-400 break-all">{result.onchain_event_hash ?? "(none)"}</code>
            </p>
            <p style={{ marginTop: 6 }}>
              <strong className="text-gray-300">match_onchain:</strong>{" "}
              <span
                className={
                  result.match_onchain === null || result.match_onchain === undefined
                    ? "text-yellow-400"
                    : result.match_onchain
                      ? "text-green-400 font-semibold"
                      : "text-red-400 font-semibold"
                }
              >
                {result.match_onchain === null || result.match_onchain === undefined
                  ? "Not comparable"
                  : result.match_onchain
                    ? "Yes"
                    : "No"}
              </span>
            </p>
          </section>

          {result.explorer ? (
            <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fcfcfc" }}>
              <p
                style={{ fontWeight: 700, marginBottom: 8 }}
                className="text-xl font-semibold text-gray-900 tracking-wide"
              >
                Explorer Links
              </p>
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {transactionExplorerUrl ? (
                  <li>
                    <a
                      href={transactionExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 break-all"
                    >
                      Transaction
                    </a>
                  </li>
                ) : (
                  <li>
                    <span className="text-gray-500">Transaction (unavailable)</span>
                  </li>
                )}
                {result.explorer.object ? (
                  <li>
                    <a
                      href={result.explorer.object}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 break-all"
                    >
                      Object
                    </a>
                  </li>
                ) : null}
                {result.explorer.package ? (
                  <li>
                    <a
                      href={result.explorer.package}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 break-all"
                    >
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
