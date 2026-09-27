import { supabase } from "@/integrations/supabase/client";

/**
 * Thin typed wrapper over the beta `supabase.auth.oauth` namespace used by the
 * OAuth consent screen.
 */
export interface AuthorizationDetails {
  client?: { name?: string; client_id?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  redirect_uri?: string;
}

interface OAuthNamespace {
  getAuthorizationDetails(id: string): Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization(
    id: string,
    options?: { skipBrowserRedirect?: boolean },
  ): Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization(
    id: string,
    options?: { skipBrowserRedirect?: boolean },
  ): Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
}

export function authOAuth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export function resolveRedirect(details: AuthorizationDetails | null | undefined): string | null {
  return details?.redirect_url ?? details?.redirect_to ?? null;
}
