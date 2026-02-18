export type IotaNetwork = "mainnet" | "testnet" | "devnet";

export type IotaClientConfig = {
  rpcUrl: string;
  network: IotaNetwork;
};

export type IotaClient = {
  config: IotaClientConfig;
  request: <TResponse>(method: string, params?: unknown[]) => Promise<TResponse>;
};

export type IotaSigner = {
  kind: "private_key" | "mnemonic";
  secretRef: string;
};

function readNetwork(): IotaNetwork {
  const raw = process.env.IOTA_NETWORK?.toLowerCase();
  if (raw === "mainnet" || raw === "testnet" || raw === "devnet") {
    return raw;
  }
  return "testnet";
}

export function requireIotaConfig(): IotaClientConfig {
  const rpcUrl = process.env.IOTA_RPC_URL;
  if (!rpcUrl || rpcUrl.trim().length === 0) {
    throw new Error("IOTA integration disabled: missing IOTA_RPC_URL");
  }

  return {
    rpcUrl,
    network: readNetwork(),
  };
}

export function createIotaClient(): IotaClient {
  const config = requireIotaConfig();

  return {
    config,
    async request<TResponse>(method: string, params: unknown[] = []): Promise<TResponse> {
      const response = await fetch(config.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`IOTA RPC request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        result?: unknown;
        error?: { message?: string };
      };

      if (data.error) {
        throw new Error(data.error.message ?? "IOTA RPC returned an error");
      }

      return data.result as TResponse;
    },
  };
}

export function createSignerFromEnv(): IotaSigner {
  const privateKey = process.env.IOTA_PRIVATE_KEY;
  if (privateKey && privateKey.trim().length > 0) {
    return {
      kind: "private_key",
      secretRef: "IOTA_PRIVATE_KEY",
    };
  }

  const mnemonic = process.env.IOTA_MNEMONIC;
  if (mnemonic && mnemonic.trim().length > 0) {
    return {
      kind: "mnemonic",
      secretRef: "IOTA_MNEMONIC",
    };
  }

  throw new Error("IOTA integration disabled: missing IOTA_PRIVATE_KEY or IOTA_MNEMONIC");
}

// Backward-compatible aliases for existing imports.
export const getIotaClient = createIotaClient;
export const getSigner = createSignerFromEnv;
