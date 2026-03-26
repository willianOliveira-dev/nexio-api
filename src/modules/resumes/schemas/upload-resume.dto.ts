import { z } from 'zod';
import { allowedMimeTypes, MAX_FILE_SIZE_BYTES } from './resumes.enums.js';

export const uploadResumeBodySchema = z.object({
	file: z
		.instanceof(File)
		.refine((f) => (allowedMimeTypes as readonly string[]).includes(f.type), {
			message: 'Tipo de arquivo não permitido. Use PDF, DOCX ou TXT.',
		})
		.refine((f) => f.size <= MAX_FILE_SIZE_BYTES, {
			message: 'Arquivo excede o tamanho máximo de 10MB.',
		}),
});

export type UploadResumeBody = z.infer<typeof uploadResumeBodySchema>;

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
