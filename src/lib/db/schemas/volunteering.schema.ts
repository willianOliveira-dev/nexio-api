import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';

export const volunteering = pgTable(
	'volunteering',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		resumeId: uuid('resume_id')
			.notNull()
			.references(() => resumes.id, { onDelete: 'cascade' }),
		role: varchar('role', { length: 255 }).notNull(),
		organization: varchar('organization', { length: 255 }).notNull(),
		startDate: varchar('start_date', { length: 64 }),
		endDate: varchar('end_date', { length: 64 }),
		description: text('description'),
		orderIndex: integer('order_index').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index('volunteering_resume_id_idx').on(t.resumeId)],
);

export type Volunteering = typeof volunteering.$inferSelect;
export type NewVolunteering = typeof volunteering.$inferInsert;
