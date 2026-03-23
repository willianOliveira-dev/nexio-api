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
import { user } from './user.schema.js';

export const jobMatches = pgTable(
    'job_matches',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        resumeId: uuid('resume_id')
            .notNull()
            .references(() => resumes.id, { onDelete: 'cascade' }),
        jobTitle: varchar('job_title', { length: 255 }),
        jobDescription: text('job_description').notNull(),
        matchScore: integer('match_score').notNull(), // 0–100
        foundKeywords: jsonb('found_keywords').$type<string[]>().default([]),
        missingKeywords: jsonb('missing_keywords')
            .$type<string[]>()
            .default([]),
        recommendations: jsonb('recommendations')
            .$type<
                {
                    title: string;
                    description: string;
                    difficulty: 'easy' | 'medium' | 'hard';
                }[]
            >()
            .default([]),
        createdAt: timestamp('created_at', { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [index('job_matches_user_id_idx').on(t.userId)],
);

export type JobMatches = typeof jobMatches.$inferSelect;
