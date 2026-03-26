import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';

export const certifications = pgTable(
	'certifications',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		resumeId: uuid('resume_id')
			.notNull()
			.references(() => resumes.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(),
		issuer: varchar('issuer', { length: 255 }).notNull(),
		issueDate: varchar('issue_date', { length: 64 }),
		expirationDate: varchar('expiration_date', { length: 64 }),
		url: varchar('url', { length: 255 }),
		orderIndex: integer('order_index').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index('certifications_resume_id_idx').on(t.resumeId)],
);

export type Certifications = typeof certifications.$inferSelect;
export type NewCertification = typeof certifications.$inferInsert;
