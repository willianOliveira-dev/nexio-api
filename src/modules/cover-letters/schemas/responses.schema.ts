import { z } from '@hono/zod-openapi';

export const paginationMetaSchema = z.object({
	total: z.number().int(),
	page: z.number().int(),
	limit: z.number().int(),
	totalPages: z.number().int(),
	hasNext: z.boolean(),
	hasPrevious: z.boolean(),
});

export const coverLetterDetailSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	content: z.string(),
	baseResumeId: z.string().uuid().nullable(),
	jobMatchId: z.string().uuid().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const coverLetterListItemSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	baseResumeId: z.string().uuid().nullable(),
	jobMatchId: z.string().uuid().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const paginatedCoverLettersSchema = z.object({
	data: z.array(coverLetterListItemSchema),
	meta: paginationMetaSchema,
});
