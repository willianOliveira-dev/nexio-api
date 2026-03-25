import { integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';

export const educations = pgTable('educations', {
	id: uuid('id').primaryKey().defaultRandom(),
	resumeId: uuid('resume_id')
		.notNull()
		.references(() => resumes.id, { onDelete: 'cascade' }),
	degree: varchar('degree', { length: 255 }).notNull(),
	institution: varchar('institution', { length: 255 }).notNull(),
	location: varchar('location', { length: 255 }),
	startDate: varchar('start_date', { length: 32 }),
	endDate: varchar('end_date', { length: 32 }),
	orderIndex: integer('order_index').notNull(),
});

export type Educations = typeof educations.$inferSelect;
