import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  SiteFooter,
  WaButton,
  WaIcon,
  WaPage,
  WebAwesomeLoader,
} from "@/design-system/font-awsome-web-awesome-171158";

const NAV_LINKS = [
  { to: "/editor", label: "Editor", icon: "pen-to-square" },
  { to: "/connect", label: "Connect AI client", icon: "plug" },
  { to: "/docs", label: "Documentation", icon: "book" },
  { to: "/privacy", label: "Privacy", icon: "shield-halved" },
  { to: "/terms", label: "Terms & attribution", icon: "scale-balanced" },
] as const;

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <WebAwesomeLoader />
      <WaPage className="wa-cloak">
        <header slot="header" className="app-band wa-split wa-align-items-center">
          <Link to="/" className="app-brand wa-cluster wa-gap-xs wa-align-items-center">
            <WaIcon name="feather-pointed" />
            <strong>Harper Grammar</strong>
          </Link>
          <nav className="wa-cluster wa-gap-2xs app-desktop-nav" aria-label="Quick links">
            <Link to="/editor">
              <WaButton appearance="plain" size="small">
                Editor
              </WaButton>
            </Link>
            <Link to="/connect">
              <WaButton variant="brand" size="small">
                Connect AI client
              </WaButton>
            </Link>
          </nav>
        </header>

        <nav slot="navigation" className="wa-stack wa-gap-2xs" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} data-drawer="close" className="app-nav-link">
              <WaIcon name={link.icon} /> {link.label}
            </Link>
          ))}
        </nav>

        <main>{children}</main>

        <div slot="footer">
          <SiteFooter madeBy="MikeDemo" licensesHref="/licenses" />
        </div>
      </WaPage>
    </>
  );
}
