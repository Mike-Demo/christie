import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { WaCallout, WaIcon } from "@/design-system/font-awsome-web-awesome-171158";
import { DEFAULT_LIMITS } from "@/lib/grammar/config";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Harper Grammar" },
      {
        name: "description",
        content:
          "How to connect an AI client to the Harper grammar tool: endpoint, client configuration, the check_grammar tool contract, limits and error responses.",
      },
      { property: "og:title", content: "Documentation — Harper Grammar" },
      {
        property: "og:description",
        content: "Endpoint, client configuration, tool contract, limits and error responses.",
      },
    ],
  }),
  component: DocsPage,
});

const CLIENT_CONFIG = `{
  "mcpServers": {
    "harper-grammar": {
      "url": "https://<your-site>/mcp"
    }
  }
}`;

const TOOL_CALL = `{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "check_grammar",
    "arguments": {
      "text": "<your english text>",
      "language": "en",
      "include_suggestions": true,
      "include_rule_ids": true
    }
  }
}`;

const SUCCESS = `{
  "success": true,
  "contract_version": "1",
  "language": "en",
  "document_length": 42,
  "issue_count": 1,
  "processing_ms": 18,
  "issues": [
    {
      "id": "<stable-id>",
      "rule_id": "<rule-id>",
      "category": "grammar",
      "message": "<human readable explanation>",
      "start": 10,
      "end": 13,
      "original_text": "<span text>",
      "suggestions": ["<replacement>"],
      "safe": true
    }
  ]
}`;

const UNAUTHORIZED = `{
  "success": false,
  "contract_version": "1",
  "error": {
    "code": "unauthorized",
    "message": "Sign in to this app to use the grammar checker."
  }
}`;

const RATE_LIMITED = `{
  "success": false,
  "contract_version": "1",
  "error": {
    "code": "rate_limited",
    "message": "Hourly limit reached. Try again in <seconds> seconds.",
    "retry_after_s": 1800
  }
}`;

const UNSUPPORTED = `{
  "success": false,
  "contract_version": "1",
  "error": {
    "code": "unsupported_language",
    "message": "Only English ('en') is supported."
  }
}`;

function DocsPage() {
  return (
    <AppShell>
      <section className="app-section-tight wa-stack wa-gap-m app-measure">
        <h1>Documentation</h1>
        <p>
          The grammar checker is exposed to AI clients over Streamable HTTP at{" "}
          <code>/mcp</code>. Clients authenticate by signing you in; there are no API keys.
          All examples below use placeholders — replace anything in angle brackets.
        </p>

        <h2>1. Client configuration</h2>
        <pre className="app-code">{CLIENT_CONFIG}</pre>
        <p>
          Your exact address and a copy button are on the{" "}
          <Link to="/connect">connect page</Link>. On first use the client opens your browser so
          you can sign in and approve the connection.
        </p>

        <h2>2. Discovery</h2>
        <p>
          After <code>initialize</code>, a <code>tools/list</code> request returns one tool,{" "}
          <code>check_grammar</code>, with its input schema.
        </p>

        <h2>3. Calling the tool</h2>
        <pre className="app-code">{TOOL_CALL}</pre>
        <table className="app-table">
          <thead>
            <tr>
              <th>Argument</th>
              <th>Required</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>text</code>
              </td>
              <td>Yes</td>
              <td>
                The English text to check, up to{" "}
                {DEFAULT_LIMITS.maxCharsPerRequest.toLocaleString()} characters.
              </td>
            </tr>
            <tr>
              <td>
                <code>language</code>
              </td>
              <td>No</td>
              <td>
                Only <code>en</code> is accepted. Anything else is refused.
              </td>
            </tr>
            <tr>
              <td>
                <code>include_suggestions</code>
              </td>
              <td>No</td>
              <td>Include replacement text for each finding. Defaults to true.</td>
            </tr>
            <tr>
              <td>
                <code>include_rule_ids</code>
              </td>
              <td>No</td>
              <td>Include the Harper rule identifier. Defaults to true.</td>
            </tr>
          </tbody>
        </table>

        <h2>4. Successful response</h2>
        <pre className="app-code">{SUCCESS}</pre>
        <p>
          Findings are sorted deterministically: ascending <code>start</code>, then ascending{" "}
          <code>end</code>, then <code>rule_id</code> (findings without a rule identifier last).
          Identical tuples keep the order the engine emitted them in, so repeating the same request
          returns byte-identical output. Offsets are character indexes into the text you sent.
          A finding is <code>safe</code> when it has exactly one unambiguous replacement.
        </p>

        <h2>5. Error responses</h2>
        <h3>Not signed in</h3>
        <pre className="app-code">{UNAUTHORIZED}</pre>
        <h3>Rate limited</h3>
        <pre className="app-code">{RATE_LIMITED}</pre>
        <p>
          Wait <code>retry_after_seconds</code> before retrying. The default allowance is{" "}
          {DEFAULT_LIMITS.checksPerHour} checks per hour per account.
        </p>
        <h3>Unsupported language</h3>
        <pre className="app-code">{UNSUPPORTED}</pre>
        <p>
          Other codes: <code>invalid_input</code> (empty or non-text input),{" "}
          <code>too_large</code> (over the character limit), <code>timeout</code> (the check took
          longer than {Math.round(DEFAULT_LIMITS.requestTimeoutMs / 1000)} seconds) and{" "}
          <code>internal</code>.
        </p>

        <h2>6. Disconnecting</h2>
        <WaCallout variant="warning">
          <WaIcon slot="icon" name="clock" />
          Revoking a client stops it from renewing access, but an access token it already holds
          stays valid until it expires — up to about one hour.
        </WaCallout>

        <h2>7. Privacy</h2>
        <p>
          Text sent to the tool is held in memory for the length of the request and is never
          stored or logged. Only anonymous counters are recorded.{" "}
          <Link to="/privacy">Read the privacy note</Link>.
        </p>
      </section>
    </AppShell>
  );
}
