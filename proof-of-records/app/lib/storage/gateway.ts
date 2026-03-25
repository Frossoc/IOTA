import { getGatewayBaseUrl } from "@/app/lib/storage/pinata";

export function toGatewayUrl(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed.startsWith("ipfs://")) {
    return trimmed;
  }

  const withoutScheme = trimmed.slice("ipfs://".length).replace(/^\/+/, "");
  const gatewayBase = getGatewayBaseUrl();

  return `${gatewayBase}/${withoutScheme}`;
}

export function resolveEvidenceUrl(uri: string | null | undefined): string | null {
  if (typeof uri !== "string") {
    return null;
  }

  const trimmed = uri.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("ipfs://")) {
    return toGatewayUrl(trimmed);
  }

  return null;
}
