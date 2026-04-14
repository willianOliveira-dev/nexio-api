# Nexio API Overview

Nexio API is the backend service for a resume optimization SaaS.
Tech Stack:
- Framework: Hono (Node Server)
- Language: TypeScript
- Database: PostgreSQL (Neon Serverless)
- ORM: Drizzle
- AI: Vercel AI SDK, OpenAI
- Auth: Better Auth

Key characteristics:
- Domain-driven structure in `src/modules` and `src/shared`.
- Code quality tools: Biome (linting/formatting), Vitest (testing), Husky, Commitlint.