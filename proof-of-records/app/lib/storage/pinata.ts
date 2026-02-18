const PINATA_BASE_URL = "https://api.pinata.cloud";

type PinataResult = {
  cid: string;
  uri: string;
};

type PinataUploadResponse = {
  IpfsHash: string;
};

function readJwt(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt || jwt.trim().length === 0) {
    throw new Error("PINATA_JWT is not configured");
  }
  return jwt;
}

function parsePinataResponse(value: unknown): PinataUploadResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid Pinata response");
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.IpfsHash !== "string" || candidate.IpfsHash.trim().length === 0) {
    throw new Error("Missing IpfsHash in Pinata response");
  }

  return {
    IpfsHash: candidate.IpfsHash,
  };
}

function toResult(cid: string): PinataResult {
  return {
    cid,
    uri: `ipfs://${cid}`,
  };
}

async function postToPinata(endpoint: string, body: FormData | string): Promise<PinataResult> {
  const jwt = readJwt();

  const response = await fetch(`${PINATA_BASE_URL}${endpoint}`, {
    method: "POST",
    headers:
      typeof body === "string"
        ? {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
          }
        : {
            Authorization: `Bearer ${jwt}`,
          },
    body,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed with status ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  const parsed = parsePinataResponse(json);
  return toResult(parsed.IpfsHash);
}

export async function uploadFileToPinata(
  input: Blob | File,
  filename: string
): Promise<PinataResult> {
  const formData = new FormData();
  formData.append("file", input, filename);
  formData.append("pinataMetadata", JSON.stringify({ name: filename }));

  return postToPinata("/pinning/pinFileToIPFS", formData);
}

export async function uploadJsonToPinata(payload: unknown, filename: string): Promise<PinataResult> {
  const body = JSON.stringify({
    pinataMetadata: { name: filename },
    pinataContent: payload,
  });

  return postToPinata("/pinning/pinJSONToIPFS", body);
}

export function getGatewayBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, "");
  }
  return "https://gateway.pinata.cloud/ipfs";
}
