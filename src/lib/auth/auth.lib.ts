import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';
import { localization } from 'better-auth-localization';
import { env } from '@/config/env.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import { db } from '../db/connection.js';

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: env.ALLOWED_ORIGINS,
	advanced: {
		disableOriginCheck: env.NODE_ENV !== 'production',
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
		linkedin: {
			clientId: env.LINKEDIN_CLIENT_ID,
			clientSecret: env.LINKEDIN_CLIENT_SECRET,
		},
	},
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: schema,
	}),

	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db.insert(schema.userProfiles).values({
						userId: user.id,
						plan: 'free',
						aiCreditsUsed: 0,
					});
				},
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
	},

	plugins: [openAPI(), localization({ defaultLocale: 'pt-BR' })],
});
