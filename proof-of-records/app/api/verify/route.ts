import { NextResponse } from "next/server";
import { sha256Hex } from "@/app/lib/proof/hash";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import type { VerifyRequest } from "@/app/types/records";
import { fetchProofByObjectId } from "@/app/lib/iota/client";
import {
  getExplorerObjectUrl,
  getExplorerTxUrl,
  getOnChainEventHashByTxId,
} from "@/app/lib/iota/move";

export const runtime = "nodejs";

function normalizeHex(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.toLowerCase().replace(/^0x/, "");
}

async function verifyPayload(payload: VerifyRequest) {
  const objectId = payload.object_id ?? payload.objectId;
  const txDigest = payload.tx_digest ?? payload.txId;
  const expectedHash = normalizeHex(payload.expected_event_hash);
  const canonicalString =
    typeof payload.canonical_string === "string" && payload.canonical_string.length > 0
      ? payload.canonical_string
      : payload.canonical !== undefined
        ? stableStringify(payload.canonical)
        : undefined;

  if (!canonicalString) {
    return {
      status: 400,
      body: { ok: false, error: "Missing `canonical` or `canonical_string`." },
    };
  }

  const computedHash = sha256Hex(canonicalString);
  let onchainEventHash: string | null = null;
  let matchOnchain: boolean | null = null;
  let explorerTx: string | null = null;
  let explorerObject: string | null = null;
  const onchainEnabled =
    process.env.IOTA_ANCHOR_ONCHAIN === "true" &&
    Boolean(process.env.IOTA_PACKAGE_ID && process.env.IOTA_PACKAGE_ID.trim().length > 0) &&
    Boolean(process.env.IOTA_NETWORK && process.env.IOTA_NETWORK.trim().length > 0);

  if (
    onchainEnabled &&
    typeof objectId === "string" &&
    objectId.trim().length > 0
  ) {
    try {
      explorerObject = getExplorerObjectUrl(objectId);
    } catch {
      explorerObject = null;
    }
    try {
      const proofObj = await fetchProofByObjectId(objectId);
      onchainEventHash = proofObj?.event_hash_hex ?? null;
      if (onchainEventHash) {
        matchOnchain = normalizeHex(onchainEventHash) === computedHash;
      }
    } catch {
      onchainEventHash = null;
      matchOnchain = null;
    }
  }

  if (
    onchainEnabled &&
    onchainEventHash === null &&
    typeof txDigest === "string" &&
    txDigest.trim().length > 0
  ) {
    try {
      explorerTx = getExplorerTxUrl(txDigest);
    } catch {
      explorerTx = null;
    }
    try {
      onchainEventHash = await getOnChainEventHashByTxId(txDigest);
      if (onchainEventHash) {
        matchOnchain = normalizeHex(onchainEventHash) === computedHash;
      }
    } catch {
      matchOnchain = null;
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      computed_event_hash: computedHash,
      expected_event_hash: expectedHash ?? null,
      match: expectedHash ? expectedHash === computedHash : null,
      uri: payload.uri ?? null,
      onchain_event_hash: onchainEventHash,
      match_onchain: matchOnchain,
      explorer: {
        tx: explorerTx,
        object: explorerObject,
        package: null,
      },
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const result = await verifyPayload(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await verifyPayload({
    canonical_string: searchParams.get("canonical_string") ?? undefined,
    expected_event_hash: searchParams.get("expected_event_hash") ?? undefined,
    uri: searchParams.get("uri") ?? undefined,
    txId: searchParams.get("txId") ?? undefined,
    tx_digest: searchParams.get("tx_digest") ?? undefined,
    objectId: searchParams.get("objectId") ?? undefined,
    object_id: searchParams.get("object_id") ?? undefined,
  });

  return NextResponse.json(result.body, { status: result.status });
}
