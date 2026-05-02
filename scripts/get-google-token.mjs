#!/usr/bin/env node
/**
 * One-shot OAuth to obtain GOOGLE_REFRESH_TOKEN for Calendar API.
 *
 * 1. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local (or export them).
 * 2. In Google Cloud Console → OAuth client → add redirect URI:
 *    http://127.0.0.1:3456/oauth/callback   (or your OAUTH_LOCAL_PORT)
 * 3. Run: node --env-file=.env.local scripts/get-google-token.mjs
 * 4. Copy printed refresh token into Vercel env as GOOGLE_REFRESH_TOKEN.
 */
import http from "node:http";
import { URL } from "node:url";
import process from "node:process";
import { OAuth2Client } from "google-auth-library";

const PORT = Number(process.env.OAUTH_LOCAL_PORT || 3456);
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT = `http://127.0.0.1:${PORT}/oauth/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  process.exit(1);
}

const oauth2 = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const scopes = ["https://www.googleapis.com/auth/calendar"];

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent",
});

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (u.pathname !== "/oauth/callback") {
    res.writeHead(404);
    res.end();
    return;
  }
  const code = u.searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing ?code=");
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<!doctype html><meta charset=utf-8><p>Hotovo — můžete zavřít tento tab.</p><p>Refresh token je v terminálu.</p>",
    );
    console.log("\n--- GOOGLE_REFRESH_TOKEN (paste into Vercel / .env.local) ---\n");
    if (tokens.refresh_token) {
      console.log(tokens.refresh_token);
    } else {
      console.log(
        "(Žádný refresh_token — v účtu Google odstraňte přístup aplikace Smartapky Booking a spusťte skript znovu s prompt=consent.)",
      );
    }
    console.log("\n");
    server.close(() => process.exit(0));
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Token exchange failed");
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\n1) Přidej redirect URI do Google Cloud klienta:\n   ", REDIRECT);
  console.log("\n2) Otevři v prohlížeči:\n\n   ", authUrl, "\n");
});
