---
name: openrouter-model-selection
description: >
  Use this skill when the user wants to migrate an AI provider (e.g., Groq) to OpenRouter
  with support for user-selectable models, maintaining the same code architecture and quality.
  Trigger when the user mentions: switching AI providers, adding model selection, supporting
  multiple LLMs, giving users a model picker, free model tiers, or OpenRouter integration.
  Always use this skill when the codebase uses @ai-sdk/* providers and the user wants to
  add model selection or switch to OpenRouter. Also triggers when models need to be
  persisted in the database rather than hardcoded.
---

# OpenRouter Migration + User Model Selection Skill

You are helping migrate an existing AI provider (e.g., Groq via `@ai-sdk/groq`) to
**OpenRouter** with user-selectable free models persisted in the database, using the
**Vercel AI SDK** (`ai` package).

## Critical Rules

- **Maintain the same architecture level** as the existing project: same patterns, same
  abstractions, same naming conventions, same error handling style.
- **Use Context7** to fetch up-to-date docs for `ai` (Vercel AI SDK), `@ai-sdk/openai`,
  and `drizzle-orm` before writing any code.
- **Models are persisted in the database** — never use a hardcoded Map or constant as the
  source of truth at runtime. The DB is the single source of truth.
- **A seed script** populates the models table on first deploy.
- **Only expose free models** on OpenRouter unless the user explicitly says otherwise.
- **Do not rewrite unrelated logic** — only touch what's needed for provider + model selection.

---

## Step 1 — Fetch Current Docs via Context7

Before writing any code, resolve and query the relevant libraries:

```
1. Resolve "ai" (Vercel AI SDK) → Context7 library ID → query: OpenRouter provider, streamText
2. Resolve "@ai-sdk/openai" → Context7 library ID → query: createOpenAI, baseURL
3. Resolve "drizzle-orm" → Context7 library ID → query: insert, select, schema definition
```

Confirm the current API surface from docs. Do NOT rely on training knowledge — APIs change.

---

## Step 2 — Understand the Existing Code

Analyze the files the user shared. Identify:

- Where the provider is instantiated (e.g., `createGroq(...)`)
- Where the model string is hardcoded (e.g., `'llama-3.3-70b-versatile'`)
- Where `streamText` / `generateText` is called — typically inside a `*Service.ts`
- The ORM in use (likely Drizzle based on the project) and where schemas live
- Existing schema patterns: column types, naming conventions (`camelCase` vs `snake_case`)
- How the existing session table is defined — `modelId` should be added there

---

## Step 3 — Plan the Changes

Present the user with the minimal set of files to touch:

1. **New DB schema** — `ai-models.schema.ts` following existing schema conventions
2. **Migration** — add `model_id` column to `chat_sessions` table
3. **Seed script** — `seed-ai-models.ts` to insert free models on deploy
4. **Provider file** — `openrouter.provider.ts` with the configured client
5. **Repository** — add `findAllActiveModels()` and update `createSession` to persist `modelId`
6. **Service** — read `modelId` from session row; pass to `streamText`
7. **Controller** — forward `modelId` from request
8. **DTO** — accept `modelId` as optional string (validated against DB, not enum)
9. **Route** — `GET /ai-chat/models` returns rows from DB

Keep changes surgical — do not refactor unrelated code.

---

## Step 4 — Implementation

### 4.1 DB Schema — `ai-models.schema.ts`

Follow the exact column definition style from existing schemas. Example:

```typescript
// src/lib/db/schemas/ai-models.schema.ts
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const aiModels = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: text('model_id').notNull().unique(),   // e.g. 'meta-llama/llama-4-maverick:free'
  name: text('name').notNull(),                   // e.g. 'Llama 4 Maverick'
  provider: text('provider').notNull(),           // e.g. 'Meta'
  contextWindow: integer('context_window').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AiModel = typeof aiModels.$inferSelect;
export type NewAiModel = typeof aiModels.$inferInsert;
```

Export this type from `index.schema.ts` following existing barrel pattern.

### 4.2 Session Schema Update

Add `modelId` to the `chat_sessions` table (nullable for backwards compatibility):

```typescript
// In chat-sessions schema — add one column:
modelId: uuid('model_id').references(() => aiModels.id),
```

Generate and run the migration after schema changes.

### 4.3 Seed Script — `seed-ai-models.ts`

**These are the current best free models on OpenRouter (April 2026), curated for
chat/reasoning/instruction-following tasks — ideal for a resume AI assistant:**

```typescript
// src/lib/db/seeds/seed-ai-models.ts
import { db } from '@/lib/db/connection.js';
import * as schema from '@/lib/db/schemas/index.schema.js';

const FREE_MODELS_SEED = [
  {
    // Best overall free model — GPT-4 class, tool-calling, 128K context
    modelId: 'meta-llama/llama-4-maverick:free',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    contextWindow: 128000,
    isDefault: true,
    isActive: true,
  },
  {
    // Best free reasoning model — strong at analysis and structured output
    modelId: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    contextWindow: 163840,
    isDefault: false,
    isActive: true,
  },
  {
    // Best free general-purpose — reliable tool calling, 131K context
    modelId: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B',
    provider: 'Google',
    contextWindow: 131072,
    isDefault: false,
    isActive: true,
  },
  {
    // Fastest free option — good for simpler queries, lower latency
    modelId: 'mistralai/mistral-small-3.1-24b-instruct:free',
    name: 'Mistral Small 3.1 24B',
    provider: 'Mistral',
    contextWindow: 131072,
    isDefault: false,
    isActive: true,
  },
  {
    // Strong at instruction following and multilingual (pt-BR friendly)
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    contextWindow: 128000,
    isDefault: false,
    isActive: true,
  },
] as const;

export async function seedAiModels(): Promise<void> {
  await db
    .insert(schema.aiModels)
    .values(FREE_MODELS_SEED)
    .onConflictDoNothing();             // idempotent — safe to re-run
  console.log('AI models seeded.');
}
```

Call `seedAiModels()` from your existing seed entrypoint or on app startup once.

> **Model curation rationale for this project:**
> The project is a resume AI assistant (chat + ATS scoring) in pt-BR. The models above
> were selected because they: (1) support tool calling reliably, (2) handle long prompts
> with resume + job description context, (3) perform well on instruction following in
> Portuguese, (4) are confirmed stable on OpenRouter's free tier as of April 2026.
> DeepSeek R1 is especially strong for analytical/scoring tasks. Llama 4 Maverick is the
> recommended default — it matches GPT-4 quality and is the most reliable for agents.

### 4.4 Provider File

```typescript
// src/lib/ai/openrouter.provider.ts
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/config/env.js';

export const openRouterProvider = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': env.APP_URL,   // shows your app in OpenRouter dashboard
    'X-Title': env.APP_NAME,
  },
});
```

Add `OPENROUTER_API_KEY`, `APP_URL`, `APP_NAME` to env config following existing pattern.

### 4.5 Repository Changes

Add to `AiChatRepository` (or equivalent), following the existing method style:

```typescript
async findAllActiveModels(): Promise<AiModels[]> {
  return db
    .select()
    .from(schema.aiModels)
    .where(eq(schema.aiModels.isActive, true))
    .orderBy(desc(schema.aiModels.isDefault), asc(schema.aiModels.name));
}

async findModelByModelId(modelId: string): Promise<AiModels | null> {
  const [model] = await db
    .select()
    .from(schema.aiModels)
    .where(and(eq(schema.aiModels.modelId, modelId), eq(schema.aiModels.isActive, true)));
  return model ?? null;
}

async findDefaultModel(): Promise<AiModels | null> {
  const [model] = await db
    .select()
    .from(schema.aiModels)
    .where(and(eq(schema.aiModels.isDefault, true), eq(schema.aiModels.isActive, true)))
    .limit(1);
  return model ?? null;
}
```

Update `createSession` to also receive and persist `aiModelId` (the PK UUID, not the
string modelId) when provided.

### 4.6 Service Changes

In `createSession`: resolve the model from DB and store its PK on the session.

In `sendMessageStream`: read `session.aiModelId`, load the model row, use `model.modelId`
(the OpenRouter string) to call the provider:

```typescript
// Replace the hardcoded provider block:
const modelRow = session.aiModelId
  ? await this.aiChatRepository.findModelById(session.aiModelId)
  : await this.aiChatRepository.findDefaultModel();

if (!modelRow) throw new NotFoundError('AI Model');

const result = streamText({
  model: openRouterProvider(modelRow.modelId),   // e.g. 'meta-llama/llama-4-maverick:free'
  system: systemPrompt,
  temperature: 0.6,
  maxOutputTokens: 2048,
  messages: chatMessages,
  onFinish: async (event) => { /* existing logic unchanged */ },
});
```

### 4.7 DTO — `create-session.dto.ts`

Add `modelId` as optional string. Validate against DB in the service, not with Zod enum
(avoids coupling DTO to DB state):

```typescript
modelId: z.string().optional(),   // OpenRouter model string, e.g. 'deepseek/deepseek-r1:free'
```

In `createSession` service method, if `modelId` provided:
```typescript
const modelRow = await this.aiChatRepository.findModelByModelId(data.modelId);
if (!modelRow) throw new BadRequestError('Modelo de IA inválido ou indisponível.');
```

### 4.8 Models Endpoint

Add to routes file following existing `openapi` + `createRoute` pattern:

```typescript
// GET /ai-chat/models — public or authenticated, match project convention
// Returns: { data: AiModel[] }
// Controller delegates to service.listModels()
// Service calls repository.findAllActiveModels()
```

---

## Step 5 — Environment Variables

```
OPENROUTER_API_KEY=sk-or-...
APP_URL=https://yourapp.com
APP_NAME=Nexio
```

Keep or remove `GROQ_API_KEY` depending on whether Groq is still used elsewhere.

---

## Step 6 — Checklist Before Presenting Code

- [ ] Context7 docs fetched for `ai`, `@ai-sdk/openai`, `drizzle-orm`
- [ ] Schema follows exact column/type conventions of existing schemas
- [ ] Seed is idempotent (`onConflictDoNothing`)
- [ ] `modelId` on session references the DB PK (UUID), not the OpenRouter string
- [ ] Service resolves model from DB — never from a hardcoded constant at runtime
- [ ] `findDefaultModel()` used as fallback so nothing breaks for existing sessions
- [ ] No unrelated code changed
- [ ] Same error handling style (`NotFoundError`, `BadRequestError`, etc.)
- [ ] Same import style (path aliases, `.js` extensions for ESM)
- [ ] TypeScript types are explicit (no `any`)
- [ ] New schema exported from `index.schema.ts` barrel

---

## Notes on OpenRouter Free Tier (April 2026)

- Free model IDs end with `:free` — paid variants are the same ID without the suffix
- Rate limits without credits: **50 req/day, 20 req/min** (shared across all free models)
- With a $10 top-up: **1,000 req/day, 20 req/min** — inform the user of this
- `@ai-sdk/openai` with custom `baseURL` is the correct approach — there is no official
  `@ai-sdk/openrouter` package; OpenRouter is OpenAI-compatible
- Models may be removed from the free tier — `isActive` flag allows soft-disabling a
  model in the DB without a code deploy
- The `openrouter/auto` model ID auto-routes to the best available free model — useful
  as an emergency fallback but don't expose it to users as a named option