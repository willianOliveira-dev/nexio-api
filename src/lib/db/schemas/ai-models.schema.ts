import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const aiModels = pgTable('ai_models', {
	id: uuid('id').primaryKey().defaultRandom(),
	modelId: text('model_id').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	provider: text('provider').notNull(),
	contextWindow: integer('context_window').notNull(),
	isDefault: boolean('is_default').notNull().default(false),
	isActive: boolean('is_active').notNull().default(true),
	supportsVision: boolean('supports_vision').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AiModel = typeof aiModels.$inferSelect;
export type NewAiModel = typeof aiModels.$inferInsert;
