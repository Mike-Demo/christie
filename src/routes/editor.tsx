import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  WaBadge,
  WaButton,
  WaButtonGroup,
  WaCallout,
  WaCard,
  WaIcon,
  WaSpinner,
  WaTag,
  WaTextarea,
} from "@/design-system/font-awsome-web-awesome-171158";
import { DEFAULT_LIMITS } from "@/lib/grammar/config";
import { applySafeSuggestions, type GrammarResult, type Issue } from "@/lib/grammar/contract";
import { blocksToPlainText, type EditorBlock } from "@/lib/block-editor/text";

// Loaded on demand only: the Gutenberg bundle is large and browser-only.
const LazyBlockEditor = lazy(() => import("@/lib/block-editor/BlockEditor"));

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor — CEO Owl" },
      {
        name: "description",
        content:
          "Paste English text and check it for grammar, spelling and style problems. The check runs in your browser; your text never leaves this device.",
      },
      { property: "og:title", content: "Editor — CEO Owl" },
      {
        property: "og:description",
        content: "Check English text in your browser. Your writing never leaves this device.",
      },
      { property: "og:image", content: "https://ceoowl.com/og-image.png" },
      { name: "twitter:image", content: "https://ceoowl.com/og-image.png" },
    ],
  }),
  component: EditorPage,
});

type Status = "idle" | "loading-engine" | "checking" | "done" | "error";

const SAMPLE =
  "This is an test sentance with an error. I has a apple, and their going to the store tomorow.";

type EditorMode = "plain" | "blocks";

function EditorPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<EditorMode>("plain");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  // Seed and remount key for the block editor (it only reads initialText on mount).
  const [blockSeed, setBlockSeed] = useState("");
  const [blockKey, setBlockKey] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLElement | null>(null);

  const maxChars = DEFAULT_LIMITS.maxCharsPerRequest;
  const effectiveText = mode === "blocks" ? blocksToPlainText(blocks) : text;
  const overLimit = effectiveText.length > maxChars;

  // Warm the engine after hydration so the first check is not the slow one.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { preloadBrowserLinter } = await import("@/lib/grammar/browser-linter");
        await preloadBrowserLinter();
      } catch {
        if (!cancelled) {
          setNotice("The grammar engine could not be loaded. Check your connection and reload.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Web Awesome form controls emit their own DOM events; React onChange does not fire.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    const handler = (event: Event) => {
      const target = event.target as { value?: string } | null;
      setText(target?.value ?? "");
    };
    element.addEventListener("input", handler);
    return () => element.removeEventListener("input", handler);
  }, []);

  const setEditorText = useCallback((next: string) => {
    setText(next);
    const element = textareaRef.current as (HTMLElement & { value?: string }) | null;
    if (element) element.value = next;
  }, []);

  /** Replace the block editor's content by re-seeding and remounting it. */
  const setBlockText = useCallback((next: string) => {
    setBlockSeed(next);
    setBlocks([]);
    setBlockKey((key) => key + 1);
  }, []);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;
      if (next === "blocks") {
        setBlockSeed(text);
        setBlocks([]);
        setBlockKey((key) => key + 1);
      } else {
        setEditorText(blocksToPlainText(blocks));
      }
      setResult(null);
      setStatus("idle");
      setNotice(null);
      setMode(next);
    },
    [blocks, mode, setEditorText, text],
  );

  const runCheck = useCallback(async () => {
    setNotice(null);
    if (effectiveText.trim().length === 0) {
      setResult(null);
      setStatus("idle");
      setNotice("Type or paste some text first.");
      return;
    }

    setStatus("loading-engine");
    try {
      const { checkGrammarInBrowser } = await import("@/lib/grammar/browser-linter");
      setStatus("checking");
      const next = await checkGrammarInBrowser({ text: effectiveText, maxChars });
      setResult(next);
      setStatus(next.success ? "done" : "error");
    } catch {
      setResult(null);
      setStatus("error");
      setNotice("The check could not be completed. Please try again.");
    }
  }, [effectiveText, maxChars]);

  const clearAll = useCallback(() => {
    if (mode === "blocks") {
      setBlockText("");
    } else {
      setEditorText("");
    }
    setResult(null);
    setStatus("idle");
    setNotice(null);
  }, [mode, setBlockText, setEditorText]);

  const issues: Issue[] = useMemo(
    () => (result && result.success ? result.issues : []),
    [result],
  );
  const safeCount = useMemo(() => issues.filter((issue) => issue.safe).length, [issues]);

  /** Apply corrected text to whichever editor is active. */
  const applyCorrectedText = useCallback(
    (next: string, applied: number) => {
      if (mode === "blocks") {
        setBlockText(next);
        setNotice(
          `Applied ${applied} suggestion${applied === 1 ? "" : "s"}. Block formatting was reset to paragraphs. Run the check again.`,
        );
      } else {
        setEditorText(next);
        setNotice(
          `Applied ${applied} suggestion${applied === 1 ? "" : "s"}. Run the check again.`,
        );
      }
      setResult(null);
      setStatus("idle");
    },
    [mode, setBlockText, setEditorText],
  );

  const applyOne = useCallback(
    (issue: Issue) => {
      if (issue.suggestions.length === 0) return;
      const next =
        effectiveText.slice(0, issue.start) +
        issue.suggestions[0] +
        effectiveText.slice(issue.end);
      applyCorrectedText(next, 1);
    },
    [applyCorrectedText, effectiveText],
  );

  const applyAllSafe = useCallback(() => {
    const { text: next, applied } = applySafeSuggestions(effectiveText, issues);
    if (applied === 0) {
      setNotice("There are no unambiguous suggestions to apply.");
      return;
    }
    applyCorrectedText(next, applied);
  }, [applyCorrectedText, effectiveText, issues]);

  const busy = status === "loading-engine" || status === "checking";

  return (
    <AppShell>
      <section className="app-section-tight wa-stack wa-gap-m">
        <h1>Editor</h1>

        <WaCallout variant="success">
          <WaIcon slot="icon" name="lock" />
          <strong>Your text never leaves this device.</strong> The checker runs inside your browser.
          Nothing you type here is uploaded, stored or logged.
        </WaCallout>

        <div className="app-editor-grid">
          <WaCard>
            <div className="wa-stack wa-gap-s">
              <WaTextarea
                ref={textareaRef}
                className="app-textarea"
                label="Your text"
                placeholder="Paste or write English text here…"
                rows={16}
                resize="vertical"
                value={text}
              />

              <div className="wa-split wa-align-items-center">
                <small>
                  {text.length.toLocaleString()} / {maxChars.toLocaleString()} characters
                </small>
                {overLimit ? <WaBadge variant="danger">Over the limit</WaBadge> : null}
              </div>

              <div className="wa-cluster wa-gap-xs">
                <WaButton variant="brand" disabled={busy || overLimit} onClick={() => void runCheck()}>
                  <WaIcon slot="start" name="spell-check" />
                  Check grammar
                </WaButton>
                <WaButton
                  appearance="outlined"
                  disabled={busy || safeCount === 0}
                  onClick={applyAllSafe}
                >
                  Apply all safe suggestions
                </WaButton>
                <WaButton appearance="plain" disabled={busy} onClick={clearAll}>
                  Clear
                </WaButton>
                <WaButton appearance="plain" disabled={busy} onClick={() => setEditorText(SAMPLE)}>
                  Use sample text
                </WaButton>
              </div>
            </div>
          </WaCard>

          <WaCard>
            <div slot="header" className="wa-split wa-align-items-center">
              <strong>Findings</strong>
              {result && result.success ? (
                <WaBadge variant={result.issue_count === 0 ? "success" : "neutral"}>
                  {result.issue_count}
                </WaBadge>
              ) : null}
            </div>

            <div className="wa-stack wa-gap-s app-issue-list">
              {notice ? (
                <WaCallout variant="neutral">
                  <WaIcon slot="icon" name="circle-info" />
                  {notice}
                </WaCallout>
              ) : null}

              {busy ? (
                <div className="wa-cluster wa-gap-xs wa-align-items-center">
                  <WaSpinner />
                  <span>
                    {status === "loading-engine"
                      ? "Loading the grammar engine…"
                      : "Checking your text…"}
                  </span>
                </div>
              ) : null}

              {!busy && result && !result.success ? (
                <WaCallout variant="danger">
                  <WaIcon slot="icon" name="triangle-exclamation" />
                  {result.error.message}
                </WaCallout>
              ) : null}

              {!busy && result && result.success && result.issue_count === 0 ? (
                <WaCallout variant="success">
                  <WaIcon slot="icon" name="circle-check" />
                  No problems found in {result.document_length.toLocaleString()} characters.
                </WaCallout>
              ) : null}

              {!busy && !result && !notice ? (
                <p>Run a check to see findings here.</p>
              ) : null}

              {!busy &&
                issues.map((issue) => (
                  <WaCard key={`${issue.id}-${issue.start}`} appearance="outlined">
                    <div className="wa-stack wa-gap-2xs">
                      <div className="wa-cluster wa-gap-2xs">
                        <WaTag size="small">{issue.category}</WaTag>
                        {issue.rule_id ? (
                          <WaTag size="small" appearance="outlined">
                            {issue.rule_id}
                          </WaTag>
                        ) : null}
                        {issue.safe ? (
                          <WaTag size="small" variant="success">
                            safe
                          </WaTag>
                        ) : null}
                      </div>

                      <p>{issue.message}</p>
                      <small>
                        Characters {issue.start}–{issue.end}: “{issue.original_text}”
                      </small>

                      {issue.suggestions.length > 0 ? (
                        <div className="wa-cluster wa-gap-2xs wa-align-items-center">
                          <small>Suggested: {issue.suggestions.slice(0, 3).join(", ")}</small>
                          <WaButton size="small" onClick={() => applyOne(issue)}>
                            Apply
                          </WaButton>
                        </div>
                      ) : (
                        <small>No automatic replacement available.</small>
                      )}
                    </div>
                  </WaCard>
                ))}
            </div>

            {result && result.success ? (
              <div slot="footer">
                <small>Checked locally in {result.processing_ms} ms.</small>
              </div>
            ) : null}
          </WaCard>
        </div>
      </section>
    </AppShell>
  );
}
