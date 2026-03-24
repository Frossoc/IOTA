import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const API_KEY_PLAIN = process.env.PHASE2_API_KEY_PLAIN || "por_test_phase2.abc123456789xyz";
const KEY_PREFIX = API_KEY_PLAIN.includes(".") ? API_KEY_PLAIN.split(".")[0] : API_KEY_PLAIN.slice(0, 16);
const KEY_HASH = createHash("sha256").update(API_KEY_PLAIN, "utf8").digest("hex");

const CLIENT_NAME = process.env.PHASE2_CLIENT_NAME || "Phase2 Client";
const CLIENT_SLUG = process.env.PHASE2_CLIENT_SLUG || "phase2-client";
const KEY_ENV = process.env.PHASE2_KEY_ENV || "testnet";
const QUOTA_MIN = Number.parseInt(process.env.PHASE2_QUOTA_PER_MINUTE || "2", 10);
const QUOTA_DAY = Number.parseInt(process.env.PHASE2_QUOTA_PER_DAY || "100", 10);

async function main() {
  const clientUpsert = await client
    .from("clients_por")
    .upsert({ name: CLIENT_NAME, slug: CLIENT_SLUG, is_active: true }, { onConflict: "slug" })
    .select("id")
    .limit(1);

  if (clientUpsert.error || !clientUpsert.data?.[0]?.id) {
    throw new Error(`Failed upserting clients_por: ${clientUpsert.error?.message ?? "unknown"}`);
  }

  const clientId = clientUpsert.data[0].id;

  const del = await client.from("api_keys_por").delete().eq("key_hash", KEY_HASH);
  if (del.error) {
    throw new Error(`Failed deleting existing api key: ${del.error.message}`);
  }

  const insert = await client.from("api_keys_por").insert({
    client_id: clientId,
    key_prefix: KEY_PREFIX,
    key_hash: KEY_HASH,
    env: KEY_ENV,
    is_active: true,
    quota_per_minute: QUOTA_MIN,
    quota_per_day: QUOTA_DAY,
  });

  if (insert.error) {
    throw new Error(`Failed inserting api key: ${insert.error.message}`);
  }

  console.log(JSON.stringify({
    client_id: clientId,
    api_key_plain: API_KEY_PLAIN,
    key_prefix: KEY_PREFIX,
    key_hash: KEY_HASH,
    env: KEY_ENV,
    quota_per_minute: QUOTA_MIN,
    quota_per_day: QUOTA_DAY,
  }, null, 2));
}

main().catch((error) => {
  console.error("PHASE2_SEED_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
