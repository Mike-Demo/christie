import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  WaBadge,
  WaButton,
  WaCallout,
  WaCard,
  WaCopyButton,
  WaIcon,
  WaSpinner,
} from "@/design-system/font-awsome-web-awesome-171158";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listConnectedClients, revokeConnectedClient, type ConnectedClient } from "@/lib/connected-clients";

export const Route = createFileRoute("/connect")({
  ssr: false,
  // After the OAuth consent screen approves (or denies) a connection, the
  // authorization server redirects back here with ?code= / ?error=. Surface
  // that outcome instead of silently rendering the generic page.
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : undefined,
    state: typeof search["state"] === "string" ? search["state"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    error_description:
      typeof search["error_description"] === "string" ? search["error_description"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connect an AI client — CEO Owl" },
      {
        name: "description",
        content:
          "Sign in and point Claude, ChatGPT, Cursor or another assistant at the CEO Owl grammar tool. No keys to copy — your client signs you in.",
      },
      { property: "og:title", content: "Connect an AI client — CEO Owl" },
      {
        property: "og:description",
        content: "Point your assistant at the CEO Owl grammar tool. No keys to copy.",
      },
      { property: "og:image", content: "https://ceoowl.com/og-image.png" },
      { name: "twitter:image", content: "https://ceoowl.com/og-image.png" },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const { user, loading } = useAuth();
  const { code, error, error_description } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [endpoint, setEndpoint] = useState("");
  const [clients, setClients] = useState<ConnectedClient[] | null>(null);
  const [clientsUnavailable, setClientsUnavailable] = useState(false);

  useEffect(() => {
    setEndpoint(`${window.location.origin}/mcp`);
  }, []);

  const clearResult = useCallback(() => {
    void navigate({
      to: "/connect",
      search: { code: undefined, state: undefined, error: undefined, error_description: undefined },
    });
  }, [navigate]);

  const refreshClients = useCallback(async () => {
    const result = await listConnectedClients();
    if (result === null) {
      setClientsUnavailable(true);
      setClients([]);
      return;
    }
    setClients(result);
  }, []);

  useEffect(() => {
    if (user) void refreshClients();
  }, [refreshClients, user]);

  const config = JSON.stringify(
    { mcpServers: { "ceo-owl": { url: endpoint || "https://example.com/mcp" } } },
    null,
    2,
  );

  return (
    <AppShell>
      <section className="app-section-tight wa-stack wa-gap-m app-measure">
        <h1>Connect an AI client</h1>
        <p>
          Your assistant connects by signing you in — there are no keys to create, copy or paste.
          Add the address below to your client, approve the connection when your browser opens,
          and the <code>check_grammar</code> tool becomes available.
        </p>

        {error ? (
          <WaCallout variant="danger">
            <WaIcon slot="icon" name="triangle-exclamation" />
            Connection not approved
            {error_description ? `: ${error_description}` : ` (${error})`}.
            <div className="wa-cluster wa-gap-xs">
              <WaButton size="small" appearance="outlined" onClick={clearResult}>
                Dismiss
              </WaButton>
            </div>
          </WaCallout>
        ) : code ? (
          <WaCard>
            <div className="wa-stack wa-gap-s">
              <WaCallout variant="success">
                <WaIcon slot="icon" name="circle-check" />
                Connection approved — your client received its authorization code and can now use
                the <code>check_grammar</code> tool as you.
              </WaCallout>
              <div>
                <small>
                  Driving the flow by hand? Copy the code below into your client — it can only be
                  used once and expires quickly.
                </small>
              </div>
              <div className="wa-cluster wa-gap-xs wa-align-items-center">
                <code>{code}</code>
                <WaCopyButton value={code} />
                <WaButton size="small" appearance="outlined" onClick={clearResult}>
                  Dismiss
                </WaButton>
              </div>
            </div>
          </WaCard>
        ) : null}

        <WaCard>
          <div slot="header" className="wa-split wa-align-items-center">
            <strong>Connection status</strong>
            {loading ? (
              <WaSpinner />
            ) : (
              <WaBadge variant={user ? "success" : "neutral"}>
                {user ? "Signed in" : "Signed out"}
              </WaBadge>
            )}
          </div>
          <div className="wa-stack wa-gap-s">
            {user ? (
              <>
                <p>
                  Signed in as <strong>{user.email}</strong>.
                </p>
                <div className="wa-cluster wa-gap-xs">
                  <WaButton
                    appearance="outlined"
                    onClick={() => void supabase.auth.signOut()}
                  >
                    Sign out
                  </WaButton>
                </div>
              </>
            ) : (
              <>
                <p>Sign in so your assistant has an account to connect to.</p>
                <Link to="/auth" search={{ next: "/connect" }}>
                  <WaButton variant="brand">Sign in</WaButton>
                </Link>
              </>
            )}
          </div>
        </WaCard>

        <WaCard>
          <div slot="header">
            <strong>Endpoint</strong>
          </div>
          <div className="wa-stack wa-gap-s">
            <div className="wa-cluster wa-gap-xs wa-align-items-center">
              <code>{endpoint || "…"}</code>
              {endpoint ? <WaCopyButton value={endpoint} /> : null}
            </div>
            <small>Streamable HTTP. Authorization is handled by the sign-in flow above.</small>
          </div>
        </WaCard>

        <WaCard>
          <div slot="header" className="wa-split wa-align-items-center">
            <strong>Client configuration</strong>
            <WaCopyButton value={config} />
          </div>
          <pre className="app-code">{config}</pre>
          <div slot="footer">
            <small>
              Paste this into your client&rsquo;s configuration file. Some clients ask for the
              address only — use the endpoint above. <Link to="/docs">Full documentation</Link>.
            </small>
          </div>
        </WaCard>

        <WaCard>
          <div slot="header">
            <strong>Connected clients</strong>
          </div>
          <div className="wa-stack wa-gap-s">
            {!user ? (
              <p>Sign in to see the clients connected to your account.</p>
            ) : clients === null ? (
              <WaSpinner />
            ) : clientsUnavailable ? (
              <WaCallout variant="neutral">
                <WaIcon slot="icon" name="circle-info" />
                The list of connected clients is not available yet. You can always disconnect from
                inside the client itself, and access expires if it is not refreshed.
              </WaCallout>
            ) : clients.length === 0 ? (
              <p>No clients are connected to your account.</p>
            ) : (
              clients.map((client) => (
                <div key={client.id} className="wa-split wa-align-items-center">
                  <div className="wa-stack wa-gap-3xs">
                    <strong>{client.name}</strong>
                    {client.connectedAt ? (
                      <small>Connected {new Date(client.connectedAt).toLocaleString()}</small>
                    ) : null}
                  </div>
                  <WaButton
                    size="small"
                    appearance="outlined"
                    variant="danger"
                    onClick={async () => {
                      await revokeConnectedClient(client.id);
                      await refreshClients();
                    }}
                  >
                    Revoke
                  </WaButton>
                </div>
              ))
            )}

            <WaCallout variant="warning">
              <WaIcon slot="icon" name="clock" />
              Revoking a client stops it from renewing its access. An access token it already holds
              keeps working until it expires — up to about one hour.
            </WaCallout>
          </div>
        </WaCard>
      </section>
    </AppShell>
  );
}
