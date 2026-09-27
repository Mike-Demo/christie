import { supabase } from "@/integrations/supabase/client";

/**
 * Connected clients are OAuth grants held by the authorization server, not rows
 * in this app's database. The listing API is still beta and may be absent, so
 * every call degrades to "unavailable" rather than throwing.
 */
export interface ConnectedClient {
  id: string;
  name: string;
  connectedAt?: string;
}

interface GrantRecord {
  id?: string;
  client_id?: string;
  client?: { name?: string; client_id?: string } | null;
  name?: string;
  created_at?: string;
}

type MaybeOAuth = {
  oauth?: {
    listGrants?: () => Promise<{ data?: GrantRecord[] | null; error?: unknown }>;
    revokeGrant?: (id: string) => Promise<{ error?: unknown }>;
  };
};

function oauth() {
  return (supabase.auth as unknown as MaybeOAuth).oauth;
}

/** Returns null when the authorization server does not expose a grant listing. */
export async function listConnectedClients(): Promise<ConnectedClient[] | null> {
  const api = oauth();
  if (!api?.listGrants) return null;

  try {
    const { data, error } = await api.listGrants();
    if (error || !Array.isArray(data)) return null;
    return data.map((grant, index) => ({
      id: grant.id ?? grant.client_id ?? String(index),
      name: grant.client?.name ?? grant.name ?? grant.client_id ?? "Unnamed client",
      ...(grant.created_at ? { connectedAt: grant.created_at } : {}),
    }));
  } catch {
    return null;
  }
}

export async function revokeConnectedClient(id: string): Promise<boolean> {
  const api = oauth();
  if (!api?.revokeGrant) return false;
  try {
    const { error } = await api.revokeGrant(id);
    return !error;
  } catch {
    return false;
  }
}
