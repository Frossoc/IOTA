import { createHash } from "node:crypto";
import { getIotaClient, getSigner, requireIotaConfig, type IotaNetwork } from "@/app/lib/iota/client";

export type RegisterProofInput = {
  event_hash: string;
  uri: string;
  schema_version: string;
  adapter: string;
};

export type RegisterProofResult = {
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

function derivePlaceholderTxId(input: RegisterProofInput): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(input), "utf8")
    .digest("hex");
  return digest.slice(0, 64);
}

function isIotaEnvConfigured(): boolean {
  const hasRpc = Boolean(process.env.IOTA_RPC_URL && process.env.IOTA_RPC_URL.trim().length > 0);
  const hasKey = Boolean(
    (process.env.IOTA_PRIVATE_KEY && process.env.IOTA_PRIVATE_KEY.trim().length > 0) ||
      (process.env.IOTA_MNEMONIC && process.env.IOTA_MNEMONIC.trim().length > 0)
  );
  return hasRpc && hasKey;
}

export async function registerProofOnChain(
  input: RegisterProofInput
): Promise<RegisterProofResult> {
  if (!isIotaEnvConfigured()) {
    throw new Error("IOTA integration disabled: missing IOTA_RPC_URL and/or signer credentials");
  }

  const config = requireIotaConfig();
  getSigner();

  // Placeholder integration shape.
  // Replace this section with actual IOTA SDK transaction-building + execution.
  void getIotaClient();
  const txId = derivePlaceholderTxId(input);

  return {
    txId,
    explorerTx: buildExplorerTx(config.network, txId),
  };
}

export function getExplorerTxUrl(txId: string): string {
  const config = requireIotaConfig();
  return buildExplorerTx(config.network, txId);
}

export function getExplorerObjectUrl(objectId: string): string {
  const config = requireIotaConfig();
  const base = (() => {
    if (config.network === "mainnet") {
      return "https://explorer.iota.org";
    }
    if (config.network === "devnet") {
      return "https://explorer.iota.org/?network=devnet";
    }
    return "https://explorer.iota.org/?network=testnet";
  })();
  return `${base}/object/${objectId}`;
}

export async function getOnChainEventHashByTxId(txId: string): Promise<string | null> {
  if (!isIotaEnvConfigured()) {
    throw new Error("IOTA integration disabled: missing IOTA_RPC_URL and/or signer credentials");
  }

  const client = getIotaClient();

  // Placeholder query shape. Replace with concrete transaction/event fetch parsing when SDK is wired.
  const response = await client.request<unknown>("iota_getTransactionBlock", [txId]);
  if (!response) {
    return null;
  }

  return null;
}

export async function getOnChainEventHashByObjectId(objectId: string): Promise<string | null> {
  if (!isIotaEnvConfigured()) {
    throw new Error("IOTA integration disabled: missing IOTA_RPC_URL and/or signer credentials");
  }

  const client = getIotaClient();

  // Placeholder query shape. Replace with concrete object/event parsing when SDK is wired.
  const response = await client.request<unknown>("iota_getObject", [objectId]);
  if (!response) {
    return null;
  }

  return null;
}

export async function mintProofUnitsToken(
  input: MintProofUnitsInput
): Promise<MintProofUnitsResult> {
  if (!isIotaEnvConfigured()) {
    throw new Error("IOTA integration disabled: missing IOTA_RPC_URL and/or signer credentials");
  }

  if (process.env.IOTA_ENABLE_PROOF_UNITS_MINT !== "1") {
    throw new Error("IOTA token minting disabled: set IOTA_ENABLE_PROOF_UNITS_MINT=1");
  }

  if (!(input.supply > 0)) {
    throw new Error("Token minting disabled: supply must be > 0");
  }

  const config = requireIotaConfig();
  getSigner();

  // Placeholder integration shape for MVP.
  // Replace with concrete on-chain mint transaction when token contract is available.
  void getIotaClient();
  const txId = createHash("sha256")
    .update(JSON.stringify(input), "utf8")
    .digest("hex")
    .slice(0, 64);

  return {
    txId,
    explorerTx: buildExplorerTx(config.network, txId),
  };
}
