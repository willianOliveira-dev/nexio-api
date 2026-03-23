import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';
import { resumeVersions } from './resume-versions.schema.js';

export const resumeScores = pgTable('resume_scores', {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }),
    resumeVersionId: uuid('resume_version_id').references(() => resumeVersions.id, { onDelete: 'cascade' }),
    overall: integer('overall').notNull(),
    impact: integer('impact').notNull(),
    atsScore: integer('ats_score').notNull(),
    keywords: integer('keywords').notNull(),
    clarity: integer('clarity').notNull(),
    strengths: jsonb('strengths').$type<string[]>().default([]),
    improvements: jsonb('improvements')
        .$type<
            {
                type: string;
                description: string;
                priority: 'low' | 'medium' | 'high';
            }[]
        >()
        .default([]),
    missingKeywords: jsonb('missing_keywords').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export type ResumeScores = typeof resumeScores.$inferSelect;