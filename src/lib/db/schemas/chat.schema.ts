import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { aiModels } from './ai-models.schema.js';
import { jobMatches } from './job-matches.schema.js';
import { resumes } from './resumes.schema.js';
import { user } from './user.schema.js';

export const chatSessions = pgTable(
	'chat_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		resumeId: uuid('resume_id').references(() => resumes.id, {
			onDelete: 'set null',
		}),
		jobMatchId: uuid('job_match_id').references(() => jobMatches.id, {
			onDelete: 'set null',
		}),
		aiModelId: uuid('ai_model_id').references(() => aiModels.id, {
			onDelete: 'set null',
		}),
		title: varchar('title', { length: 255 }),
		isBuilder: boolean('is_builder').default(false).notNull(),
		isActive: boolean('is_active').default(true).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index('chat_sessions_user_id_idx').on(t.userId)],
);

export type AttachmentMeta = {
	type: 'image' | 'document';
	url?: string | undefined;
	base64?: string | undefined;
	mimeType: string;
	name?: string | undefined;
};

export const messages = pgTable(
	'messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => chatSessions.id, { onDelete: 'cascade' }),
		role: varchar('role', { length: 16 }).$type<'user' | 'assistant'>().notNull(),
		content: text('content').notNull(),
		suggestion: jsonb('suggestion').$type<{
			section: string;
			original?: string;
			suggested: string;
		} | null>(),
		attachments: jsonb('attachments').$type<AttachmentMeta[] | null>().default(null),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => [index('messages_session_id_idx').on(t.sessionId)],
);

export type ChatSessions = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type Messages = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
