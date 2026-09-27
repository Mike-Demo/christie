/**
 * Client-only Gutenberg block editor.
 *
 * This module is loaded lazily, only after hydration and only when the
 * user switches to block mode: the editor bundle is large and touches
 * `document` at import time, so it must never run during SSR.
 */
import { useCallback, useMemo } from "react";
import IsolatedBlockEditor from "@automattic/isolated-block-editor";
import "@automattic/isolated-block-editor/build-browser/core.css";
import "@automattic/isolated-block-editor/build-browser/isolated-block-editor.css";

import { ALLOWED_BLOCKS, plainTextToHtml, type EditorBlock } from "./text";

export interface BlockEditorProps {
  /** Plain text used to seed the editor on mount. */
  readonly initialText: string;
  /** Called whenever the block content changes. */
  readonly onBlocksChange: (blocks: EditorBlock[]) => void;
  readonly onError: () => void;
}

export default function BlockEditor({ initialText, onBlocksChange, onError }: BlockEditorProps) {
  const settings = useMemo(
    () => ({
      iso: {
        // Privacy: no persistence to localStorage, no API requests.
        preferencesKey: null,
        persistenceKey: null,
        allowApi: false,
        blocks: { allowBlocks: [...ALLOWED_BLOCKS], disallowBlocks: [] },
        toolbar: {
          inserter: false,
          inspector: false,
          navigation: false,
          undo: true,
          selectorTool: false,
          documentInspector: false,
        },
        moreMenu: false as const,
        sidebar: { inserter: false, inspector: false, customComponent: null },
        footer: false,
        linkMenu: [],
      },
      editor: {
        hasUploadPermissions: false,
        allowedMimeTypes: null,
        bodyPlaceholder: "Write or paste English text here…",
      },
    }),
    [],
  );

  const onLoad = useCallback(
    (parse: (html: string) => EditorBlock[]) => {
      const parsed = parse(plainTextToHtml(initialText));
      // onSaveBlocks only fires on edits, so report the seeded content now.
      onBlocksChange(parsed);
      return parsed;
    },
    [initialText, onBlocksChange],
  );

  const onSaveBlocks = useCallback(
    (blocks: EditorBlock[]) => {
      onBlocksChange(blocks);
    },
    [onBlocksChange],
  );

  return (
    <div className="app-block-editor">
      <IsolatedBlockEditor
        settings={settings}
        onLoad={onLoad}
        onSaveBlocks={onSaveBlocks}
        onSaveContent={() => undefined}
        onError={onError}
      />
    </div>
  );
}
