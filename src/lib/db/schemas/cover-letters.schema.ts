import {
    index,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { user } from './user.schema.js';

import { resumes } from './resumes.schema.js';
import { jobMatches } from './job-matches.schema.js';

export const coverLetters = pgTable(
    'cover_letters',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        baseResumeId: uuid('base_resume_id')
            .references(() => resumes.id, { onDelete: 'set null' }),
        jobMatchId: uuid('job_match_id')
            .references(() => jobMatches.id, { onDelete: 'set null' }),
        title: varchar('title', { length: 255 }).notNull(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (t) => [
        index('cover_letters_user_id_idx').on(t.userId),
        index('cover_letters_job_match_idx').on(t.jobMatchId)
    ]
);

export type CoverLetters = typeof coverLetters.$inferSelect