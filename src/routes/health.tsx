import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import {
  WaCallout,
  WaCard,
  WaIcon,
  WaSpinner,
} from "@/design-system/font-awsome-web-awesome-171158";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/health")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Service health — CEO Owl" },
      {
        name: "description",
        content: "Anonymous usage counters for the grammar service. Administrators only.",
      },
      { property: "og:title", content: "Service health — CEO Owl" },
      { property: "og:description", content: "Anonymous usage counters. Administrators only." },
      { property: "og:image", content: "https://ceoowl.com/og-image.png" },
      { name: "twitter:image", content: "https://ceoowl.com/og-image.png" },
    ],
  }),
  component: HealthPage,
});

interface SummaryRow {
  bucket_hour: string;
  request_count: number;
  success_count: number;
  error_count: number;
  distinct_users: number;
  avg_latency_ms: number | null;
  avg_character_count: number | null;
}

function HealthPage() {
  const { user, loading } = useAuth();

  const roleQuery = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["usage-health"],
    enabled: roleQuery.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("usage_health_summary");
      if (error) throw error;
      return (data ?? []) as SummaryRow[];
    },
  });

  if (loading || (user && roleQuery.isLoading)) {
    return (
      <AppShell>
        <section className="app-section-tight">
          <WaSpinner />
        </section>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <section className="app-section-tight app-measure wa-stack wa-gap-s">
          <h1>Service health</h1>
          <p>
            This page is for service administrators. <Link to="/auth" search={{ next: "/health" }}>Sign in</Link> to continue.
          </p>
        </section>
      </AppShell>
    );
  }

  if (roleQuery.data !== true) {
    return (
      <AppShell>
        <section className="app-section-tight app-measure wa-stack wa-gap-s">
          <h1>Service health</h1>
          <WaCallout variant="warning">
            <WaIcon slot="icon" name="lock" />
            Your account does not have administrator access to this page.
          </WaCallout>
        </section>
      </AppShell>
    );
  }

  const rows = summaryQuery.data ?? [];
  const totals = rows.reduce(
    (acc, row) => ({
      requests: acc.requests + Number(row.request_count),
      errors: acc.errors + Number(row.error_count),
    }),
    { requests: 0, errors: 0 },
  );

  return (
    <AppShell>
      <section className="app-section-tight wa-stack wa-gap-m">
        <h1>Service health</h1>
        <p>
          Anonymous counters for the last seven days. No submitted text is recorded, so nothing on
          this page can reveal what anyone checked.
        </p>

        <div className="wa-grid wa-gap-m">
          <WaCard>
            <div className="wa-stack wa-gap-3xs">
              <small>Checks (7 days)</small>
              <strong>{totals.requests.toLocaleString()}</strong>
            </div>
          </WaCard>
          <WaCard>
            <div className="wa-stack wa-gap-3xs">
              <small>Failed checks</small>
              <strong>{totals.errors.toLocaleString()}</strong>
            </div>
          </WaCard>
        </div>

        <WaCard>
          <div slot="header">
            <strong>By hour</strong>
          </div>
          {summaryQuery.isLoading ? (
            <WaSpinner />
          ) : rows.length === 0 ? (
            <p>No activity recorded yet.</p>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th>Hour (UTC)</th>
                  <th>Checks</th>
                  <th>Succeeded</th>
                  <th>Failed</th>
                  <th>Accounts</th>
                  <th>Avg ms</th>
                  <th>Avg characters</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.bucket_hour}>
                    <td>{new Date(row.bucket_hour).toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td>{row.request_count}</td>
                    <td>{row.success_count}</td>
                    <td>{row.error_count}</td>
                    <td>{row.distinct_users}</td>
                    <td>{row.avg_latency_ms ?? "—"}</td>
                    <td>{row.avg_character_count ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </WaCard>
      </section>
    </AppShell>
  );
}
