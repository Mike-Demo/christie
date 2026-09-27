import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import {
  WaButton,
  WaCallout,
  WaCard,
  WaIcon,
} from "@/design-system/font-awsome-web-awesome-171158";

import logoAsset from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CEO Owl — private English grammar checking" },
      {
        name: "description",
        content:
          "Check English writing without uploading it. The editor runs the Harper engine on your own device, and AI clients can connect to the same checker over a signed-in connection.",
      },
      { property: "og:title", content: "CEO Owl — private English grammar checking" },
      {
        property: "og:description",
        content:
          "Check English writing without uploading it. The editor runs on your own device, and AI clients connect over a signed-in connection.",
      },
      { property: "og:image", content: "https://ceoowl.com/og-image.png" },
      { name: "twitter:image", content: "https://ceoowl.com/og-image.png" },
      { property: "og:url", content: "https://ceoowl.com/" },
    ],
    links: [{ rel: "canonical", href: "https://ceoowl.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://ceoowl.com/#website",
              url: "https://ceoowl.com/",
              name: "CEO Owl",
              description:
                "Check English writing without uploading it. The editor runs the Harper engine on your own device, and AI clients can connect to the same checker over a signed-in connection.",
              inLanguage: "en",
              publisher: { "@id": "https://ceoowl.com/#organization" },
            },
            {
              "@type": "Organization",
              "@id": "https://ceoowl.com/#organization",
              name: "CEO Owl",
              url: "https://ceoowl.com/",
              logo: "https://ceoowl.com/og-image.png",
            },
            {
              "@type": "WebApplication",
              "@id": "https://ceoowl.com/#app",
              name: "CEO Owl",
              url: "https://ceoowl.com/",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Web browser",
              description:
                "Private English grammar checking. The editor runs entirely in your browser, so checked text never leaves your device.",
              isPartOf: { "@id": "https://ceoowl.com/#website" },
              publisher: { "@id": "https://ceoowl.com/#organization" },
            },
          ],
        }),
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
      <section className="app-section app-hero app-hero-layout wa-gap-l">
        <div className="app-measure wa-stack wa-gap-m">
          <h1>Grammar checking that keeps your writing to yourself</h1>
          <p>
            CEO Owl checks English writing for spelling, agreement, punctuation and style
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
            <Link
              to="/connect"
              search={{
                code: undefined,
                state: undefined,
                error: undefined,
                error_description: undefined,
              }}
            >
              <WaButton appearance="outlined" size="large">
                <WaIcon slot="start" name="plug" />
                Connect an AI client
              </WaButton>
            </Link>
          </div>
        </div>
        <img src={logoAsset.url} alt="CEO Owl emblem" className="app-hero-mark" />
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
