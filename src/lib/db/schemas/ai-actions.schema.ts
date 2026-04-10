import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { chatSessions } from './chat.schema.js';
import { resumes } from './resumes.schema.js';
import { user } from './user.schema.js';

export const aiActionTypeEnum = pgEnum('ai_action_type', [
	'analyze_resume',
	'score_resume',
	'match_job',
	'improve_section',
	'generate_export',
	'suggest_keywords',
	'rewrite_section',
	'web_search',
]);

export const aiActionStatusEnum = pgEnum('ai_action_status', [
	'pending',
	'running',
	'completed',
	'failed',
]);

export const aiActions = pgTable(
	'ai_actions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		sessionId: uuid('session_id').references(() => chatSessions.id, {
			onDelete: 'set null',
		}),
		resumeId: uuid('resume_id').references(() => resumes.id, {
			onDelete: 'set null',
		}),
		type: aiActionTypeEnum('type').notNull(),
		status: aiActionStatusEnum('status').default('pending').notNull(),
		input: jsonb('input').$type<Record<string, unknown>>(),
		output: jsonb('output').$type<Record<string, unknown>>(),
		inputTokens: integer('input_tokens'),
		outputTokens: integer('output_tokens'),
		errorMessage: text('error_message'),
		durationMs: integer('duration_ms'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => [
		index('ai_actions_user_id_idx').on(t.userId),
		index('ai_actions_session_id_idx').on(t.sessionId),
	],
);

export type AiAction = typeof aiActions.$inferSelect;

export type NewAiAction = typeof aiActions.$inferInsert;
