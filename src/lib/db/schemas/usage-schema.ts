import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from './user.schema.js';

export const usageLimits = pgTable('usage_limits', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	plan: varchar('plan', { length: 32 })
		.$type<'free' | 'pro' | 'enterprise'>()
		.default('free')
		.notNull(),
	resumesAnalyzed: integer('resumes_analyzed').default(0).notNull(),
	aiActionsUsed: integer('ai_actions_used').default(0).notNull(),
	exportsGenerated: integer('exports_generated').default(0).notNull(),
	resetAt: timestamp('reset_at', { withTimezone: true }).notNull(), // mensal
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.$onUpdate(() => new Date())
		.notNull(),
});

export type UsageLimits = typeof usageLimits.$inferSelect;
