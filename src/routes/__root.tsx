import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  WEB_AWESOME_FOUCE_STYLE_URL,
  WEB_AWESOME_STYLE_URLS,
} from "@/design-system/font-awsome-web-awesome-171158/webawesome/cdn";
import { WEB_AWESOME_HTML_CLASSES } from "@/design-system/font-awsome-web-awesome-171158/webawesome/setup";
import themeCss from "@/design-system/font-awsome-web-awesome-171158/webawesome/theme.css?url";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "google-site-verification",
        content: "-aUQjbJ2xLjOuZQn15zcAKw4nnrN1bNLEUPzAMDV88E",
      },
    ],
    links: [
      ...WEB_AWESOME_STYLE_URLS.map((href) => ({ rel: "stylesheet", href })),
      { rel: "stylesheet", href: WEB_AWESOME_FOUCE_STYLE_URL },
      { rel: "stylesheet", href: themeCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={WEB_AWESOME_HTML_CLASSES}>
      <head>
        <HeadContent />
        <script defer src="https://umami-lite.view.fast/tracker.js" data-website-id="8e217b11-3fa3-43c1-b7f6-a3b3b44db66e"></script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Keep this root providers-only: canvas preview routes (/__mockup,
// /__component) render inside it, so any chrome leaks into every frame.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
