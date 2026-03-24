import { createClient } from "@supabase/supabase-js";

export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
  schema: string;
};

export function readSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const schema = process.env.SUPABASE_SCHEMA?.trim() || "public";

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey,
    schema,
  };
}

export function createSupabaseServerClient() {
  const config = readSupabaseServerConfig();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: config.schema,
    },
  });
}
