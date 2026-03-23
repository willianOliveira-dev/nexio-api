import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env';

export default defineConfig({
    out: './drizzle/migrations',
    dialect: 'postgresql',
    schema: './src/lib/db/schemas/index.schema.ts',
    dbCredentials: {
        url: env.DATABASE_URL,
    },
});

