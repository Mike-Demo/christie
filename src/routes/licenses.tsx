import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { LicensesPage } from "@/design-system/font-awsome-web-awesome-171158";

export const Route = createFileRoute("/licenses")({
  head: () => ({
    meta: [
      { title: "Licenses — CEO Owl" },
      {
        name: "description",
        content:
          "Open-source credits for CEO Owl, including the Harper grammar engine, Web Awesome, Font Awesome Free, React and TanStack.",
      },
      { property: "og:title", content: "Licenses — CEO Owl" },
      { property: "og:description", content: "Open-source credits for CEO Owl." },
      { property: "og:image", content: "https://ceoowl.com/og-image.png" },
      { name: "twitter:image", content: "https://ceoowl.com/og-image.png" },
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
            {
              title: "Block editor",
              entries: [
                {
                  name: "Isolated Block Editor",
                  author: "Automattic and contributors",
                  license: "GPL-2.0-or-later",
                  url: "https://github.com/Automattic/isolated-block-editor",
                  note: "Powers the optional block editor mode. CEO Owl is not endorsed by or affiliated with Automattic.",
                },
                {
                  name: "Gutenberg",
                  author: "WordPress contributors",
                  license: "GPL-2.0-or-later",
                  url: "https://github.com/WordPress/gutenberg",
                  note: "The WordPress block editor packages that the block editor mode is built on.",
                },
              ],
            },
            {
              title: "Services",
              entries: [
                {
                  name: "Gravatar",
                  author: "Automattic",
                  license: "Gravatar Terms of Service",
                  url: "https://gravatar.com",
                  note: "Optional \u201cContinue with Gravatar\u201d sign-in. CEO Owl is not endorsed by or affiliated with Automattic.",
                },
              ],
            },
          ]}
        />
      </section>
    </AppShell>
  );
}
