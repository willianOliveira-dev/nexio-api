import { z } from '@hono/zod-openapi';

export const uploadResumeResponseSchema = z.object({
	id: z.string().uuid(),
	fileName: z.string(),
	status: z.enum(['pending', 'processing', 'analyzed', 'failed']),
	createdAt: z.string().datetime(),
});

const scoreSchema = z
	.object({
		overall: z.number().int(),
		impact: z.number().int(),
		atsScore: z.number().int(),
		keywords: z.number().int(),
		clarity: z.number().int(),
	})
	.nullable();

export const resumeListItemSchema = z.object({
	id: z.string().uuid(),
	fileName: z.string(),
	status: z.enum(['pending', 'processing', 'analyzed', 'failed']),
	fullName: z.string().nullable(),
	score: scoreSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const resumeDetailSchema = z.object({
	id: z.string().uuid(),
	fileName: z.string(),
	status: z.enum(['pending', 'processing', 'analyzed', 'failed']),
	mimeType: z.string(),
	sizeBytes: z.number().int(),
	fullName: z.string().nullable(),
	email: z.string().nullable(),
	phone: z.string().nullable(),
	location: z.string().nullable(),
	website: z.string().nullable(),
	professionalSummary: z.string().nullable(),
	score: z
		.object({
			overall: z.number().int(),
			impact: z.number().int(),
			atsScore: z.number().int(),
			keywords: z.number().int(),
			clarity: z.number().int(),
			strengths: z.array(z.string()),
			improvements: z.array(
				z.object({
					type: z.string(),
					description: z.string(),
					priority: z.enum(['low', 'medium', 'high']),
				}),
			),
			missingKeywords: z.array(z.string()),
		})
		.nullable(),
	workExperiences: z.array(
		z.object({
			id: z.string().uuid(),
			title: z.string(),
			company: z.string(),
			location: z.string().nullable(),
			startDate: z.string().nullable(),
			endDate: z.string().nullable(),
			isCurrent: z.boolean().nullable(),
			description: z.string().nullable(),
			orderIndex: z.number().int(),
		}),
	),
	educations: z.array(
		z.object({
			id: z.string().uuid(),
			degree: z.string(),
			institution: z.string(),
			location: z.string().nullable(),
			startDate: z.string().nullable(),
			endDate: z.string().nullable(),
			orderIndex: z.number().int(),
		}),
	),
	skills: z.array(
		z.object({
			id: z.string().uuid(),
			category: z.string().nullable(),
			name: z.string(),
		}),
	),
	languages: z.array(
		z.object({
			id: z.string().uuid(),
			name: z.string(),
			proficiency: z.string().nullable(),
		}),
	),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

const paginationMetaSchema = z.object({
	total: z.number().int(),
	page: z.number().int(),
	limit: z.number().int(),
	totalPages: z.number().int(),
});

export const paginatedResumesSchema = z.object({
	data: z.array(resumeListItemSchema),
	meta: paginationMetaSchema,
});

export const scoreResponseSchema = z.object({
	id: z.string().uuid(),
	resumeId: z.string().uuid().nullable(),
	overall: z.number().int(),
	impact: z.number().int(),
	atsScore: z.number().int(),
	keywords: z.number().int(),
	clarity: z.number().int(),
	strengths: z.array(z.string()),
	improvements: z.array(
		z.object({
			type: z.string(),
			description: z.string(),
			priority: z.enum(['low', 'medium', 'high']),
		}),
	),
	missingKeywords: z.array(z.string()),
	createdAt: z.string().datetime(),
});

export const downloadUrlResponseSchema = z.object({
	url: z.string().url(),
	expiresAt: z.string().datetime(),
});

export const reanalyzeResponseSchema = z.object({
	message: z.string(),
	status: z.literal('processing'),
});

export const versionListItemSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	jobMatchId: z.string().uuid().nullable(),
	createdAt: z.string().datetime(),
});

export const paginatedVersionsSchema = z.object({
	data: z.array(versionListItemSchema),
	meta: paginationMetaSchema,
});

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});
