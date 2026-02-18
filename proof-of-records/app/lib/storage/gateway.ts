import { getGatewayBaseUrl } from "@/app/lib/storage/pinata";

export function toGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri.startsWith("ipfs://")) {
    return ipfsUri;
  }

  const withoutScheme = ipfsUri.slice("ipfs://".length);
  const gatewayBase = getGatewayBaseUrl();

  return `${gatewayBase}/${withoutScheme}`;
}
