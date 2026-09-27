import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import {
  WaButton,
  WaCallout,
  WaCard,
  WaIcon,
} from "@/design-system/font-awsome-web-awesome-171158";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harper Grammar — private English grammar checking" },
      {
        name: "description",
        content:
          "Check English writing without uploading it. The editor runs the Harper engine on your own device, and AI clients can connect to the same checker over a signed-in connection.",
      },
      { property: "og:title", content: "Harper Grammar — private English grammar checking" },
      {
        property: "og:description",
        content:
          "Check English writing without uploading it. The editor runs on your own device, and AI clients connect over a signed-in connection.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: "laptop-code",
    title: "Runs on your device",
    body: "The editor loads the checker into your browser. Your writing is analysed locally and is never uploaded.",
  },
  {
    icon: "plug",
    title: "Connect an AI client",
    body: "Sign in once and your assistant can call the same grammar check as a tool, with no keys to copy or paste.",
  },
  {
    icon: "eye-slash",
    title: "Nothing is kept",
    body: "No submitted text, no fragments, no suggestions and no corrected output are stored or logged — anywhere.",
  },
] as const;

function Landing() {
  return (
    <AppShell>
      <section className="app-section app-hero wa-stack wa-gap-l">
        <div className="app-measure wa-stack wa-gap-m">
          <h1>Grammar checking that keeps your writing to yourself</h1>
          <p>
            Harper Grammar checks English writing for spelling, agreement, punctuation and style
            problems. The editor runs entirely in your browser, so the text you check never leaves
            your device. Assistants such as Claude, ChatGPT and Cursor can connect to the same
            checker by signing in.
          </p>
          <div className="wa-cluster wa-gap-s">
            <Link to="/editor">
              <WaButton variant="brand" size="large">
                <WaIcon slot="start" name="pen-to-square" />
                Try the editor
              </WaButton>
            </Link>
            <Link to="/connect">
              <WaButton appearance="outlined" size="large">
                <WaIcon slot="start" name="plug" />
                Connect an AI client
              </WaButton>
            </Link>
          </div>
        </div>
      </section>

      <section className="app-section wa-stack wa-gap-l">
        <div className="wa-grid wa-gap-l">
          {FEATURES.map((feature) => (
            <WaCard key={feature.title}>
              <div className="wa-stack wa-gap-xs">
                <WaIcon name={feature.icon} />
                <h2>{feature.title}</h2>
                <p>{feature.body}</p>
              </div>
            </WaCard>
          ))}
        </div>
      </section>

      <section className="app-section-tight wa-stack wa-gap-m">
        <WaCallout variant="neutral">
          <WaIcon slot="icon" name="language" />
          <strong>English only.</strong> This service checks English text. Requests in any other
          language are refused with a clear message rather than guessed at.
        </WaCallout>

        <WaCallout variant="neutral">
          <WaIcon slot="icon" name="shield-halved" />
          <strong>Privacy.</strong> We do not train anything on your writing, and we do not keep it.
          Only anonymous counts — how many checks ran, how long they took — are recorded.{" "}
          <Link to="/privacy">Read the privacy note</Link>.
        </WaCallout>

        <WaCallout variant="neutral">
          <WaIcon slot="icon" name="circle-info" />
          <strong>Built on Harper.</strong> Grammar analysis is performed by the open-source Harper
          engine, licensed under Apache 2.0. This is an independent project and is not endorsed by
          or affiliated with Automattic. <Link to="/terms">Full attribution</Link>.
        </WaCallout>
      </section>
    </AppShell>
  );
}
