import { describe, expect, it } from "bun:test";

import {
  buildAuthorizeUrl,
  decodeFlowState,
  encodeFlowState,
  parseProfile,
  safeNext,
  statesMatch,
} from "../src/lib/auth/gravatar";
import { logEvent, setLogSink } from "../src/lib/grammar/log";

const STATE = "a".repeat(64);

describe("gravatar sign-in helpers", () => {
  it("rejects missing or mismatched state", () => {
    expect(statesMatch(STATE, null)).toBe(false);
    expect(statesMatch(STATE, "b".repeat(64))).toBe(false);
    expect(statesMatch(STATE, STATE)).toBe(true);
    expect(decodeFlowState(undefined)).toBeNull();
    expect(decodeFlowState("not-json")).toBeNull();
  });

  it("round-trips flow state and sanitises next", () => {
    const flow = decodeFlowState(encodeFlowState({ state: STATE, next: "//evil.com" }));
    expect(flow).toEqual({ state: STATE, next: "/connect" });
  });

  it("replaces unsafe next values", () => {
    expect(safeNext("https://evil.com")).toBe("/connect");
    expect(safeNext("/\\evil.com")).toBe("/connect");
    expect(safeNext("/.lovable/oauth/consent?authorization_id=x")).toBe(
      "/.lovable/oauth/consent?authorization_id=x",
    );
  });

  it("rejects unverified emails", () => {
    expect(parseProfile({ email: "a@b.com", email_verified: false })).toBeNull();
    expect(parseProfile({ email: "A@B.com", email_verified: true })?.email).toBe("a@b.com");
  });

  it("builds an authorize URL with state and callback", () => {
    const url = new URL(buildAuthorizeUrl("https://ceoowl.com", STATE));
    expect(url.searchParams.get("state")).toBe(STATE);
    expect(url.searchParams.get("redirect_uri")).toBe("https://ceoowl.com/api/public/gravatar/callback");
  });

  it("never logs tokens or emails", () => {
    const lines: string[] = [];
    setLogSink((l) => lines.push(l));
    logEvent({ event: "gravatar_signin_ok", ...({ email: "a@b.com", access_token: "secret" } as object) });
    setLogSink(null);
    expect(lines.join()).not.toContain("a@b.com");
    expect(lines.join()).not.toContain("secret");
  });
});
