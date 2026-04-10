import { z } from 'zod';
import { resumeStatuses } from './resumes.enums.js';
import { paginationQuerySchema } from './upload-resume.dto.js';

export const listResumesQuerySchema = paginationQuerySchema.extend({
	search: z.string().optional().openapi({
		description: 'Busca textual pelo nome do arquivo',
		example: 'curriculo_dev',
	}),
	status: z
		.preprocess(
			(val) => (typeof val === 'string' ? val.split(',').map((s) => s.trim()) : val),
			z.array(z.enum(resumeStatuses)).optional(),
		)
		.openapi({
			description: 'Filtra por um ou mais status (separados por vírgula)',
			example: 'analyzed,pending',
		}),
	sortBy: z.enum(['createdAt', 'fileName']).default('createdAt').openapi({
		description: 'Campo para ordenação',
	}),
	sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
		description: 'Direção da ordenação',
	}),
});

export type ListResumesQuery = z.infer<typeof listResumesQuerySchema>;
