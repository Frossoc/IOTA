import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type IotaNetwork = "mainnet" | "testnet" | "devnet";

export type IotaClientConfig = {
  rpcUrl: string;
  network: IotaNetwork;
  packageId: string;
  module: string;
  privateKeyRef: "IOTA_PRIVATE_KEY";
};

export type IotaClient = {
  config: IotaClientConfig;
  request: <TResponse>(method: string, params?: unknown[]) => Promise<TResponse>;
};

export type IotaSigner = {
  kind: "private_key";
  secretRef: "IOTA_PRIVATE_KEY";
};

export type SignAndExecuteRegisterProofInput = {
  eventHashHex: string;
  uri: string;
  issuer: string;
  timestamp: number;
  gasBudget?: number;
};

export type SignAndExecuteRegisterProofResult = {
  txDigest: string;
  objectId: string | null;
  raw: unknown;
};

export type OnChainProofObject = {
  event_hash_hex: string;
  uri?: string;
  issuer?: string;
  timestamp?: number;
};

const execFileAsync = promisify(execFile);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNetwork(): IotaNetwork {
  const raw = process.env.IOTA_NETWORK?.toLowerCase();
  if (raw === "mainnet" || raw === "testnet" || raw === "devnet") {
    return raw;
  }
  return "testnet";
}

function normalizeHex(value: string): string {
  const compact = value.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(compact)) {
    throw new Error("Invalid hex input");
  }
  return compact;
}

function bytesToHex(bytes: number[]): string {
  return bytes
    .map((byte) => {
      if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
        throw new Error("Invalid byte array input");
      }
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

export function utf8BytesToString(bytes: number[]): string {
  return Buffer.from(Uint8Array.from(bytes)).toString("utf8");
}

export function ensureHexFromBytes(bytes: number[]): string {
  return bytesToHex(bytes);
}

export function requireIotaConfig(): IotaClientConfig {
  const rpcUrl = process.env.IOTA_RPC_URL?.trim();
  if (!rpcUrl) {
    throw new Error("IOTA integration disabled: missing IOTA_RPC_URL");
  }

  const privateKey = process.env.IOTA_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("IOTA integration disabled: missing IOTA_PRIVATE_KEY");
  }

  const packageId = process.env.IOTA_PACKAGE_ID?.trim();
  if (!packageId) {
    throw new Error("IOTA integration disabled: missing IOTA_PACKAGE_ID");
  }

  return {
    rpcUrl,
    network: readNetwork(),
    packageId,
    module: process.env.IOTA_MODULE?.trim() || "proof",
    privateKeyRef: "IOTA_PRIVATE_KEY",
  };
}

export function createSignerFromEnv(): IotaSigner {
  void requireIotaConfig();
  return {
    kind: "private_key",
    secretRef: "IOTA_PRIVATE_KEY",
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

function findStringDeep(value: unknown, keys: Set<string>): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringDeep(item, keys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (keys.has(key) && typeof nested === "string" && nested.length > 0) {
      return nested;
    }
    const nestedFound = findStringDeep(nested, keys);
    if (nestedFound) {
      return nestedFound;
    }
  }
  return null;
}

function findProofObjectId(value: unknown, packageId: string, moduleName: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const targetType = `${packageId.toLowerCase()}::${moduleName.toLowerCase()}::proof`;
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!isRecord(current)) {
      continue;
    }

    const objectType = typeof current.objectType === "string" ? current.objectType.toLowerCase() : "";
    const idCandidate =
      typeof current.objectId === "string"
        ? current.objectId
        : typeof current.ObjectID === "string"
          ? current.ObjectID
          : typeof current.id === "string"
            ? current.id
            : null;

    if (idCandidate && objectType.endsWith(targetType)) {
      return idCandidate;
    }

    for (const nested of Object.values(current)) {
      if (Array.isArray(nested)) {
        stack.push(...nested);
      } else if (isRecord(nested)) {
        stack.push(nested);
      }
    }
  }

  return null;
}

function findFirstByKey(value: unknown, key: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstByKey(item, key);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (key in value) {
    return value[key];
  }

  for (const nested of Object.values(value)) {
    const found = findFirstByKey(nested, key);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function isByteArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => Number.isInteger(entry) && (entry as number) >= 0 && (entry as number) <= 255)
  );
}

function parseVectorString(value: string): number[] | null {
  const trimmed = value.trim();
  const bracketVector = trimmed.match(/^\[(\s*\d+\s*(,\s*\d+\s*)*)\]$/);
  if (!bracketVector) {
    return null;
  }

  const numbers = trimmed
    .slice(1, -1)
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10));

  if (numbers.some((entry) => !Number.isInteger(entry) || entry < 0 || entry > 255)) {
    return null;
  }

  return numbers;
}

function normalizeHexString(value: string): string | null {
  const compact = value.trim().toLowerCase().replace(/^0x/, "");
  if (compact.length === 0 || compact.length % 2 !== 0 || !/^[0-9a-f]+$/.test(compact)) {
    return null;
  }
  return compact;
}

function toHexFromUnknownEventHash(value: unknown): string | null {
  if (typeof value === "string") {
    const directHex = normalizeHexString(value);
    if (directHex) {
      return directHex;
    }

    const vectorCandidate = parseVectorString(value);
    if (vectorCandidate) {
      return bytesToHex(vectorCandidate);
    }

    try {
      const decoded = Buffer.from(value, "base64");
      if (decoded.length > 0) {
        return bytesToHex(Array.from(decoded.values()));
      }
    } catch {
      return null;
    }
    return null;
  }

  if (isByteArray(value)) {
    return bytesToHex(value);
  }

  if (isRecord(value)) {
    const nestedBytes =
      findFirstByKey(value, "bytes") ??
      findFirstByKey(value, "value") ??
      findFirstByKey(value, "vector") ??
      findFirstByKey(value, "elements");
    return toHexFromUnknownEventHash(nestedBytes);
  }

  return null;
}

function toUtf8FromUnknown(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (isByteArray(value)) {
    return Buffer.from(Uint8Array.from(value)).toString("utf8");
  }
  if (isRecord(value)) {
    const nested =
      findFirstByKey(value, "bytes") ??
      findFirstByKey(value, "value") ??
      findFirstByKey(value, "vector") ??
      findFirstByKey(value, "elements");
    const nestedText = toUtf8FromUnknown(nested);
    if (nestedText !== undefined) {
      return nestedText;
    }
  }
  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export async function runIotaClientJson(args: string[]): Promise<unknown> {
  const { stdout } = await execFileAsync("iota", ["client", ...args, "--json"], {
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout) as unknown;
}

export async function getActiveAddress(): Promise<string> {
  const { stdout } = await execFileAsync("iota", ["client", "active-address"], {
    env: process.env,
    maxBuffer: 1024 * 1024,
  });
  const address = stdout.trim();
  if (!address) {
    throw new Error("Unable to resolve active IOTA address");
  }
  return address;
}

export async function signAndExecuteRegisterProof(
  input: SignAndExecuteRegisterProofInput
): Promise<SignAndExecuteRegisterProofResult> {
  const config = requireIotaConfig();
  void createSignerFromEnv();

  const eventHashHex = normalizeHex(input.eventHashHex);
  const args = [
    "call",
    "--package",
    config.packageId,
    "--module",
    config.module,
    "--function",
    "register_proof",
    "--args",
    `0x${eventHashHex}`,
    input.uri,
    input.issuer,
    String(input.timestamp),
    "--gas-budget",
    String(input.gasBudget ?? 30_000_000),
  ];

  const raw = await runIotaClientJson(args);
  const txDigest = findStringDeep(raw, new Set(["digest", "txDigest", "transactionDigest"]));
  if (!txDigest) {
    throw new Error("Unable to parse tx digest from iota client call response");
  }

  const objectId = findProofObjectId(raw, config.packageId, config.module);
  return {
    txDigest,
    objectId,
    raw,
  };
}

export async function readObjectById(objectId: string): Promise<unknown> {
  const client = createIotaClient();
  return client.request<unknown>("iota_getObject", [
    objectId,
    {
      showType: true,
      showOwner: true,
      showPreviousTransaction: true,
      showDisplay: true,
      showContent: true,
      showBcs: true,
    },
  ]);
}

export async function fetchProofByObjectId(objectId: string): Promise<OnChainProofObject | null> {
  const raw = await runIotaClientJson(["object", objectId]);
  const eventHashCandidate = findFirstByKey(raw, "event_hash");
  const event_hash_hex = toHexFromUnknownEventHash(eventHashCandidate);

  if (!event_hash_hex) {
    return null;
  }

  const uriCandidate = findFirstByKey(raw, "uri");
  const issuerCandidate = findFirstByKey(raw, "issuer");
  const timestampCandidate = findFirstByKey(raw, "timestamp");

  return {
    event_hash_hex,
    uri: toUtf8FromUnknown(uriCandidate),
    issuer: toOptionalString(issuerCandidate),
    timestamp: toOptionalNumber(timestampCandidate),
  };
}

// Backward-compatible aliases for existing imports.
export const getIotaClient = createIotaClient;
export const getSigner = createSignerFromEnv;
