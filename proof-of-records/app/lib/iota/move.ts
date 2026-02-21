import { createHash } from "node:crypto";
import {
  ensureHexFromBytes,
  getActiveAddress,
  readObjectById,
  requireIotaConfig,
  runIotaClientJson,
  signAndExecuteRegisterProof,
  utf8BytesToString,
  type IotaNetwork,
} from "@/app/lib/iota/client";

type RegisterProofBytesInput = {
  event_hash_bytes: number[];
  uri_bytes: number[];
  issuer: string;
  timestamp: number;
};

type RegisterProofLegacyInput = {
  event_hash: string;
  uri: string;
  schema_version: string;
  adapter: string;
};

export type RegisterProofInput = RegisterProofBytesInput | RegisterProofLegacyInput;

export type RegisterProofResult = {
  txDigest: string;
  objectId: string | null;
  explorer: {
    tx: string;
    object: string | null;
  };
  txId: string;
  explorerTx: string;
};

export type MintProofUnitsInput = {
  supply: number;
  event_hash: string;
  uri: string;
};

export type MintProofUnitsResult = {
  txId: string;
  explorerTx: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getExplorerBase(network: IotaNetwork): string {
  if (network === "mainnet") {
    return "https://explorer.iota.org";
  }
  if (network === "devnet") {
    return "https://explorer.iota.org/?network=devnet";
  }
  return "https://explorer.iota.org/?network=testnet";
}

export function buildExplorerTx(network: IotaNetwork, txId: string): string {
  return `${getExplorerBase(network)}/transaction/${txId}`;
}

export function buildExplorerObject(network: IotaNetwork, objectId: string): string {
  return `${getExplorerBase(network)}/object/${objectId}`;
}

function parseHexToBytes(hexValue: string): number[] {
  const normalized = hexValue.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Invalid event_hash hex string");
  }
  return normalized.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
}

function parseEventHashFromMoveContent(content: unknown): string | null {
  if (!isRecord(content)) {
    return null;
  }

  const fields = isRecord(content.fields) ? content.fields : content;
  const eventHash = fields.event_hash;
  if (typeof eventHash === "string") {
    return eventHash.toLowerCase().replace(/^0x/, "");
  }
  if (Array.isArray(eventHash)) {
    const values = eventHash.filter((item): item is number => typeof item === "number");
    if (values.length === eventHash.length) {
      return values.map((item) => item.toString(16).padStart(2, "0")).join("");
    }
  }
  return null;
}

function parseCreatedProofObjectId(txBlock: unknown, packageId: string): string | null {
  if (!isRecord(txBlock)) {
    return null;
  }

  const changes = txBlock.objectChanges;
  if (!Array.isArray(changes)) {
    return null;
  }

  const targetPrefix = `${packageId.toLowerCase()}::`;
  for (const change of changes) {
    if (!isRecord(change)) {
      continue;
    }
    const objectType = typeof change.objectType === "string" ? change.objectType.toLowerCase() : "";
    if (!objectType.startsWith(targetPrefix) || !objectType.endsWith("::proof::Proof".toLowerCase())) {
      continue;
    }
    if (typeof change.objectId === "string") {
      return change.objectId;
    }
    if (typeof change.ObjectID === "string") {
      return change.ObjectID;
    }
  }
  return null;
}

async function normalizeRegisterInput(input: RegisterProofInput): Promise<RegisterProofBytesInput> {
  if ("event_hash_bytes" in input) {
    return input;
  }

  const issuer = await getActiveAddress();
  return {
    event_hash_bytes: parseHexToBytes(input.event_hash),
    uri_bytes: Array.from(Buffer.from(input.uri, "utf8")),
    issuer,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export async function registerProofOnChain(input: RegisterProofInput): Promise<RegisterProofResult> {
  const config = requireIotaConfig();
  const normalized = await normalizeRegisterInput(input);
  const eventHashHex = ensureHexFromBytes(normalized.event_hash_bytes);
  const uri = utf8BytesToString(normalized.uri_bytes);

  const executed = await signAndExecuteRegisterProof({
    eventHashHex,
    uri,
    issuer: normalized.issuer,
    timestamp: normalized.timestamp,
  });

  const txUrl = buildExplorerTx(config.network, executed.txDigest);
  const objectUrl = executed.objectId ? buildExplorerObject(config.network, executed.objectId) : null;

  return {
    txDigest: executed.txDigest,
    objectId: executed.objectId,
    explorer: {
      tx: txUrl,
      object: objectUrl,
    },
    txId: executed.txDigest,
    explorerTx: txUrl,
  };
}

export function getExplorerTxUrl(txId: string): string {
  const config = requireIotaConfig();
  return buildExplorerTx(config.network, txId);
}

export function getExplorerObjectUrl(objectId: string): string {
  const config = requireIotaConfig();
  return buildExplorerObject(config.network, objectId);
}

export async function getOnChainEventHashByTxId(txId: string): Promise<string | null> {
  const config = requireIotaConfig();
  const txBlock = await runIotaClientJson(["tx-block", txId]);
  const objectId = parseCreatedProofObjectId(txBlock, config.packageId);
  if (!objectId) {
    return null;
  }
  return getOnChainEventHashByObjectId(objectId);
}

export async function getOnChainEventHashByObjectId(objectId: string): Promise<string | null> {
  void requireIotaConfig();
  const objectResponse = await readObjectById(objectId);
  if (!isRecord(objectResponse)) {
    return null;
  }

  const data = isRecord(objectResponse.data) ? objectResponse.data : objectResponse;
  const content = data.content;
  return parseEventHashFromMoveContent(content);
}

export async function mintProofUnitsToken(
  input: MintProofUnitsInput
): Promise<MintProofUnitsResult> {
  if (process.env.IOTA_ENABLE_PROOF_UNITS_MINT !== "1") {
    throw new Error("IOTA token minting disabled: set IOTA_ENABLE_PROOF_UNITS_MINT=1");
  }

  if (!(input.supply > 0)) {
    throw new Error("Token minting disabled: supply must be > 0");
  }

  const config = requireIotaConfig();
  const txId = createHash("sha256")
    .update(JSON.stringify(input), "utf8")
    .digest("hex")
    .slice(0, 64);

  return {
    txId,
    explorerTx: buildExplorerTx(config.network, txId),
  };
}
