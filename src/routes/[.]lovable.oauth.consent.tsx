import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import {
  WaButton,
  WaCallout,
  WaCard,
  WaIcon,
} from "@/design-system/font-awsome-web-awesome-171158";
import { supabase } from "@/integrations/supabase/client";
import { authOAuth, resolveRedirect } from "@/lib/oauth-consent";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the session lives in localStorage, which SSR cannot read.
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search['authorization_id'] === "string" ? search['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = resolveRedirect(data);
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  errorComponent: ({ error }) => (
    <main className="app-section-tight app-measure">
      <WaCallout variant="danger">
        <WaIcon slot="icon" name="triangle-exclamation" />
        This authorization request could not be loaded:{" "}
        {String((error as Error)?.message ?? error)}
      </WaCallout>
    </main>
  ),
  component: Consent,
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "this client";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = authOAuth();
    const { data, error: decisionError } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);

    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }

    const target = resolveRedirect(data);
    if (!target) {
      setBusy(false);
      setError("The authorization server did not return a destination.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="app-section-tight app-measure wa-stack wa-gap-m">
      <WaCard>
        <div className="wa-stack wa-gap-s">
          <h1>Connect {clientName} to your account</h1>
          <p>
            This lets {clientName} use the Harper grammar checker as you. It can check text you
            send it, and nothing else — no other data in this app is exposed.
          </p>
          <ul>
            <li>Share your basic profile</li>
            <li>Share your email address</li>
            <li>Run grammar checks against your fair-use allowance</li>
          </ul>
          <p>
            <small>
              Text sent for checking is processed in memory and never stored. This does not bypass
              this app&rsquo;s permissions or backend policies.
            </small>
          </p>

          {error ? (
            <WaCallout variant="danger" role="alert">
              <WaIcon slot="icon" name="triangle-exclamation" />
              {error}
            </WaCallout>
          ) : null}

          <div className="wa-cluster wa-gap-xs">
            <WaButton variant="brand" disabled={busy} onClick={() => void decide(true)}>
              Approve
            </WaButton>
            <WaButton appearance="outlined" disabled={busy} onClick={() => void decide(false)}>
              Cancel connection
            </WaButton>
          </div>
        </div>
      </WaCard>
    </main>
  );
}
