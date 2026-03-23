import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';

export const languages = pgTable('languages', {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
        .notNull()
        .references(() => resumes.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    proficiency: varchar('proficiency', { length: 64 }),
});


export type Languages = typeof languages.$inferSelect;