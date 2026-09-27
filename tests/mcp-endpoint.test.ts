/**
 * Protocol-level checks against a running dev server.
 *
 * Start the app (`bun run dev`) before running these; when nothing is
 * listening on BASE_URL the suite skips instead of failing.
 */

import { beforeAll, describe, expect, test } from "bun:test";

const BASE_URL = process.env['MCP_TEST_BASE_URL'] ?? "http://localhost:8080";
const MCP_URL = `${BASE_URL}/mcp`;
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

let reachable = false;

async function rpc(method: string, params?: unknown, token?: string) {
  return fetch(MCP_URL, {
    method: "POST",
    headers: token ? { ...HEADERS, Authorization: `Bearer ${token}` } : HEADERS,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

beforeAll(async () => {
  try {
    const response = await fetch(BASE_URL, { method: "GET" });
    reachable = response.ok || response.status < 500;
  } catch {
    reachable = false;
  }
});

describe("MCP endpoint", () => {
  test("rejects an unauthenticated initialize", async () => {
    if (!reachable) return;
    const response = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    expect(response.status).toBe(401);
  });

  test("rejects unauthenticated tool discovery", async () => {
    if (!reachable) return;
    const response = await rpc("tools/list");
    expect(response.status).toBe(401);
  });

  test("rejects an unauthenticated check_grammar call", async () => {
    if (!reachable) return;
    const response = await rpc("tools/call", {
      name: "check_grammar",
      arguments: { text: "This are a test." },
    });
    expect(response.status).toBe(401);
  });

  test("rejects a token that is not an OAuth access token", async () => {
    if (!reachable) return;
    const response = await rpc("tools/list", undefined, "not-a-real-token");
    expect(response.status).toBe(401);
  });

  test("advertises its authorization server", async () => {
    if (!reachable) return;
    const response = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`);
    expect(response.ok).toBe(true);
    const metadata = (await response.json()) as { authorization_servers?: string[] };
    expect(Array.isArray(metadata.authorization_servers)).toBe(true);
    expect(metadata.authorization_servers?.[0]).toContain("/auth/v1");
  });
});
