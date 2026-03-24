import { createHash } from "node:crypto";
import { stableStringify } from "@/app/lib/proof/canonicalize";
import { sha256Hex } from "@/app/lib/proof/hash";

// Algorithm version: sha256-v1
// - Leaf preimage = stableStringify({ index, row })
// - Leaf hash = SHA-256(leaf preimage)
// - Parent hash = SHA-256(min(left, right) || max(left, right)) using raw hash bytes
// - If a level has an odd node count, the last node is promoted unchanged

export const MERKLE_ALGORITHM = "sha256-v1";

export type MerkleProofPath = string[];

export type MerkleLeafProof<Row> = {
  index: number;
  row: Row;
  leaf_hash: string;
  proof: MerkleProofPath;
};

function hexToBytes(hexValue: string): Uint8Array {
  const normalized = hexValue.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Invalid SHA-256 hex value");
  }

  const bytes = new Uint8Array(32);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function hashPair(leftHash: string, rightHash: string): string {
  const [first, second] = [leftHash, rightHash].sort();
  const combined = new Uint8Array(64);
  combined.set(hexToBytes(first), 0);
  combined.set(hexToBytes(second), 32);
  return createHash("sha256").update(combined).digest("hex");
}

function buildLevels(leafHashes: string[]): string[][] {
  if (leafHashes.length === 0) {
    return [];
  }

  const levels: string[][] = [[...leafHashes]];

  while (levels[levels.length - 1].length > 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index];
      const right = currentLevel[index + 1];

      if (right === undefined) {
        nextLevel.push(left);
        continue;
      }

      nextLevel.push(hashPair(left, right));
    }

    levels.push(nextLevel);
  }

  return levels;
}

export function encodeMerkleLeaf<Row>(index: number, row: Row): string {
  return stableStringify({ index, row });
}

export function hashMerkleLeaf<Row>(index: number, row: Row): string {
  return sha256Hex(encodeMerkleLeaf(index, row));
}

export function calculateMerkleRoot(leafHashes: string[]): string | null {
  if (leafHashes.length === 0) {
    return null;
  }

  const levels = buildLevels(leafHashes);
  return levels[levels.length - 1]?.[0] ?? null;
}

export function generateMerkleProof(leafHashes: string[], leafIndex: number): MerkleProofPath {
  if (leafIndex < 0 || leafIndex >= leafHashes.length) {
    throw new Error("Leaf index out of range");
  }

  const levels = buildLevels(leafHashes);
  const proof: string[] = [];
  let currentIndex = leafIndex;

  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
    const level = levels[levelIndex];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    const sibling = level[siblingIndex];

    if (sibling !== undefined) {
      proof.push(sibling);
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

export function verifyMerkleProof(args: {
  leaf_hash: string;
  proof: MerkleProofPath;
  root: string;
}): boolean {
  return computeMerkleRootFromProof(args.leaf_hash, args.proof) === args.root;
}

export function computeMerkleRootFromProof(leafHash: string, proof: MerkleProofPath): string {
  let currentHash = leafHash;

  for (const siblingHash of proof) {
    currentHash = hashPair(currentHash, siblingHash);
  }

  return currentHash;
}

export function buildMerkleLeafProofs<Row>(rows: Row[]): {
  algorithm: typeof MERKLE_ALGORITHM;
  root: string;
  leaf_count: number;
  leaves: Array<MerkleLeafProof<Row>>;
} {
  if (rows.length === 0) {
    throw new Error("Cannot build a Merkle tree for an empty row set");
  }

  const leafHashes = rows.map((row, index) => hashMerkleLeaf(index, row));
  const root = calculateMerkleRoot(leafHashes);

  if (!root) {
    throw new Error("Failed to calculate Merkle root");
  }

  return {
    algorithm: MERKLE_ALGORITHM,
    root,
    leaf_count: rows.length,
    leaves: rows.map((row, index) => ({
      index,
      row,
      leaf_hash: leafHashes[index],
      proof: generateMerkleProof(leafHashes, index),
    })),
  };
}
