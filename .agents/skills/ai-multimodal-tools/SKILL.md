---
name: ai-multimodal-tools
description: >
  Use this skill when the user wants to add web search and/or file/image upload capabilities
  to an existing AI chat feature that already uses the Vercel AI SDK and OpenRouter.
  Trigger when the user mentions: web search in chat, searching the internet from AI,
  sending images to AI, uploading documents to AI, multimodal input, vision models,
  PDF upload to chat, or attaching files to messages. Always use this skill alongside
  the openrouter-model-selection skill — this skill extends the architecture established
  there. Requires the existing sendMessageStream / AiChatService pattern already in place.
---

# AI Multimodal Tools — Web Search + Vision/Document Upload

You are adding two capabilities to an existing AI chat service that already uses the
Vercel AI SDK with OpenRouter:

1. **Web search** — via Tavily API as an AI SDK tool, called by the model on demand
2. **File/image upload** — images and PDFs sent as multimodal content parts in the message

## Critical Rules

- **Maintain the same architecture level** as the existing project: same patterns, same
  abstractions, same naming conventions, same error handling style. Read the existing
  service, repository, controller, and route files before writing anything.
- **Use Context7** to fetch up-to-date docs for `ai` (Vercel AI SDK) before writing code.
  The SDK evolves fast — confirm the current `tool`, `streamText`, and message content
  part APIs before assuming anything.
- **Do not rewrite unrelated logic** — only touch what's needed for these two features.
- Web search is a **model-invoked tool** — the model decides when to search, the developer
  does not call Tavily directly in the service logic.
- File uploads are **content parts** in the user message — not separate endpoints.
- Both features are **opt-in per message** — existing sessions without them work unchanged.

---

## Step 1 — Fetch Current Docs via Context7

Before writing any code:

```
1. Resolve "ai" (Vercel AI SDK) → Context7 library ID
   Query: "tool calling streamText", "image content parts", "file content parts"
2. Resolve "tavily" or "@tavily/sdk" → Context7 library ID (if available)
   Query: "search API response format", "TypeScript client"
```

Confirm the exact import paths and function signatures. The AI SDK content part API
for images and files changes between minor versions — do not assume from memory.

---

## Step 2 — Understand the Existing Code

Before writing anything, identify in the user's codebase:

- The `sendMessageStream` method signature and how `content: string` arrives today
- How `chatMessages` is built before being passed to `streamText`
- The DTO (`SendMessageDTO`) — this will need `attachments` added
- The DB `messages` schema — the `content` column type (text vs jsonb)
- The existing `onFinish` handler — it saves `event.text`; with tools this needs care
- How `createMessage` persists messages — it receives `content: string` today

---

## Step 3 — Plan the Changes

Present the user with the exact files to touch:

1. **New env vars** — `TAVILY_API_KEY`
2. **New file** — `src/lib/ai/tools/web-search.tool.ts`
3. **DB migration** — change `messages.content` to support jsonb OR keep text and
   serialize attachment metadata separately (see tradeoff note below)
4. **DTO update** — `send-message.dto.ts` adds `attachments` array
5. **Service update** — `sendMessageStream` builds multimodal content parts + passes tools
6. **Controller update** — forward `attachments` from payload
7. **Route update** — update OpenAPI response description (no schema change needed)
8. **`onFinish` fix** — save the cleaned text; tool call results are separate log entries

**Tradeoff note on DB schema for attachments:**
The simplest approach that avoids a migration is storing attachment metadata (url, type,
name) as a JSON field alongside the text content. If the existing `messages` schema has
a `suggestion` jsonb column already (as seen in the project), follow the same pattern and
add an `attachments` jsonb column. Do NOT change `content` from text — keep it as the
clean text string the assistant returned.

---

## Step 4 — Implementation

### 4.1 Web Search Tool — `src/lib/ai/tools/web-search.tool.ts`

**Why Tavily:** Built specifically for AI agents. Returns structured, LLM-ready JSON
(title, url, content, score). Free tier: 1,000 searches/month. No extra parsing needed.
Agent Score 8.6/10 in 2026 benchmarks. The model decides when to invoke it — it is not
called on every message.

```typescript
// src/lib/ai/tools/web-search.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { env } from '@/config/env.js';

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

type TavilyResponse = {
  results: TavilyResult[];
  answer?: string;
};

export const webSearchTool = tool({
  description:
    'Search the web for current information, salary data, job market trends, ' +
    'company details, or any topic that requires up-to-date knowledge. ' +
    'Use this when the user asks about something you may not have current data on.',
  parameters: z.object({
    query: z.string().describe('The search query to look up on the web'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(3)
      .describe('Number of results to return (1-5)'),
  }),
  execute: async ({ query, maxResults }): Promise<string> => {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'basic',       // 'advanced' is slower, counts same quota
        include_answer: true,        // synthesized answer helps the model
        include_raw_content: false,  // keep tokens low
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.status}`);
    }

    const data = (await response.json()) as TavilyResponse;

    // Return structured text — the model reads this as tool result
    const resultsText = data.results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`,
      )
      .join('\n\n');

    return data.answer
      ? `Summary: ${data.answer}\n\nSources:\n${resultsText}`
      : resultsText;
  },
});
```

Add `TAVILY_API_KEY` to env config following the existing pattern.

### 4.2 DTO Update — `send-message.dto.ts`

Add `attachments` as optional array. Each attachment is a URL (stored in object storage
or sent as base64 depending on the project's file handling):

```typescript
export const attachmentSchema = z.object({
  type: z.enum(['image', 'document']),
  url: z.string().url().optional(),        // for remote URLs
  base64: z.string().optional(),           // for inline base64
  mimeType: z.string(),                    // e.g. 'image/jpeg', 'application/pdf'
  name: z.string().optional(),             // original filename
});

// In sendMessageBodySchema:
attachments: z.array(attachmentSchema).max(5).optional(),
```

### 4.3 Service Update — `sendMessageStream`

The key change is building a **content parts array** instead of a plain string, and
passing `tools` to `streamText`.

```typescript
// In sendMessageStream — replace the chatMessages mapping and streamText call:

import { webSearchTool } from '@/lib/ai/tools/web-search.tool.js';
import type { CoreMessage, ImagePart, FilePart, TextPart } from 'ai';

// Build multimodal content for the current user message
const userContentParts: (TextPart | ImagePart | FilePart)[] = [
  { type: 'text', text: content },
];

if (attachments?.length) {
  for (const att of attachments) {
    if (att.type === 'image') {
      userContentParts.push({
        type: 'image',
        image: att.base64
          ? att.base64                          // base64 string
          : new URL(att.url!),                  // or URL
        mimeType: att.mimeType as ImagePart['mimeType'],
      });
    } else if (att.type === 'document') {
      userContentParts.push({
        type: 'file',
        data: att.base64
          ? att.base64
          : new URL(att.url!),
        mimeType: att.mimeType as FilePart['mimeType'],
      });
    }
  }
}

// Rebuild chat history — history messages stay as strings; only current has parts
const chatMessages: CoreMessage[] = [
  ...history.slice(0, -1).map((m) => ({     // all history except the just-saved user msg
    role: m.role as 'user' | 'assistant',
    content: m.content,
  })),
  {
    role: 'user' as const,
    content: userContentParts,               // current message with parts
  },
];

const result = streamText({
  model: openRouterProvider(modelRow.modelId),
  system: systemPrompt,
  temperature: 0.6,
  maxOutputTokens: 2048,
  messages: chatMessages,
  tools: { webSearch: webSearchTool },
  maxSteps: 3,           // allow model to search then respond in one stream
  onFinish: async (event) => {
    // event.text is the final text after all tool steps complete
    const durationMs = Date.now() - startTime;
    if (!event.text) return;

    const suggestion = this.parseSuggestion(event.text);
    const cleanContent = this.cleanContent(event.text);

    await this.aiChatRepository.createMessage({
      sessionId,
      role: 'assistant',
      content: cleanContent,
      suggestion,
    });

    // Log tool usage if web search was invoked
    const usedWebSearch = event.toolCalls?.some(
      (tc) => tc.toolName === 'webSearch',
    ) ?? false;

    await this.aiChatRepository.createAiAction({
      userId,
      sessionId,
      resumeId: session.resumeId,
      type: suggestion
        ? 'rewrite_section'
        : usedWebSearch
          ? 'web_search'
          : 'improve_section',
      status: 'completed',
      inputTokens: event.usage.inputTokens ?? 0,
      outputTokens: event.usage.outputTokens ?? 0,
      durationMs,
    });

    await this.usersRepository.incrementCreditsUsed(userId);
  },
});
```

**Important:** Update the `aiActions` type enum in the DB schema to include `'web_search'`
if it uses a Postgres enum. If it's a plain `text` column, no migration needed.

### 4.4 Persist Attachments in Messages

Add `attachments` jsonb column to the `messages` table (same pattern as `suggestion`):

```typescript
// In messages schema — add one column:
attachments: jsonb('attachments').$type<AttachmentMeta[] | null>().default(null),

// AttachmentMeta (no base64 — don't store raw bytes in DB):
type AttachmentMeta = {
  type: 'image' | 'document';
  url?: string;
  mimeType: string;
  name?: string;
};
```

In `createMessage`, pass `attachments: attachmentsMeta ?? null` (strip base64 before
persisting — only store the reference URL or metadata).

### 4.5 Vision-Capable Models

Not all OpenRouter free models support vision. Update the `ai_models` seed/table to
include a `supportsVision` boolean column:

```typescript
// In ai-models schema:
supportsVision: boolean('supports_vision').notNull().default(false),

// Update seed — mark vision-capable models:
// meta-llama/llama-4-maverick:free  → supportsVision: true
// google/gemma-3-27b-it:free        → supportsVision: true
// deepseek/deepseek-r1:free         → supportsVision: false (text-only)
// mistralai/mistral-small-3.1-24b-instruct:free → supportsVision: true
// meta-llama/llama-3.3-70b-instruct:free        → supportsVision: false
```

In the service, if attachments contain images and the selected model does not support
vision, throw a `BadRequestError('O modelo selecionado não suporta envio de imagens.')`.

---

## Step 5 — System Prompt Update

Add a short section to `buildAiChatSystemPrompt` instructing the model when to search:

```
## Ferramenta de Busca Web
Você tem acesso à ferramenta webSearch. Use-a quando o usuário perguntar sobre:
- Salários e faixas salariais para uma função ou área
- Tendências do mercado de trabalho
- Informações sobre uma empresa específica
- Qualquer dado que possa ter mudado recentemente
Cite as fontes ao apresentar informações buscadas na web.
```

---

## Step 6 — Environment Variables

```
TAVILY_API_KEY=tvly-...
```

Get a free key at: https://tavily.com — 1,000 searches/month, no credit card required.

---

## Step 7 — Checklist Before Presenting Code

- [ ] Context7 docs fetched — confirmed `tool`, content part types, `maxSteps` API
- [ ] `webSearchTool` uses `fetch` only (no extra SDK dependency for Tavily)
- [ ] Base64 is NOT persisted in DB — only metadata/URL stored in `attachments` column
- [ ] `supportsVision` checked before accepting image attachments
- [ ] `maxSteps: 3` set in `streamText` to allow tool call + response in one stream
- [ ] `onFinish` uses `event.text` (final text after all steps) — not `event.rawText`
- [ ] `aiActions` type covers `'web_search'` — no DB type error
- [ ] Existing sessions without attachments/tools work unchanged (all new params optional)
- [ ] Same error handling style (`BadRequestError`, `NotFoundError`, etc.)
- [ ] Same import style (path aliases, `.js` extensions for ESM)
- [ ] TypeScript types explicit — no `any`

---

## Notes

**Why Tavily over Brave:** Brave removed its free tier in early 2026 (now $5 credit).
Tavily has 1,000 free searches/month, is purpose-built for AI agents, and returns
structured LLM-ready JSON. Agent Score 8.6/10 vs Brave's 7.1/10 in 2026 benchmarks.

**Why tool over direct call:** Having the model invoke the search means it only searches
when contextually needed — not on every message. This preserves the Tavily quota and
keeps latency low for messages that don't need current data.

**`maxSteps: 3` explained:** With `maxSteps`, one stream can do: (1) model decides to
search → (2) tool executes → (3) model reads results and generates final response. The
client receives a single continuous stream. Without `maxSteps`, the stream would stop
after the tool call and the client would need to handle a mid-stream pause.

**PDF support:** OpenRouter passes PDFs as `file` content parts. Llama 4 Maverick and
Mistral Small 3.1 handle PDF text extraction natively. For models that don't support
it, the content part is silently ignored — add a `supportsDocuments` flag following the
same `supportsVision` pattern if the project needs strict validation.