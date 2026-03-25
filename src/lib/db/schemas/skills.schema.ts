import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';

export const skills = pgTable('skills', {
	id: uuid('id').primaryKey().defaultRandom(),
	resumeId: uuid('resume_id')
		.notNull()
		.references(() => resumes.id, { onDelete: 'cascade' }),
	category: varchar('category', { length: 128 }),
	name: varchar('name', { length: 128 }).notNull(),
});

export type Skills = typeof skills.$inferSelect;
