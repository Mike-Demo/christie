import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { WaSpinner } from "@/design-system/font-awsome-web-awesome-171158";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallback,
});

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/connect";
  return value;
}

function AuthCallback() {
  useEffect(() => {
    // Wait until the session is actually available before leaving this public
    // route: protected destinations would otherwise bounce back to sign-in.
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const target = safeNext(params.get("next") ?? sessionStorage.getItem("harper:next"));
    sessionStorage.removeItem("harper:next");

    const go = () => {
      if (!cancelled) window.location.replace(target);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    if (tokenHash) {
      // Gravatar sign-in: redeem the one-time token issued by our server.
      window.history.replaceState(null, "", "/auth/callback");
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }).then(({ error }) => {
        if (error && !cancelled) window.location.replace(`/auth?error=gravatar&next=${encodeURIComponent(target)}`);
      });
    } else {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) go();
      });
    }

    const timer = setTimeout(() => {
      if (!cancelled) window.location.replace("/auth");
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="app-section wa-stack wa-gap-s wa-align-items-center">
      <WaSpinner />
      <p>Finishing sign-in…</p>
    </main>
  );
}
