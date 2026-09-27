# Continue with Gravatar sign-in

Add a "Continue with Gravatar" button to the sign-in page, next to Google and email. Visitors approve on Gravatar (WordPress.com), come back to CEO Owl signed in, and return to wherever they were going, including the AI-client consent screen.

## How it works

```text
Sign-in page -> /api/public/gravatar/start -> Gravatar approval
  -> /api/public/gravatar/callback (verify, look up verified email)
  -> matching CEO Owl account found or created
  -> one-time sign-in link used immediately -> /auth/callback -> original page
```

- Gravatar only tells us a verified email address, display name and avatar. Nothing about writing is shared.
- If an account with that email already exists (Google or email), Gravatar signs into the same account.
- Gravatar tokens are used once to read the profile, then discarded. They are never stored or logged.

## What you will need to do

1. In your Gravatar app settings (Client ID 149161), set the redirect URL to `https://ceoowl.com/api/public/gravatar/callback` (plus the preview URL for testing).
2. Paste the Client Secret into the secure form I will open. It never goes into code or chat.

## Steps

1. Request the secret `GRAVATAR_CLIENT_SECRET`; store Client ID 149161 as a config value.
2. Start route: creates a random `state` value and a PKCE-style check, saves them in a short-lived secure cookie along with the sanitised destination, then redirects to Gravatar's authorize URL.
3. Callback route: checks `state` against the cookie, exchanges the code for a token server-side, reads the user's verified email and profile, rejects unverified emails.
4. Account linking: with the privileged server client (loaded only inside the handler), find or create the user by email, then generate a one-time magic-link token and send the browser to `/auth/callback`, which completes sign-in with it and continues to the saved destination.
5. Sign-in page: add a "Continue with Gravatar" button (Web Awesome outlined button, user icon) that preserves `next`, so the AI-client consent flow still returns correctly.
6. Error handling: cancelled or failed approval returns to the sign-in page with a friendly message.
7. Credits and privacy: add Gravatar to the licenses/credits and the privacy page (what is received, that nothing is stored beyond the account email), keeping the "not endorsed by or affiliated with Automattic" line.
8. Tests: bad/missing `state` rejected, unverified email rejected, unsafe `next` values replaced with `/connect`, no tokens or emails written to logs.

## Risks

- This is a hand-built sign-in path, not one of the platform's managed providers, so it carries more upkeep than Google sign-in. Rollback: remove the button and the two routes; existing accounts keep working with Google or email.
- Gravatar's exact endpoints and scopes will be confirmed against their docs during step 3; if they require WordPress.com app review for production, I will tell you.

## Technical details

- Routes: `src/routes/api/public/gravatar.start.ts`, `src/routes/api/public/gravatar.callback.ts`; helper `src/lib/auth/gravatar.server.ts`.
- Token exchange at `https://public-api.wordpress.com/oauth2/token`, profile from `/rest/v1.1/me` (email + `email_verified`).
- Sign-in via `supabaseAdmin.auth.admin.generateLink({ type: "magiclink" })`; `/auth/callback` calls `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })` before redirecting.
- Cookie: HttpOnly, Secure, SameSite=Lax, 10-minute expiry, cleared on callback.
