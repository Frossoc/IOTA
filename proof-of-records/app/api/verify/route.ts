import { NextResponse } from "next/server";
import { sha256Hex } from "@/app/lib/proof/hash";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import {
  getExplorerObjectUrl,
  getExplorerTxUrl,
  getOnChainEventHashByObjectId,
  getOnChainEventHashByTxId,
} from "@/app/lib/iota/move";

export const runtime = "nodejs";

type VerifyRequest = {
  canonical?: unknown;
  canonical_string?: string;
  expected_event_hash?: string;
  uri?: string;
  txId?: string;
  objectId?: string;
};

function normalizeHex(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.toLowerCase().replace(/^0x/, "");
}

async function verifyPayload(payload: VerifyRequest) {
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

  if (typeof payload.txId === "string" && payload.txId.trim().length > 0) {
    try {
      explorerTx = getExplorerTxUrl(payload.txId);
    } catch {
      explorerTx = null;
    }
    try {
      onchainEventHash = await getOnChainEventHashByTxId(payload.txId);
      if (onchainEventHash) {
        matchOnchain = normalizeHex(onchainEventHash) === computedHash;
      }
    } catch {
      matchOnchain = null;
    }
  }

  if (
    onchainEventHash === null &&
    typeof payload.objectId === "string" &&
    payload.objectId.trim().length > 0
  ) {
    try {
      explorerObject = getExplorerObjectUrl(payload.objectId);
    } catch {
      explorerObject = null;
    }
    try {
      onchainEventHash = await getOnChainEventHashByObjectId(payload.objectId);
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
    objectId: searchParams.get("objectId") ?? undefined,
  });

  return NextResponse.json(result.body, { status: result.status });
}
