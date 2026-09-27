# Gutenberg-powered editor (isolated-block-editor)

Add Automattic's isolated-block-editor (Gutenberg) to the Editor page as an optional mode, keeping the current plain-text editor as the default. Grammar checking stays Harper-only, in-browser, with no text leaving the device.

## User decisions

- **Scope:** both editors on `/editor`, switchable with a toggle; plain text remains the default.
- **Blocks:** text blocks only — paragraph, heading, lists, quote.
- **Suggestions:** applied to the extracted plain text; blocks are rebuilt from the corrected text (block formatting is not preserved across auto-apply — the page says so).

## Steps

1. **Compatibility spike (first, before any UI work).** Install `@automattic/isolated-block-editor` (2.30.x, Gutenberg 20.6) and its `@wordpress/*` peer set. Confirm it installs and builds under React 19 and Vite 8. If peer conflicts block install, resolve with the minimal override; if the editor cannot run under React 19 at all, stop and report before going further.

2. **Client-only block editor module.** New `src/lib/block-editor/` module, dynamically imported only after hydration and only when the user switches to block mode (the Gutenberg bundle is large and touches `document` at import time — never SSR, never in the initial chunk). Load the editor's CSS with it.

3. **Text extraction and rebuild helpers.** Serialize blocks to plain text for Harper (paragraph-per-block, blank line between blocks) and rebuild a block list from corrected text. Round-trip tests for both directions.

4. **Editor page toggle.** A Plain text / Block editor switch on `/editor`. Block mode shows the Gutenberg editor (allowList: paragraph, heading, list, list-item, quote; no media, no embeds). The character counter, limit badge, Check grammar, Apply all safe suggestions, Clear, and findings panel work identically in both modes — they operate on the extracted text. Applying suggestions in block mode rebuilds blocks from the corrected text, with a visible note that formatting resets to paragraphs/headings.

5. **Privacy and limits preserved.** The check still runs entirely in the browser via harper.js; block content is held in memory only, never stored, logged, or sent anywhere. The existing character limit applies to the extracted text.

6. **Attribution and licenses.** Add isolated-block-editor and Gutenberg (GPL-2.0, Automattic/WordPress contributors) to `/licenses`. Strengthen the existing independence line: the site uses Automattic software but is not endorsed by or affiliated with Automattic.

7. **Verify and document.** Build clean, all existing tests pass, new round-trip tests pass, and the block mode is exercised in the preview (type text, check grammar, apply a suggestion, toggle back). README updated with the new editor mode.

## Technical notes

- isolated-block-editor 2.30.0 targets Gutenberg 20.6 and a React 18-era stack; React 19 compatibility is the main risk and is why step 1 comes first.
- Gutenberg ships its own styling inside the block editor canvas. That is the library's own component skin (like the design system's), not a parallel design language for the site; the surrounding page keeps Web Awesome.
- The block editor chunk loads on demand only, so the plain-text experience and page weight are unchanged for default users.
