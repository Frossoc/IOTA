export type RuntimeEnv = {
  nodeEnv: string;
  isProduction: boolean;
  anchorOnchain: boolean;
  iotaNetwork: string;
  hasIotaRpc: boolean;
  hasIotaSigner: boolean;
  hasIotaPackageId: boolean;
};

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

export function getRuntimeEnv(): RuntimeEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";

  const hasIotaRpc = Boolean(process.env.IOTA_RPC_URL && process.env.IOTA_RPC_URL.trim().length > 0);
  const hasIotaSigner = Boolean(
    (process.env.IOTA_PRIVATE_KEY && process.env.IOTA_PRIVATE_KEY.trim().length > 0) ||
      (process.env.IOTA_MNEMONIC && process.env.IOTA_MNEMONIC.trim().length > 0)
  );
  const hasIotaPackageId = Boolean(
    process.env.IOTA_PACKAGE_ID && process.env.IOTA_PACKAGE_ID.trim().length > 0
  );

  return {
    nodeEnv,
    isProduction,
    anchorOnchain: toBoolean(process.env.IOTA_ANCHOR_ONCHAIN, false),
    iotaNetwork: process.env.IOTA_NETWORK?.trim() || "testnet",
    hasIotaRpc,
    hasIotaSigner,
    hasIotaPackageId,
  };
}

export function getByteLimit(envName: string, fallbackBytes: number): number {
  const raw = process.env[envName];
  if (!raw) {
    return fallbackBytes;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackBytes;
  }
  return parsed;
}
