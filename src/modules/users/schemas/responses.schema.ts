import { z } from '@hono/zod-openapi';
import { experienceLevels, preferredLanguages, workModels, writingTones } from './users.enums.js';

export const userResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	image: z.string().nullable(),
	createdAt: z.string().datetime(),
});

export const profileResponseSchema = z.object({
	plan: z.enum(['free', 'pro', 'enterprise']),
	currentRole: z.string().nullable(),
	targetRole: z.string().nullable(),
	experienceLevel: z.enum(experienceLevels).nullable(),
	industry: z.string().nullable(),
	skills: z.array(z.string()).nullable(),
	socialLinks: z
		.array(
			z.object({
				plataform: z.string(),
				url: z.string(),
			}),
		)
		.nullable(),
	preferredLanguage: z.enum(preferredLanguages),
	workModel: z.enum(workModels).nullable(),
	willingToRelocate: z.boolean().nullable(),
	writingTone: z.enum(writingTones).nullable(),
	careerGoals: z.string().nullable(),
	aiCreditsUsed: z.number().int(),
});

export const getMeResponseSchema = z.object({
	user: userResponseSchema,
	profile: profileResponseSchema,
});

export const getCreditsResponseSchema = z.object({
	used: z.number().int(),
	limit: z.number().int(),
	remaining: z.number().int(),
	resetAt: z.string().datetime(),
});
