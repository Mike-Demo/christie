import { auth, defineMcp } from "@lovable.dev/mcp-js";

import checkGrammarTool from "./tools/check-grammar";

// The OAuth issuer must be the direct Supabase auth host: the published
// runtime URL is a proxy and would fail RFC 8414 issuer matching. The project
// ref is inlined at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "ceo-owl",
  title: "CEO Owl",
  version: "0.1.0",
  instructions:
    "Privacy-first English grammar checking powered by Harper. Use `check_grammar` to find grammar, spelling, punctuation and style problems in English text; it returns findings with character offsets and suggested replacements. Only English is supported. Submitted text is processed in memory and never stored.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [checkGrammarTool],
});
