import { stableStringify } from "@/app/lib/proof/canonicalize";
import { sha256Hex } from "@/app/lib/proof/hash";

export type StoredBundle = {
  uri: string;
};

export async function storeBundle(bundle: unknown): Promise<StoredBundle> {
  const canonical = stableStringify(bundle);
  const digest = sha256Hex(canonical);
  return { uri: `local://bundle/${digest}` };
}
