import type { IotaNetwork } from "@/app/lib/iota/client";

type NetworkInput = "testnet" | "mainnet";

export type ResolvedIotaNetworkConfig = {
  requestedNetwork: NetworkInput;
  network: NetworkInput;
  rpcUrl: string | null;
  packageId: string | null;
  moduleName: string;
  warning: string | null;
  explorer: {
    txBase: string;
    objectBase: string;
  };
};

function toBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeRequestedNetwork(value: unknown): NetworkInput | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "mainnet" || normalized === "testnet") {
    return normalized;
  }
  return null;
}

function readDefaultNetwork(): NetworkInput {
  const normalized = process.env.IOTA_NETWORK?.trim().toLowerCase();
  if (normalized === "mainnet") {
    return "mainnet";
  }
  return "testnet";
}

function readRpcUrl(network: NetworkInput): string | null {
  if (network === "mainnet") {
    return process.env.IOTA_MAINNET_RPC_URL?.trim() || process.env.IOTA_RPC_URL?.trim() || null;
  }
  return process.env.IOTA_TESTNET_RPC_URL?.trim() || process.env.IOTA_RPC_URL?.trim() || null;
}

function readPackageId(network: NetworkInput): string | null {
  if (network === "mainnet") {
    return process.env.IOTA_MAINNET_PACKAGE_ID?.trim() || process.env.IOTA_PACKAGE_ID?.trim() || null;
  }
  return process.env.IOTA_TESTNET_PACKAGE_ID?.trim() || process.env.IOTA_PACKAGE_ID?.trim() || null;
}

function toExplorerBases(network: NetworkInput): { txBase: string; objectBase: string } {
  if (network === "mainnet") {
    return {
      txBase: "https://explorer.iota.org/txblock/",
      objectBase: "https://explorer.iota.org/object/",
    };
  }
  return {
    txBase: "https://explorer.iota.org/txblock/",
    objectBase: "https://explorer.iota.org/object/",
  };
}

export function toIotaNetwork(network: NetworkInput): IotaNetwork {
  return network;
}

export function resolveIotaNetworkConfig(input: {
  requestedNetwork?: unknown;
  mainnetConfirmToken?: unknown;
}): ResolvedIotaNetworkConfig {
  const requestedNetwork = normalizeRequestedNetwork(input.requestedNetwork) ?? readDefaultNetwork();

  let network: NetworkInput = requestedNetwork;
  let warning: string | null = null;

  if (requestedNetwork === "mainnet") {
    const mainnetEnabled = toBoolean(process.env.IOTA_MAINNET_ENABLED);
    const token = typeof input.mainnetConfirmToken === "string" ? input.mainnetConfirmToken.trim() : "";
    const expectedToken = process.env.IOTA_MAINNET_CONFIRM_TOKEN?.trim() ?? "";
    const hasValidToken = expectedToken.length > 0 && token.length > 0 && token === expectedToken;

    if (!mainnetEnabled || !hasValidToken) {
      network = "testnet";
      warning =
        "Mainnet request was not authorized. Falling back to testnet (requires IOTA_MAINNET_ENABLED=true and a valid mainnet_confirm_token).";
    }
  }

  return {
    requestedNetwork,
    network,
    rpcUrl: readRpcUrl(network),
    packageId: readPackageId(network),
    moduleName: process.env.IOTA_MODULE?.trim() || "proof",
    warning,
    explorer: toExplorerBases(network),
  };
}
