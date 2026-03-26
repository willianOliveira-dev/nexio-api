import {
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { user } from './user.schema.js';

export const resumeStatusEnum = pgEnum('resume_status', [
	'pending',
	'processing',
	'analyzed',
	'failed',
]);

export type ResumeContent = {
	contact: {
		fullName: string;
		email: string;
		phone?: string;
		location?: string;
		website?: string;
		socials?: { network: string; url: string }[];
	};
	professionalSummary?: string;
	workExperience?: {
		title: string;
		company: string;
		location?: string;
		isCurrent: boolean;
		startDate?: string;
		endDate?: string;
		bullets: string[];
	}[];
	education?: {
		degree: string;
		institution: string;
		location?: string;
		isCurrent?: boolean;
		startDate?: string;
		endDate?: string;
		gpa?: string;
	}[];
	skills?: {
		category: string;
		items: string[];
	}[];
	languages?: {
		language: string;
		proficiency: string;
	}[];
	certifications?: {
		name: string;
		issuer: string;
		issueDate?: string;
		expirationDate?: string;
		url?: string;
	}[];
	projects?: {
		name: string;
		description: string;
		keywords?: string[];
		url?: string;
	}[];
	volunteering?: {
		role: string;
		organization: string;
		startDate?: string;
		endDate?: string;
		description?: string;
	}[];
};

export const resumes = pgTable(
	'resumes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		fileName: varchar('file_name', { length: 255 }).notNull(),
		storageKey: text('storage_key').notNull(),
		mimeType: varchar('mime_type', { length: 64 }).notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		status: resumeStatusEnum('status').default('pending').notNull(),
		rawText: text('raw_text'),
		fullName: varchar('full_name', { length: 255 }),
		email: varchar('email', { length: 255 }),
		phone: varchar('phone', { length: 50 }),
		location: varchar('location', { length: 255 }),
		website: varchar('website', { length: 255 }),
		professionalSummary: text('professional_summary'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index('resumes_user_id_idx').on(t.userId)],
);

export type Resumes = typeof resumes.$inferSelect;

export type NewResume = typeof resumes.$inferInsert;
