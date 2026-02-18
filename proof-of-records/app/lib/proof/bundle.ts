import { stableStringify } from "@/app/lib/proof/canonicalize";
import { sha256Hex } from "@/app/lib/proof/hash";

export type ProofBundle = {
  canonical_string: string;
  event_hash: string;
  issuer: string;
  timestamp: string;
  uri: string;
  rows_count: number;
};

export function buildProofBundle(args: {
  canonical: unknown;
  issuer: string;
  timestamp: string;
  uri: string;
  rows_count: number;
}): ProofBundle {
  const canonical_string = stableStringify(args.canonical);
  const event_hash = sha256Hex(canonical_string);
  return {
    canonical_string,
    event_hash,
    issuer: args.issuer,
    timestamp: args.timestamp,
    uri: args.uri,
    rows_count: args.rows_count,
  };
}
