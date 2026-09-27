/**
 * Browser-only grammar engine.
 *
 * Harper runs entirely on the device: the WebAssembly module is fetched by the
 * browser and every check happens locally, so editor text never leaves the
 * machine. This module must only ever be imported dynamically, after
 * hydration — it touches browser APIs and must not be evaluated during server
 * rendering.
 */

// The ~16 MB engine binary is hosted as an external asset and fetched by URL.
import harperWasmAsset from "@/assets/harper_wasm_bg.wasm.asset.json";

const wasmUrl: string = harperWasmAsset.url;

import {
  grammarFailure,
  type CheckGrammarOptions,
  type GrammarResult,
} from "./contract";
import { normalizeLints, resolveOptions, type RawLint } from "./normalize";
import { validateCheckRequest } from "./validate";

interface HarperSpan {
  start: number;
  end: number;
}

interface HarperSuggestion {
  kind(): number;
  get_replacement_text(): string;
}

interface HarperLint {
  lint_kind(): string;
  message(): string;
  span(): HarperSpan;
  suggestions(): HarperSuggestion[];
}

interface HarperLinter {
  setup(): Promise<void>;
  organizedLints(text: string, options?: Record<string, unknown>): Promise<Record<string, HarperLint[]>>;
}

/** SuggestionKind.Replace — the only kind that can be auto-applied. */
const REPLACE_KIND = 0;

let linterPromise: Promise<HarperLinter> | null = null;

async function getLinter(): Promise<HarperLinter> {
  if (!linterPromise) {
    linterPromise = (async () => {
      const harper = await import("harper.js");
      const binary = harper.createBinaryModuleFromUrl(wasmUrl, "full");
      const linter = new harper.LocalLinter({ binary }) as unknown as HarperLinter;
      await linter.setup();
      return linter;
    })().catch((error: unknown) => {
      linterPromise = null;
      throw error;
    });
  }
  return linterPromise;
}

/** Warms the engine up so the first check is not the one that pays for loading. */
export async function preloadBrowserLinter(): Promise<void> {
  await getLinter();
}

function toRawLints(organized: Record<string, HarperLint[]>): RawLint[] {
  const raw: RawLint[] = [];

  for (const [ruleId, lints] of Object.entries(organized)) {
    for (const lint of lints) {
      const span = lint.span();
      const replacements: string[] = [];

      for (const suggestion of lint.suggestions()) {
        if (suggestion.kind() !== REPLACE_KIND) continue;
        const replacement = suggestion.get_replacement_text();
        if (typeof replacement === "string") replacements.push(replacement);
      }

      raw.push({
        rule_id: ruleId || null,
        kind: lint.lint_kind(),
        message: lint.message(),
        start: span.start,
        end: span.end,
        replacements,
      });
    }
  }

  return raw;
}

export interface BrowserCheckInput extends CheckGrammarOptions {
  text: string;
  maxChars: number;
}

export async function checkGrammarInBrowser(input: BrowserCheckInput): Promise<GrammarResult> {
  const invalid = validateCheckRequest({
    text: input.text,
    language: input.language,
    maxChars: input.maxChars,
  });
  if (invalid) return invalid;

  const options = resolveOptions(input);
  const startedAt = performance.now();

  try {
    const linter = await getLinter();
    const organized = await linter.organizedLints(input.text, { language: "plaintext" });
    return await normalizeLints(
      input.text,
      toRawLints(organized),
      options,
      performance.now() - startedAt,
    );
  } catch {
    // Reduced to a fixed code at the boundary: raw engine errors can quote the
    // document and must never surface or be logged.
    return grammarFailure("internal", "The grammar engine could not complete this check.");
  }
}
