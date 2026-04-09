import {
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

import { subscriptions } from './subscriptions.schema.js';
import { user } from './user.schema.js';

export const userPlanEnum = pgEnum('user_plan', ['free', 'pro', 'enterprise']);
export const experienceLevelEnum = pgEnum('experience_level', [
	'intern',
	'junior',
	'mid',
	'senior',
	'lead',
	'executive',
]);
export const preferredLanguageEnum = pgEnum('preferred_language', ['pt', 'en']);
export const workModelEnum = pgEnum('work_model', ['remote', 'hybrid', 'onsite', 'any']);
export const writingToneEnum = pgEnum('writing_tone', [
	'formal',
	'modern',
	'creative',
	'technical',
]);

export const userProfiles = pgTable('user_profiles', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
		onDelete: 'set null',
	}),
	plan: userPlanEnum('plan').default('free').notNull(),
	currentRole: varchar('current_role', { length: 255 }),
	targetRole: varchar('target_role', { length: 255 }),
	experienceLevel: experienceLevelEnum('experience_level'),
	industry: varchar('industry', { length: 255 }),
	skills: jsonb('skills').$type<string[]>().default([]),
	socialLinks: jsonb('social_links').$type<{ plataform: string; url: string }[]>().default([]),
	preferredLanguage: preferredLanguageEnum('preferred_language').default('pt').notNull(),
	targetCountry: varchar('target_country', { length: 64 }),
	workModel: workModelEnum('work_model').default('any'),
	willingToRelocate: boolean('willing_to_relocate').default(false),
	writingTone: writingToneEnum('writing_tone').default('modern'),
	careerGoals: text('career_goals'),
	aiCreditsUsed: integer('ai_credits_used').default(0).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.$onUpdate(() => new Date())
		.notNull(),
});

export type UserProfiles = typeof userProfiles.$inferSelect;
