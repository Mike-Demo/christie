/** Pure helpers for the Gravatar (WordPress.com) sign-in flow. No I/O here. */

export const GRAVATAR_CLIENT_ID = "149161";
export const GRAVATAR_AUTHORIZE_URL = "https://public-api.wordpress.com/oauth2/authorize";
export const GRAVATAR_TOKEN_URL = "https://public-api.wordpress.com/oauth2/token";
export const GRAVATAR_ME_URL = "https://public-api.wordpress.com/rest/v1.1/me";
export const GRAVATAR_COOKIE = "gravatar_oauth";
export const GRAVATAR_COOKIE_MAX_AGE_S = 600;

export interface GravatarFlowState {
  state: string;
  next: string;
}

export interface GravatarProfile {
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

/** Only same-origin relative paths are allowed as a destination. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/connect";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/connect";
  return value;
}

export function callbackUrl(origin: string): string {
  return `${origin}/api/public/gravatar/callback`;
}

export function buildAuthorizeUrl(origin: string, state: string): string {
  const url = new URL(GRAVATAR_AUTHORIZE_URL);
  url.searchParams.set("client_id", GRAVATAR_CLIENT_ID);
  url.searchParams.set("redirect_uri", callbackUrl(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "auth");
  url.searchParams.set("state", state);
  return url.toString();
}

export function encodeFlowState(flow: GravatarFlowState): string {
  return encodeURIComponent(JSON.stringify(flow));
}

export function decodeFlowState(raw: string | undefined): GravatarFlowState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { state, next } = parsed as Record<string, unknown>;
    if (typeof state !== "string" || state.length < 32) return null;
    return { state, next: safeNext(next) };
  } catch {
    return null;
  }
}

/** Constant-time string comparison for the state check. */
export function statesMatch(expected: string, received: string | null): boolean {
  if (!received || expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return diff === 0;
}

/** Accepts only a WordPress.com /me response with a verified email. */
export function parseProfile(body: unknown): GravatarProfile | null {
  if (typeof body !== "object" || body === null) return null;
  const me = body as Record<string, unknown>;
  const email = me["email"];
  if (typeof email !== "string" || !email.includes("@")) return null;
  if (me["email_verified"] !== true) return null;
  const displayName = typeof me["display_name"] === "string" ? me["display_name"] : undefined;
  const avatarUrl = typeof me["avatar_URL"] === "string" ? me["avatar_URL"] : undefined;
  return {
    email: email.toLowerCase(),
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

export function authErrorRedirect(origin: string, next: string): string {
  return `${origin}/auth?next=${encodeURIComponent(next)}&error=gravatar`;
}
