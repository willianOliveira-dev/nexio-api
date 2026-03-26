import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';

export const projects = pgTable(
	'projects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		resumeId: uuid('resume_id')
			.notNull()
			.references(() => resumes.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description').notNull(),
		keywords: jsonb('keywords').$type<string[]>().default([]),
		url: varchar('url', { length: 255 }),
		orderIndex: integer('order_index').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index('projects_resume_id_idx').on(t.resumeId)],
);

export type Projects = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
