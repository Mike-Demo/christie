import { createFileRoute } from "@tanstack/react-router";

import {
  GRAVATAR_CLIENT_ID,
  GRAVATAR_COOKIE,
  GRAVATAR_ME_URL,
  GRAVATAR_TOKEN_URL,
  authErrorRedirect,
  callbackUrl,
  decodeFlowState,
  parseProfile,
  statesMatch,
} from "@/lib/auth/gravatar";
import { logEvent } from "@/lib/grammar/log";

const CLEAR_COOKIE = `${GRAVATAR_COOKIE}=; Path=/api/public/gravatar; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Set-Cookie": CLEAR_COOKIE, "Cache-Control": "no-store" },
  });
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

export const Route = createFileRoute("/api/public/gravatar/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const flow = decodeFlowState(readCookie(request.headers.get("cookie"), GRAVATAR_COOKIE));
        const next = flow?.next ?? "/connect";
        const fail = (reason: string) => {
          logEvent({ event: "gravatar_signin_failed", reason });
          return redirectTo(authErrorRedirect(url.origin, next));
        };

        if (!flow || !statesMatch(flow.state, url.searchParams.get("state"))) return fail("state");
        const code = url.searchParams.get("code");
        if (!code) return fail("denied");

        const secret = process.env["GRAVATAR_CLIENT_SECRET"];
        if (!secret) return fail("config");

        const tokenRes = await fetch(GRAVATAR_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GRAVATAR_CLIENT_ID,
            client_secret: secret,
            redirect_uri: callbackUrl(url.origin),
            code,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenRes.ok) return fail("token");
        const tokenBody = (await tokenRes.json()) as { access_token?: unknown };
        if (typeof tokenBody.access_token !== "string") return fail("token");

        const meRes = await fetch(GRAVATAR_ME_URL, {
          headers: { Authorization: `Bearer ${tokenBody.access_token}` },
        });
        if (!meRes.ok) return fail("profile");
        const profile = parseProfile(await meRes.json());
        if (!profile) return fail("unverified");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Existing accounts return "already registered"; that is expected and ignored.
        await supabaseAdmin.auth.admin.createUser({
          email: profile.email,
          email_confirm: true,
          user_metadata: {
            ...(profile.displayName ? { full_name: profile.displayName } : {}),
            ...(profile.avatarUrl ? { avatar_url: profile.avatarUrl } : {}),
          },
        });
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: profile.email,
        });
        const tokenHash = data?.properties?.hashed_token;
        if (error || !tokenHash) return fail("link");

        logEvent({ event: "gravatar_signin_ok" });
        const target = new URL("/auth/callback", url.origin);
        target.searchParams.set("token_hash", tokenHash);
        target.searchParams.set("next", next);
        return redirectTo(target.toString());
      },
    },
  },
});
