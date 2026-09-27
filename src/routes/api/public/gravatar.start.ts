import { createFileRoute } from "@tanstack/react-router";

import {
  GRAVATAR_COOKIE,
  GRAVATAR_COOKIE_MAX_AGE_S,
  buildAuthorizeUrl,
  encodeFlowState,
  safeNext,
} from "@/lib/auth/gravatar";

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/gravatar/start")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const state = randomState();
        const next = safeNext(url.searchParams.get("next"));
        const cookie = `${GRAVATAR_COOKIE}=${encodeFlowState({ state, next })}; Path=/api/public/gravatar; Max-Age=${GRAVATAR_COOKIE_MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`;
        return new Response(null, {
          status: 302,
          headers: {
            Location: buildAuthorizeUrl(url.origin, state),
            "Set-Cookie": cookie,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
