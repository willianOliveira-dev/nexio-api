import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	API_VERSION: z.string(),
	DATABASE_URL: z.string(),
	PORT: z.coerce.number().default(8000),
	BASE_URL: z.string().default('http://localhost:8000'),

	ALLOWED_ORIGINS: z
		.string()
		.default('http://localhost:3000')
		.transform((val) => val.split(',').map((origin) => origin.trim())),

	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.string(),

	GROQ_API_KEY: z.string(),

	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),

	LINKEDIN_CLIENT_ID: z.string(),
	LINKEDIN_CLIENT_SECRET: z.string(),

	R2_ACCOUNT_ID: z.string(),
	R2_ACCESS_KEY_ID: z.string(),
	R2_SECRET_ACCESS_KEY: z.string(),
	R2_BUCKET_NAME: z.string(),
	R2_ENDPOINT: z.string(),
	FRONTEND_URL: z.string(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
