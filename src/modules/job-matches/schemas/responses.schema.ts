import { z } from '@hono/zod-openapi';

export const paginationMetaSchema = z.object({
	total: z.number().int(),
	page: z.number().int(),
	limit: z.number().int(),
	totalPages: z.number().int(),
	hasNext: z.boolean(),
	hasPrevious: z.boolean(),
});

export const recommendationSchema = z.object({
	title: z.string(),
	description: z.string(),
	difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const jobMatchDetailSchema = z.object({
	id: z.string().uuid(),
	resumeId: z.string().uuid(),
	jobTitle: z.string().nullable(),
	jobDescription: z.string(),
	matchScore: z.number().int(),
	foundKeywords: z.array(z.string()),
	missingKeywords: z.array(z.string()),
	recommendations: z.array(recommendationSchema),
	createdAt: z.string().datetime(),
});

export const jobMatchListItemSchema = z.object({
	id: z.string().uuid(),
	resumeId: z.string().uuid(),
	jobTitle: z.string().nullable(),
	matchScore: z.number().int(),
	foundKeywords: z.array(z.string()),
	missingKeywords: z.array(z.string()),
	recommendations: z.array(recommendationSchema),
	createdAt: z.string().datetime(),
});

export const paginatedJobMatchesSchema = z.object({
	data: z.array(jobMatchListItemSchema),
	meta: paginationMetaSchema,
});
