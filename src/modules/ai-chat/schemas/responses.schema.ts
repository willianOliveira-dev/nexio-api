import { z } from '@hono/zod-openapi';

const suggestionResponseSchema = z
	.object({
		section: z.string(),
		original: z.string().optional(),
		suggested: z.string(),
	})
	.nullable();

export const messageResponseSchema = z.object({
	id: z.string().uuid(),
	role: z.enum(['user', 'assistant']),
	content: z.string(),
	suggestion: suggestionResponseSchema,
	createdAt: z.string().datetime(),
});

export const sessionDetailSchema = z.object({
	id: z.string().uuid(),
	resumeId: z.string().uuid().nullable(),
	jobMatchId: z.string().uuid().nullable(),
	title: z.string().nullable(),
	isBuilder: z.boolean(),
	isActive: z.boolean(),
	messages: z.array(messageResponseSchema),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const sessionListItemSchema = z.object({
	id: z.string().uuid(),
	resumeId: z.string().uuid().nullable(),
	jobMatchId: z.string().uuid().nullable(),
	title: z.string().nullable(),
	isBuilder: z.boolean(),
	isActive: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const paginationMetaSchema = z.object({
	total: z.number().int(),
	page: z.number().int(),
	limit: z.number().int(),
	totalPages: z.number().int(),
	hasNext: z.boolean(),
	hasPrevious: z.boolean(),
});

export const paginatedSessionsSchema = z.object({
	data: z.array(sessionListItemSchema),
	meta: paginationMetaSchema,
});

export const applySuggestionResponseSchema = z.object({
	resume: z.object({
		id: z.string().uuid(),
		updatedField: z.string(),
		updatedValue: z.string(),
	}),
	version: z.object({
		id: z.string().uuid(),
		title: z.string(),
		createdAt: z.string().datetime(),
	}),
});

export const closeSessionResponseSchema = z.object({
	isActive: z.boolean(),
});
