# ✂️ Snip

A production-grade link shortener with real-time analytics. Built to demonstrate full stack engineering and AI-augmented development workflows using Claude Code.

---

## Architecture

Short link redirects run in **Next.js middleware** at the edge — before any route handler is matched. Redis is checked first on every request. Click analytics are recorded via **QStash message queue** after the redirect is sent, so analytics writes never affect redirect latency.

```
Browser clicks short link
         |
         v
middleware.ts  (edge, runs before any route)
         |
         |-- 1. Check Upstash Redis: "linkcache:{slug}"
         |         HIT  --> redirect immediately, no DB query
         |         MISS --> query MySQL, populate cache, redirect
         |
         └-- 2. ev.waitUntil(recordClick())   non-blocking
                          |
                          v
                 QStash message queue
                          |
                          v
                 POST /api/analytics/ingest
                          |
                          v
                 Parse UA + headers
                 Write Click row to MySQL
```

**Key decisions:**

- Redirects live in `middleware.ts` not a route handler — runs at the edge before Next.js routing
- Cache stores `{ url, password, expiresAt }` not just the URL — middleware needs all three to make decisions without a DB query
- Click recording uses `ev.waitUntil()` — fires after the redirect response is sent, never blocks the user
- QStash handles retries if the ingest endpoint is temporarily unavailable

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js 14 App Router | Middleware for redirects, RSC for dashboard |
| Language | TypeScript | Strict mode throughout |
| Database | MySQL via PlanetScale | Links, clicks, API keys |
| ORM | Prisma | Type-safe queries, migrations |
| Cache | Upstash Redis | Redirect cache, sliding window rate limiting |
| Queue | Upstash QStash | Async click event delivery with retries |
| Styling | Tailwind CSS | Dark theme |
| Charts | Recharts | Analytics dashboard visualizations |
| Validation | Zod | All API route inputs |
| Deployment | Vercel | Edge middleware, serverless functions |

---

## Features

- **Link shortening** with custom slugs, password protection, and expiry dates
- **Redis-first redirect engine** — cached redirects never hit the database
- **Async analytics pipeline** — QStash queue decouples click recording from redirect latency
- **Click analytics** — country, device, browser, referrer tracked per click
- **30-day analytics dashboard** — line chart, top countries, top devices, top referrers
- **API key authentication** — SHA-256 hashed, plain key shown once and never stored
- **Sliding window rate limiting** — 100 req/min on redirects, 60 req/min on API routes
- **QStash signature verification** — ingest endpoint rejects any unsigned request

---

## Built With Claude Code

This project was built using **Claude Code** (VS Code extension) as the primary implementation tool, with Claude Chat for architecture planning and decisions.

The `.claude/` directory contains the full AI workflow setup:

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project memory — loaded at the start of every Claude Code session |
| `.claude/agents/code-reviewer.md` | Custom agent that checks for cache bugs and API consistency |
| `.claude/agents/api-designer.md` | Custom agent that enforces response format rules |
| `.claude/commands/check-cache.md` | Slash command for cache invalidation checklist |
| `.claude/commands/add-api-route.md` | Slash command for scaffolding new API routes |
| `.claude/commands/commit.md` | Slash command for generating conventional commits |

---

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm — `npm install -g pnpm`
- MySQL running locally
- Upstash account (free tier) for Redis and QStash

### 1. Clone and install dependencies

```bash
git clone https://github.com/YOUR_USERNAME/snip.git
cd snip
pnpm install
```

### 2. Create the local database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE snip;
exit;
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in all values — see the Environment Variables section below.

### 4. Run database migrations

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### 5. Create your first API key

Start the dev server first:

```bash
pnpm dev
```

In a separate terminal:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "local"}'
```

Copy the returned `key` value and add it to `.env` as `SNIP_API_KEY=snip_...`

Then restart `pnpm dev` to pick up the new variable.

### 6. Open the app

```
http://localhost:3000
```

---

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | Your local MySQL or PlanetScale |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Upstash dashboard → Redis → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Upstash dashboard → Redis → REST API |
| `QSTASH_TOKEN` | QStash publish token | Upstash dashboard → QStash |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash signature verification key | Upstash dashboard → QStash |
| `QSTASH_NEXT_SIGNING_KEY` | QStash signature rotation key | Upstash dashboard → QStash |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | `http://localhost:3000` in dev, your Vercel URL in prod |
| `SNIP_API_KEY` | API key used by the homepage form | Generated via `POST /api/keys` |

---

## API Reference

### Create a short link

```
POST /api/links
Authorization: Bearer snip_xxx
Content-Type: application/json
```

Request body:

```json
{
  "url": "https://example.com/very/long/url",
  "slug": "my-link",
  "password": "secret123",
  "expiresAt": "2025-12-31T00:00:00.000Z"
}
```

Only `url` is required. All other fields are optional.

Response `201`:

```json
{
  "id": "clx1234...",
  "slug": "my-link",
  "url": "https://example.com/very/long/url",
  "shortLink": "https://snip.vercel.app/my-link",
  "expiresAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Error responses always follow this shape:

```json
{
  "error": {
    "code": "slug_conflict",
    "message": "This slug is already taken"
  }
}
```

---

### Get all links

```
GET /api/links
```

Response `200` — array of link objects each with `totalClicks` count.

---

### Get link analytics

```
GET /api/links/:slug/analytics
```

Response `200`:

```json
{
  "totalClicks": 42,
  "clicksByDay": [
    { "date": "Jan 1", "count": 5 },
    { "date": "Jan 2", "count": 0 }
  ],
  "topCountries": [
    { "country": "US", "count": 20 }
  ],
  "topReferrers": [
    { "referrer": "google.com", "count": 15 }
  ],
  "deviceBreakdown": [
    { "device": "desktop", "count": 30 },
    { "device": "mobile", "count": 12 }
  ]
}
```

`clicksByDay` always contains exactly 30 entries — days with no clicks are included with `count: 0` so the line chart renders correctly.

---

### Create an API key

```
POST /api/keys
Content-Type: application/json
```

Request body:

```json
{ "name": "my-key" }
```

Response `201`:

```json
{
  "key": "snip_abc123...",
  "name": "my-key",
  "warning": "Store this key safely. It will not be shown again."
}
```

The plain key is shown exactly once and never stored. Only the SHA-256 hash is saved in the database.

---

## Running the Code Review Agent

This project includes a custom Claude Code agent that knows the codebase specifically. To run it, open Claude Code in VS Code and type:

```
Invoke the code-reviewer agent on snip/app/api/ and snip/lib/
```

The agent checks five categories:
1. Cache invalidation — every DB delete must call `linkCache.delete(slug)`
2. Route handler architecture — no business logic in `app/api/`, only in `lib/`
3. Error response format — all errors must be `{ error: { code, message } }`
4. Zod validation — every POST route must validate with `safeParse` before processing
5. Middleware correctness — all async post-response work must use `ev.waitUntil()`

---

## Architecture Decisions

**Why middleware for redirects, not a route handler?**
Next.js middleware runs at the edge before any page or API route is matched. This is the earliest possible interception point. The open source Dub project uses the same approach — `middleware.ts` dispatching to `lib/middleware/link.ts`.

**Why cache an object instead of just the URL?**
The redirect middleware needs to check password protection and link expiry on every request. If the cache only stored the URL, every redirect would need a DB query to check those fields. Caching `{ url, password, expiresAt }` means the complete redirect decision happens from Redis alone on a cache hit.

**Why QStash instead of writing analytics inline?**
Writing to MySQL inside the redirect path adds 10-50ms of latency on every redirect. QStash decouples the redirect from the analytics write — the user gets their redirect immediately, the click is written to the database asynchronously. Production equivalent: AWS SQS.

**Why SHA-256 for API keys?**
SHA-256 is a one-way hash — you cannot reverse it to get the original key. When a request arrives with `Authorization: Bearer snip_xxx`, we hash the incoming key and compare the hash to what is stored. Even a full database breach does not expose usable API keys.

---