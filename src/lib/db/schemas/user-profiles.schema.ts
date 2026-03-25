import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

import { user } from './user.schema.js';

export const userProfiles = pgTable('user_profiles', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	currentRole: varchar('current_role', { length: 255 }),
	targetRole: varchar('target_role', { length: 255 }),
	experienceLevel: varchar('experience_level', { length: 32 }).$type<
		'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive'
	>(),
	industry: varchar('industry', { length: 255 }),
	skills: jsonb('skills').$type<string[]>().default([]),
	socialLinks: jsonb('social_links').$type<{ plataform: string; url: string }[]>().default([]),
	preferredLanguage: varchar('preferred_language', { length: 8 })
		.$type<'pt' | 'en'>()
		.default('pt')
		.notNull(),
	targetCountry: varchar('target_country', { length: 64 }),
	workModel: varchar('work_model', { length: 32 })
		.$type<'remote' | 'hybrid' | 'onsite' | 'any'>()
		.default('any'),
	willingToRelocate: boolean('willing_to_relocate').default(false),
	writingTone: varchar('writing_tone', { length: 32 })
		.$type<'formal' | 'modern' | 'creative' | 'technical'>()
		.default('modern'),
	careerGoals: text('career_goals'),
	aiCreditsUsed: integer('ai_credits_used').default(0).notNull(),
	aiCreditsLimit: integer('ai_credits_limit').default(5).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.$onUpdate(() => new Date())
		.notNull(),
});

export type UserProfiles = typeof userProfiles.$inferSelect;
