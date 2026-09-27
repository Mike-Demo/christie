import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { WaCallout, WaIcon } from "@/design-system/font-awsome-web-awesome-171158";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — CEO Owl" },
      {
        name: "description",
        content:
          "What CEO Owl does and does not keep: no submitted text, no fragments, no suggestions, no IP addresses. Only anonymous usage counts.",
      },
      { property: "og:title", content: "Privacy — CEO Owl" },
      {
        property: "og:description",
        content: "No submitted text is stored or logged. Only anonymous usage counts are kept.",
      },
      { property: "og:image", content: "https://ceoowl.com/og-image.png" },
      { name: "twitter:image", content: "https://ceoowl.com/og-image.png" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell>
      <section className="app-section-tight wa-stack wa-gap-m app-measure">
        <h1>Privacy</h1>

        <WaCallout variant="success">
          <WaIcon slot="icon" name="lock" />
          Nothing you write is used to train anything, and nothing you write is kept.
        </WaCallout>

        <h2>In the editor</h2>
        <p>
          The grammar engine is downloaded into your browser and runs there. Text typed into the
          editor is never sent to our servers, so there is nothing for us to store, log or read.
        </p>

        <h2>Through a connected AI client</h2>
        <p>
          When an assistant calls the grammar tool, the text travels to the grammar service, is
          held in memory only for the length of that single request, and is discarded as soon as
          the response is produced. It is never written to a database, a file or a log line.
        </p>

        <h2>What we never store or log</h2>
        <ul>
          <li>Your submitted text, or any fragment of it</li>
          <li>Suggestions, corrected output, or messages derived from your text</li>
          <li>Raw IP addresses</li>
          <li>Authorization headers or access tokens</li>
        </ul>

        <h2>What we do record</h2>
        <p>
          For each check we keep an anonymous usage row: a timestamp, the account that made the
          request, which operation ran, how many characters it contained, how many findings came
          back, whether it succeeded, a short error code if it did not, and how many milliseconds
          it took. These counts exist to keep the service healthy and to enforce fair-use limits.
        </p>

        <h2>Retention</h2>
        <p>
          Submitted text: not retained at all. Usage counts: retained while your account exists,
          and removed when the account is deleted. There is no backup or archive that contains
          submitted text, because it is never written anywhere.
        </p>

        <h2>Access</h2>
        <p>
          Usage rows are protected so each account can only read its own. Aggregate, anonymous
          totals are visible to service administrators on the health page.
        </p>
      </section>
    </AppShell>
  );
}
