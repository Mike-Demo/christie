import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { LicensesPage } from "@/design-system/font-awsome-web-awesome-171158";

export const Route = createFileRoute("/licenses")({
  head: () => ({
    meta: [
      { title: "Licenses — Harper Grammar" },
      {
        name: "description",
        content:
          "Open-source credits for Harper Grammar, including the Harper grammar engine, Web Awesome, Font Awesome Free, React and TanStack.",
      },
      { property: "og:title", content: "Licenses — Harper Grammar" },
      { property: "og:description", content: "Open-source credits for Harper Grammar." },
    ],
  }),
  component: Licenses,
});

function Licenses() {
  return (
    <AppShell>
      <section className="app-section-tight">
        <LicensesPage
          groups={[
            {
              title: "Grammar engine",
              entries: [
                {
                  name: "Harper",
                  author: "Automattic and the Harper contributors",
                  license: "Apache-2.0",
                  url: "https://github.com/Automattic/harper",
                  note: "Performs all grammar analysis, in the browser and in the companion grammar service.",
                },
              ],
            },
          ]}
        />
      </section>
    </AppShell>
  );
}
