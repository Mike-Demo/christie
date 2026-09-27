import path from "path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

export default defineConfig(({ command, mode }) => {
  // Cloudflare Workers plugin only on build (produces the worker output);
  // the workerd runtime isn't available for the dev server.
  const useCloudflare = command === "build";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      // harper.js references its ~16 MB .wasm via `new URL(..., import.meta.url)`,
      // which makes Vite copy it into every bundle. The app loads the binary from
      // a hosted asset URL instead, so strip those references.
      {
        name: "strip-harper-wasm-urls",
        enforce: "pre" as const,
        transform(code: string, id: string) {
          if (!id.includes("node_modules/harper.js/dist/")) return null;
          const out = code.replace(
            /new URL\("harper_wasm(?:_slim)?_bg\.wasm", import\.meta\.url\)\.href/g,
            '"about:blank"',
          );
          return out === code ? null : { code: out, map: null };
        },
      },
      mockupPreviewPlugin({ designSystemPolling: true }),
      mcpPlugin(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...(useCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
      tanstackStart(),
      viteReact(),
      ...(mode === "development" ? [componentTagger()] : []),
    ],
  };
});
