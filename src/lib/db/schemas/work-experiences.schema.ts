import { boolean, integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { resumes } from "./resumes.schema.js";

export const workExperiences = pgTable('work_experiences', {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
        .notNull()
        .references(() => resumes.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    company: varchar('company', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    startDate: varchar('start_date', { length: 32 }),
    endDate: varchar('end_date', { length: 32 }),
    isCurrent: boolean('is_current').default(false),
    description: text('description'),
    orderIndex: integer('order_index').notNull(), 
});

export type WorkExperiences = typeof workExperiences.$inferSelect;