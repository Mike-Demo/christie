import { describe, expect, test } from "bun:test";

import {
  ALLOWED_BLOCKS,
  blocksToPlainText,
  plainTextToHtml,
  type EditorBlock,
} from "@/lib/block-editor/text";

describe("blocksToPlainText", () => {
  test("joins top-level blocks with a blank line", () => {
    const blocks: EditorBlock[] = [
      { name: "core/paragraph", attributes: { content: "First paragraph." }, innerBlocks: [] },
      { name: "core/heading", attributes: { content: "A heading" }, innerBlocks: [] },
    ];
    expect(blocksToPlainText(blocks)).toBe("First paragraph.\n\nA heading");
  });

  test("flattens list items with single newlines", () => {
    const blocks: EditorBlock[] = [
      {
        name: "core/list",
        attributes: {},
        innerBlocks: [
          { name: "core/list-item", attributes: { content: "One" }, innerBlocks: [] },
          { name: "core/list-item", attributes: { content: "Two" }, innerBlocks: [] },
        ],
      },
    ];
    expect(blocksToPlainText(blocks)).toBe("One\nTwo");
  });

  test("returns empty string for no blocks", () => {
    expect(blocksToPlainText([])).toBe("");
  });
});

describe("plainTextToHtml", () => {
  test("converts paragraphs separated by blank lines", () => {
    expect(plainTextToHtml("One.\n\nTwo.")).toBe("<p>One.</p>\n<p>Two.</p>");
  });

  test("converts single newlines within a chunk to line breaks", () => {
    expect(plainTextToHtml("One.\nTwo.")).toBe("<p>One.<br>Two.</p>");
  });

  test("escapes HTML in the text", () => {
    expect(plainTextToHtml("a <b> & \"c\"")).toBe("<p>a &lt;b&gt; &amp; &quot;c&quot;</p>");
  });

  test("round-trips through blocksToPlainText shape", () => {
    const text = "First paragraph.\n\nA heading";
    const html = plainTextToHtml(text);
    expect(html).toBe("<p>First paragraph.</p>\n<p>A heading</p>");
  });
});

describe("ALLOWED_BLOCKS", () => {
  test("contains only text blocks", () => {
    expect(ALLOWED_BLOCKS).toEqual([
      "core/paragraph",
      "core/heading",
      "core/list",
      "core/list-item",
      "core/quote",
    ]);
  });
});
