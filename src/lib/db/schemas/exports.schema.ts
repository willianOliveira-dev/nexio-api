import {
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from 'drizzle-orm/pg-core';
import { resumes } from './resumes.schema.js';
import { user } from './user.schema.js';
import { resumeVersions } from './resume-versions.schema.js';
import { coverLetters } from './cover-letters.schema.js';

export const exportFormatEnum = pgEnum('export_format', [
    'pdf',
    'docx',
    'plain_text',
]);
export const exportLanguageEnum = pgEnum('export_language', ['pt', 'en']);
export const jobStatusEnum = pgEnum('job_status', [
    'pending',
    'running',
    'completed',
    'failed',
]);

export const exportDocumentTypeEnum = pgEnum('export_document_type', [
    'resume',
    'resume_version',
    'cover_letter',
]);

export const exports = pgTable(
    'exports',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),

        documentType: exportDocumentTypeEnum('document_type').notNull(),

        resumeId: uuid('resume_id').references(() => resumes.id, {
            onDelete: 'cascade',
        }),

        resumeVersionId: uuid('resume_version_id').references(
            () => resumeVersions.id,
            { onDelete: 'cascade' },
        ),

        coverLetterId: uuid('cover_letter_id').references(
            () => coverLetters.id,
            { onDelete: 'cascade' },
        ),

        format: exportFormatEnum('format').notNull(),
        language: exportLanguageEnum('language').default('pt').notNull(),
        storageKey: text('storage_key'),
        shareToken: text('share_token').unique(),
        shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),
        status: jobStatusEnum('status').default('pending').notNull(),

        createdAt: timestamp('created_at', { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [index('exports_user_id_idx').on(t.userId)],
);

export type Exports = typeof exports.$inferSelect;