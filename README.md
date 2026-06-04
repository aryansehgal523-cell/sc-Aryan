# Spur Chat — Northwind Goods Support

A production-quality mini AI customer-support live-chat app. Users chat in a web widget; the backend persists the conversation, calls Anthropic Claude, and returns grounded support-agent replies.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env — fill in DATABASE_URL, DIRECT_URL, and ANTHROPIC_API_KEY

# 3. Run the database migration
npm run db:migrate
# When prompted for a migration name, type: init

# 4. Start both processes (two terminals)
npm run dev:server   # → http://localhost:3001
npm run dev:web      # → http://localhost:5173
```

Open **http://localhost:5173** — the chat widget should load immediately.

---

## Environment variables

All server config lives in `apps/server/.env`. A full template is at `apps/server/.env.example`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Postgres connection string. For Supabase transaction pooler (port 6543), append `?pgbouncer=true` to disable prepared statements. |
| `DIRECT_URL` | ✅ | — | Direct / session-pooler URL (port 5432). Used by Prisma Migrate — bypasses PgBouncer. |
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic API key from [console.anthropic.com](https://console.anthropic.com/). |
| `PORT` | | `3001` | HTTP port the server listens on. |
| `CORS_ORIGIN` | | `http://localhost:5173` | Allowed browser origin. Set to your Vercel URL in production. |
| `LLM_MODEL` | | `claude-haiku-4-5-20251001` | Anthropic model ID. Swap to `claude-sonnet-4-6` for higher quality replies. |
| `MAX_HISTORY_MESSAGES` | | `12` | Number of prior messages sent to the LLM per request (token budget). |
| `LLM_MAX_TOKENS` | | `1024` | Max tokens the LLM may generate per reply. |
| `LLM_TIMEOUT_MS` | | `30000` | Milliseconds before an LLM call is aborted and retried. |

---

## Architecture

```
spur-chat/
├── apps/
│   ├── server/          Node.js + Fastify + Prisma
│   └── web/             React + Vite + TailwindCSS
└── packages/
    └── shared/          Shared TypeScript types (API contracts, enums)
```

### Backend layers

```
routes/          HTTP only — parse input with Zod, call service, format response. No business logic.
services/        chat.service.ts — orchestrates the full send-message flow.
repositories/    conversation.repo.ts, message.repo.ts — the only code that touches Prisma.
llm/             provider.interface.ts + anthropic.provider.ts + prompt.ts
lib/             env.ts, errors.ts, response.ts, logger.ts
db/              Prisma client singleton
```

**Why this layering matters:** routes never touch the DB; services never touch HTTP primitives; the LLM is behind an interface so swapping providers (e.g. OpenAI) requires changing exactly one file.

### Frontend layers

```
store/           chat.reducer.ts (state shape + transitions) + chat.context.tsx (provider + actions)
components/      Chat · ChatHeader · MessageList · MessageBubble · ChatInput · TypingIndicator · ErrorBoundary
api/             client.ts — typed fetch wrapper that imports shared response types
```

**State management:** React context + `useReducer`. All state transitions are pure functions in the reducer — easy to read, test, and reason about. No prop drilling anywhere.

---

## Database schema

```prisma
model Conversation {
  id        String    @id @default(cuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  channel   String    @default("web_chat")   // extensibility seam
  messages  Message[]
}

enum Sender { USER  AI }   // AGENT reserved for human-handoff

model Message {
  id             String       @id @default(cuid())
  conversationId String
  sender         Sender
  text           String
  createdAt      DateTime     @default(now())
  @@index([conversationId, createdAt])
}
```

The `channel` field and the `Sender.AGENT` slot are **deliberate extensibility seams**: adding WhatsApp or a human-handoff flow is a schema-migration + new channel handler, not a redesign.

---

## API reference

All responses use a consistent envelope:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### `POST /api/v1/chat/message`

Send a message and receive an AI reply.

**Body**
```json
{ "message": "What is your return policy?", "sessionId": "clxxx..." }
```

- `message`: 1–4000 characters. Trimmed server-side.
- `sessionId`: optional. If omitted or unknown, a new conversation is created.

**Response `200`**
```json
{
  "ok": true,
  "data": {
    "sessionId": "clxxx...",
    "userMessage": { "id": "...", "sender": "USER", "text": "...", "createdAt": "..." },
    "aiMessage":   { "id": "...", "sender": "AI",   "text": "...", "createdAt": "..." }
  }
}
```

### `GET /api/v1/chat/:sessionId/messages`

Fetch full conversation history for a session (used on page reload).

**Response `200`**
```json
{ "ok": true, "data": { "sessionId": "clxxx...", "messages": [ ... ] } }
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Empty message, >4000 chars, malformed JSON, missing field |
| `NOT_FOUND` | 404 | Unknown `sessionId` on history fetch |
| `LLM_UNAVAILABLE` | 502 | Claude timed out or returned an error after one retry |
| `INTERNAL` | 500 | Unexpected server error (safe message only — no internal details leaked) |

---

## LLM integration

### Provider abstraction

`llm/provider.interface.ts` defines a two-method contract:

```ts
interface LLMProvider {
  generateReply(history: LLMMessage[], userMessage: string): Promise<string>;
}
```

`AnthropicProvider` implements it. To swap to OpenAI, implement the interface in `llm/openai.provider.ts` and change one line in `ChatService`'s constructor. Nothing else changes.

### System prompt & grounding

The system prompt (`llm/prompt.ts`) does three things:

1. **Persona** — defines Nora as a friendly, concise support agent.
2. **Knowledge base** — embeds a structured FAQ (shipping, returns, refunds, support hours) as the sole source of truth.
3. **Anti-hallucination rules** — the model is explicitly instructed to answer *only* from the knowledge base, use hedged language ("typically", "usually"), and escalate to human support rather than invent a policy.

### Timeout & retry

Each LLM call uses an `AbortController` with a `LLM_TIMEOUT_MS` deadline. On failure, the error is classified:

- **Transient** (`APIConnectionError`, `RateLimitError`, `InternalServerError`, `AbortError`) → one retry.
- **Permanent** (`AuthenticationError`, `BadRequestError`) → fail immediately.

The user's message is **persisted to the DB before the LLM call**, so it is never lost even if Claude is down.

### Model choice

`claude-haiku-4-5-20251001` is the default — it is fast (~1–2s), cheap, and more than capable for FAQ-grounded support replies. Swap to `claude-sonnet-4-6` via the `LLM_MODEL` env var for higher quality at higher cost.

---

## Robustness

| Scenario | Handling |
|---|---|
| Empty / whitespace message | Zod `.trim().min(1)` → 400 |
| Message > 4000 chars | Zod `.max(4000)` → 400, also blocked client-side |
| Malformed JSON body | Fastify body-parse error → 400 envelope |
| Unknown `sessionId` (POST) | New conversation created silently |
| Unknown `sessionId` (GET) | 404 NOT_FOUND |
| Invalid CUID format (Prisma would throw) | `findById` catches and returns `null` |
| LLM timeout / transient error | One retry, then `LLM_UNAVAILABLE` (502); user message preserved in DB |
| Invalid API key | Permanent error — no retry, `LLM_UNAVAILABLE` (502) |
| DB / Prisma error | Centralized handler → 500 with safe message; full error logged server-side only |
| Rapid double-send | Send button disabled while `status === 'sending'` |
| Page refresh | `sessionId` in `localStorage` → history rehydrated from API |

---

## Trade-offs & if I had more time

**What I left out intentionally**

- **Auth** — not in scope. A real deployment would add a session token (cookie or JWT) so a user can't fetch another user's history.
- **Streaming** — Claude supports token-by-token streaming. This would make replies feel much more responsive (first token in ~300ms vs. waiting for the full reply). The Anthropic SDK's `stream()` method and Fastify's `reply.raw` would handle it; the main complexity is managing the optimistic message on the client while tokens arrive.
- **React Markdown** — the current `renderMarkdown` handles `**bold**` and line breaks. `react-markdown` (with `remark-gfm`) would render tables, code blocks, and lists properly — worth adding if the system prompt ever outputs richer content.
- **Rate limiting** — per-IP rate limiting on the chat endpoint (e.g. `@fastify/rate-limit`) would prevent abuse in production.
- **Message search / pagination** — `GET /messages` returns the full history. For long conversations this needs cursor-based pagination.

**If I had more time**

- **Streaming responses** — highest UX impact.
- **Human-handoff flow** — the `Sender.AGENT` enum slot and `channel` field are already in the schema. Adding a `POST /chat/:sessionId/escalate` that marks the conversation and notifies a support queue would complete the extensibility story.
- **Seed script** — a `prisma/seed.ts` with sample conversations would make onboarding faster.
- **Integration tests** — a test that spins up Fastify with a stub `LLMProvider` and a test Postgres database would cover the full request → service → repo → response path with confidence.
- **CI** — GitHub Actions: `tsc --noEmit` + tests on every PR.

---

## Deployment

### Frontend → Vercel

```bash
# From the repo root
npx vercel --cwd apps/web

# Set the following env var in the Vercel dashboard:
VITE_API_URL=https://your-server.railway.app
```

Vercel auto-detects Vite. Set `VITE_API_URL` to your backend URL so the API client points at the right server instead of the Vite proxy.

### Backend + Postgres → Railway

1. Create a new Railway project, add a **PostgreSQL** service.
2. Add a new service from this repo, set **Root Directory** to `apps/server`.
3. Set environment variables:
   ```
   DATABASE_URL=<Railway Postgres connection string>?pgbouncer=true
   DIRECT_URL=<Railway Postgres connection string>
   ANTHROPIC_API_KEY=sk-ant-...
   CORS_ORIGIN=https://your-app.vercel.app
   NODE_ENV=production
   ```
4. Set the **Start Command** to:
   ```
   npx prisma migrate deploy && node dist/index.js
   ```
5. Set the **Build Command** to:
   ```
   npm install && npm run db:generate && npm run build --workspace=apps/server
   ```

> **Note on `?pgbouncer=true`:** Railway's Postgres uses PgBouncer in transaction mode by default. The same flag that fixes the Supabase issue applies here.

### Render alternative

Same as Railway but use the **Web Service** type. Set the build command and start command identically.
