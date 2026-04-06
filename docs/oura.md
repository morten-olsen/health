# Oura Ring Integration

## Overview

Pulls health data from the Oura Ring API and pushes it to the Health API. Supports both pull-based sync (for backfill and local testing) and a webhook server (for real-time updates).

The integration is a standalone process — it communicates with the core API exclusively over HTTP.

## Setup

1. Create an Oura developer application at https://cloud.ouraring.com/
2. Note your **Client ID** and **Client Secret**
3. Authenticate:

```bash
export OURA_CLIENT_ID=your_client_id
export OURA_CLIENT_SECRET=your_client_secret
oura-health login
```

This opens your browser for OAuth2 authorization. Tokens are saved to `~/.config/oura-health/tokens.json` and auto-refresh when expired.

Alternatively, set `OURA_ACCESS_TOKEN` directly to skip OAuth (useful for quick testing).

## CLI Usage

```bash
# During development
pnpm --filter @morten-olsen/health-integration-oura cli -- <command> [options]

# After build
oura-health <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `login` | Authenticate with Oura via OAuth2 (opens browser) |
| `status` | Show current authentication status |
| `sync` | Pull data from Oura and push to Health API (default) |
| `server` | Start webhook server with initial sync on startup |
| `help` | Show usage information |

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--from <date>` | 7 days ago | Start date (YYYY-MM-DD) |
| `--to <date>` | today | End date (YYYY-MM-DD) |
| `--api-url <url>` | `http://localhost:3007` | Health API URL |
| `--port <port>` | `3008` | Webhook server port (server mode) |
| `--host <host>` | `0.0.0.0` | Webhook server host (server mode) |
| `--token-path <path>` | `~/.config/oura-health/tokens.json` | Token storage location |

All flags fall back to environment variables, then defaults.

### Examples

```bash
# Sync last 7 days
oura-health sync

# Backfill from a specific date
oura-health sync --from 2024-01-01

# Backfill a specific range
oura-health sync --from 2024-01-01 --to 2024-06-30

# Start webhook listener
oura-health server

# Webhook on custom port, pointing at remote API
oura-health server --port 9000 --api-url https://health.example.com
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OURA_CLIENT_ID` | Yes | OAuth2 client ID from https://cloud.ouraring.com/ |
| `OURA_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `HEALTH_API_URL` | No | Health API URL (default: `http://localhost:3007`) |
| `SYNC_START_DATE` | No | Fallback start date for sync (default: 7 days ago) |
| `WEBHOOK_PORT` | No | Fallback port for server mode (default: `3008`) |
| `WEBHOOK_HOST` | No | Fallback host for server mode (default: `0.0.0.0`) |

The integration reads `.env` files via dotenv.

## Authentication

OAuth2 is the only supported auth method. Tokens are stored at `~/.config/oura-health/tokens.json` (configurable via `--token-path`) and auto-refresh when expired.

### CLI Login

```bash
oura-health login
```

Opens a browser for Oura OAuth2 authorization. A temporary local server on port 8787 receives the callback.

### Server Login (deployed)

When running in server mode, visit `http://<host>:<port>/login` in a browser. The server provides a web-based OAuth flow at:

- `GET /login` — shows auth status and login link
- `GET /login/start` — redirects to Oura OAuth
- `GET /login/callback` — receives the OAuth callback and saves tokens

This allows setting up authentication on a deployed instance without CLI access.

### Token Status

```bash
oura-health status
```

## Modes

### Pull Mode (`sync`)

Fetches data for the given date range from the Oura API, maps it to canonical health metrics, and POSTs it to the Health API. Then exits. Requires prior authentication via `oura-health login`.

Safe to re-run — all ingest is idempotent via upserts.

### Server Mode (`server`)

1. Attempts an initial pull sync (skipped if not yet authenticated)
2. Starts a Fastify HTTP server with:
   - `/login` — web-based OAuth setup
   - `/webhooks/oura` — Oura webhook receiver
   - `/health` — health check with auth status
3. On each webhook event, fetches the relevant data from Oura and forwards to the Health API

#### Webhook Setup

Register the webhook URL with Oura at https://cloud.ouraring.com/ pointing to:

```
https://<your-host>:<port>/webhooks/oura
```

The server handles Oura's verification handshake automatically.

## Data Mapping

### Oura API → Health Metrics

| Oura Endpoint | Metric Slug(s) | Type |
|---------------|----------------|------|
| `heartrate` | `heart_rate` | metric |
| `sleep` | `resting_heart_rate`, `hrv`, `respiratory_rate`, `sleep_duration`, `sleep_stages` | metrics + session |
| `daily_sleep` | `sleep_score` | metric |
| `daily_activity` | `steps`, `active_calories` | metrics |
| `daily_readiness` | `body_temperature` (deviation) | metric |
| `daily_spo2` | `spo2` | metric |
| `workout` | — | session |

All raw API responses are also stored via `POST /ingest/raw` for future reprocessing.

## Type Safety

The Oura API client is generated from the official OpenAPI spec:

- `oura-openapi.json` — Oura's OpenAPI 3.0 spec (vendored)
- `src/oura-api.d.ts` — Generated TypeScript types

To regenerate types after updating the spec:

```bash
pnpm --filter @morten-olsen/health-integration-oura generate-types
```

## Architecture

```
Oura API ──► oura-client.ts (openapi-fetch, typed)
                │
                ▼
          oura-mapper.ts (Oura models → canonical contracts)
                │
                ▼
        health-api-client.ts (POST to Health API)
                │
                ▼
          Health API ──► TimescaleDB
```

Both `oura-sync.ts` (pull) and `oura-webhook.ts` (push) use the same mapper and health API client — the only difference is the trigger.
