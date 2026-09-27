/**
 * Pure helpers for moving between Gutenberg blocks and plain text.
 *
 * These functions have no WordPress imports so they can be unit tested
 * outside the browser. The block editor component uses them to extract
 * text for the grammar check and to rebuild blocks after suggestions
 * are applied.
 */

export interface EditorBlock {
  name: string;
  attributes: Record<string, unknown>;
  innerBlocks: EditorBlock[];
}

/** Blocks the editor is restricted to (text blocks only). */
export const ALLOWED_BLOCKS = [
  "core/paragraph",
  "core/heading",
  "core/list",
  "core/list-item",
  "core/quote",
] as const;

function stripMarkup(html: string): string {
  return html
    .replace(/<br\s*\/?>(?![\s\S])/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  // Gutenberg stores rich text as an object exposing the plain text.
  if (content && typeof content === "object" && "text" in content) {
    const text = (content as { text: unknown }).text;
    if (typeof text === "string") return text;
  }
  return "";
}

function blockText(block: EditorBlock): string {
  const own = stripMarkup(contentToString(block.attributes["content"]));
  const inner = (block.innerBlocks ?? []).map(blockText).filter((part) => part.length > 0);
  if (block.name === "core/list") {
    return inner.join("\n");
  }
  return [own, ...inner].filter((part) => part.length > 0).join("\n");
}

/** Extract plain text from blocks: one chunk per top-level block, blank line between. */
export function blocksToPlainText(blocks: readonly EditorBlock[]): string {
  return blocks
    .map(blockText)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert plain text to block-delimited HTML the editor's parse function understands. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map(
      (chunk) =>
        `<!-- wp:paragraph --><p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p><!-- /wp:paragraph -->`,
    )
    .join("\n");
}
