import { z } from 'zod';

export const exportResponseSchema = z.object({
	id: z.string().uuid(),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	documentType: z.enum(['resume', 'resume_version', 'cover_letter']),
	format: z.enum(['pdf', 'docx', 'plain_text']),
	language: z.enum(['pt', 'en']),
	shareToken: z.string().nullable(),
	shareExpiresAt: z.string().nullable(),
	downloadUrl: z.string().nullable(),
	createdAt: z.string(),
});

export const exportStatusResponseSchema = z.object({
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	downloadUrl: z.string().nullable(),
});

export const exportDownloadResponseSchema = z.object({
	url: z.string(),
	expiresAt: z.string(),
});

export const shareResponseSchema = z.object({
	shareUrl: z.string(),
	shareToken: z.string(),
	expiresAt: z.string(),
});

export const publicExportResponseSchema = z.object({
	downloadUrl: z.string(),
	format: z.enum(['pdf', 'docx', 'plain_text']),
});

export const paginatedExportsSchema = z.object({
	data: z.array(exportResponseSchema),
	meta: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		totalPages: z.number(),
	}),
});
