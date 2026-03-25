import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { jobMatches } from './job-matches.schema.js';
import type { ResumeContent } from './resumes.schema.js';
import { resumes } from './resumes.schema.js';

export const resumeVersions = pgTable(
	'resume_versions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		originalResumeId: uuid('original_resume_id')
			.notNull()
			.references(() => resumes.id, { onDelete: 'cascade' }),
		jobMatchId: uuid('job_match_id').references(() => jobMatches.id, {
			onDelete: 'set null',
		}),
		title: varchar('title', { length: 255 }).notNull(),
		content: jsonb('content').$type<ResumeContent>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index('resume_versions_original_resume_idx').on(t.originalResumeId),
		index('resume_versions_job_match_idx').on(t.jobMatchId),
	],
);

export type ResumeVersions = typeof resumeVersions.$inferSelect;
