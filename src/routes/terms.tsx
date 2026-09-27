import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { WaCallout, WaIcon } from "@/design-system/font-awsome-web-awesome-171158";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & attribution — Harper Grammar" },
      {
        name: "description",
        content:
          "Terms of use and open-source attribution. Grammar analysis is performed by Harper, licensed under Apache 2.0. Independent project, not endorsed by Automattic.",
      },
      { property: "og:title", content: "Terms & attribution — Harper Grammar" },
      {
        property: "og:description",
        content:
          "Harper is licensed under Apache 2.0. This is an independent project, not endorsed by Automattic.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <section className="app-section-tight wa-stack wa-gap-m app-measure">
        <h1>Terms &amp; attribution</h1>

        <WaCallout variant="warning">
          <WaIcon slot="icon" name="circle-exclamation" />
          <strong>Independent project.</strong> This service is not endorsed by, affiliated with,
          or sponsored by Automattic, Inc. or the Harper maintainers.
        </WaCallout>

        <h2>Using the service</h2>
        <p>
          The service is provided free of charge and as-is, with no warranty of any kind. Grammar
          suggestions are automated and may be wrong; you remain responsible for what you publish.
          Fair-use limits apply, and access may be limited or withdrawn to keep the service
          available to everyone.
        </p>

        <h2>Language support</h2>
        <p>
          Only English is supported. Requests in other languages are refused with a validation
          error rather than checked incorrectly.
        </p>

        <h2>Harper attribution</h2>
        <p>
          Grammar analysis is performed by <strong>Harper</strong>, an open-source grammar checker.
          Harper is licensed under the Apache License, Version 2.0. The license notices shipped
          with Harper are preserved in this project and are not removed or modified.
        </p>
        <pre className="app-code">{`Copyright the Harper contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`}</pre>
        <p>
          <a
            href="https://www.apache.org/licenses/LICENSE-2.0"
            target="_blank"
            rel="noreferrer noopener"
          >
            Read the Apache License 2.0
          </a>{" "}
          ·{" "}
          <a href="https://github.com/Automattic/harper" target="_blank" rel="noreferrer noopener">
            Harper source code
          </a>
        </p>

        <h2>Other open-source components</h2>
        <p>
          A full list of the libraries this site depends on, with their licenses, is on the{" "}
          <a href="/licenses">licenses page</a>.
        </p>
      </section>
    </AppShell>
  );
}
