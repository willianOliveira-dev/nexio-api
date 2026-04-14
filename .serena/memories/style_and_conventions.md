# Code Style & Guidelines

- **Language:** TypeScript 5.8
- **Formatting & Linting:** Uses Biome (`biome.json`). 
- **Type Safety:** Uses Zod for schema validation; strictly typed APIs with `@hono/zod-openapi`.
- **Modularity:** Domain-driven directories (`src/modules/*`).
- **AI Integration:** Uses Vercel AI sdk (`ai`) to interface with providers. No direct hallucination or implicit assumptions; strict prompt handling required.