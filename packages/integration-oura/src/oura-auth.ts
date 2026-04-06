import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";

const AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const REVOKE_URL = "https://api.ouraring.com/oauth/revoke";

const ALL_SCOPES = "email personal daily heartrate workout tag session spo2";

type OuraTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  obtained_at: number;
};

type OuraOAuthConfig = {
  clientId: string;
  clientSecret: string;
  tokenPath: string;
};

// ── Token persistence ───────────────────────────────────────────────────────

const loadTokens = (tokenPath: string): OuraTokens | null => {
  try {
    const data = fs.readFileSync(tokenPath, "utf-8");
    return JSON.parse(data) as OuraTokens;
  } catch {
    return null;
  }
};

const saveTokens = (tokenPath: string, tokens: OuraTokens): void => {
  const dir = path.dirname(tokenPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
};

// ── Token refresh ───────────────────────────────────────────────────────────

const isExpired = (tokens: OuraTokens): boolean => {
  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
  // Refresh 5 minutes before expiry
  return Date.now() > expiresAt - 5 * 60 * 1000;
};

const refreshTokens = async (config: OuraOAuthConfig, tokens: OuraTokens): Promise<OuraTokens> => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const newTokens: OuraTokens = {
    ...data,
    obtained_at: Date.now(),
  };

  saveTokens(config.tokenPath, newTokens);
  return newTokens;
};

// ── Get valid access token (auto-refresh) ───────────────────────────────────

const getAccessToken = async (config: OuraOAuthConfig): Promise<string> => {
  let tokens = loadTokens(config.tokenPath);

  if (!tokens) {
    throw new Error(
      `No tokens found at ${config.tokenPath}. Run "oura-health login" first.`,
    );
  }

  if (isExpired(tokens)) {
    console.log("Access token expired, refreshing...");
    tokens = await refreshTokens(config, tokens);
    console.log("Token refreshed successfully");
  }

  return tokens.access_token;
};

// ── OAuth2 login flow ───────────────────────────────────────────────────────

const exchangeCode = async (config: OuraOAuthConfig, code: string, redirectUri: string): Promise<OuraTokens> => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const tokens: OuraTokens = {
    ...data,
    obtained_at: Date.now(),
  };

  saveTokens(config.tokenPath, tokens);
  return tokens;
};

/**
 * Starts a local HTTP server, opens the browser for OAuth authorization,
 * and exchanges the callback code for tokens.
 */
const login = async (config: OuraOAuthConfig, port = 8787): Promise<void> => {
  const redirectUri = `http://localhost:${port}/callback`;

  const authUrl = `${AUTHORIZE_URL}?${new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: ALL_SCOPES,
    state: crypto.randomUUID(),
  }).toString()}`;

  console.log("\nOpen this URL in your browser to authorize:\n");
  console.log(`  ${authUrl}\n`);
  console.log("Waiting for callback...\n");

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        res.writeHead(400);
        res.end("Missing authorization code");
        reject(new Error("No authorization code in callback"));
        server.close();
        return;
      }

      try {
        await exchangeCode(config, code, redirectUri);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Authenticated!</h1><p>You can close this window.</p>");
        console.log(`Tokens saved to ${config.tokenPath}`);
        resolve();
      } catch (error) {
        res.writeHead(500);
        res.end("Token exchange failed");
        reject(error);
      } finally {
        server.close();
      }
    });

    server.listen(port, () => {
      console.log(`Callback server listening on port ${port}`);
    });
  });
};

export type { OuraTokens, OuraOAuthConfig };
export { getAccessToken, loadTokens, saveTokens, login };
