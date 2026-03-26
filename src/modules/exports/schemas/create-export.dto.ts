import { z } from 'zod';

export const createExportBodySchema = z
	.object({
		documentType: z.enum(['resume', 'resume_version', 'cover_letter']),
		resumeId: z.string().uuid().optional(),
		resumeVersionId: z.string().uuid().optional(),
		coverLetterId: z.string().uuid().optional(),
		format: z.enum(['pdf', 'docx', 'plain_text']),
		language: z.enum(['pt', 'en']).default('pt'),
	})
	.superRefine((data, ctx) => {
		if (data.documentType === 'resume' && !data.resumeId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'resumeId é obrigatório quando documentType é "resume".',
				path: ['resumeId'],
			});
		}
		if (data.documentType === 'resume_version' && !data.resumeVersionId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'resumeVersionId é obrigatório quando documentType é "resume_version".',
				path: ['resumeVersionId'],
			});
		}
		if (data.documentType === 'cover_letter' && !data.coverLetterId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'coverLetterId é obrigatório quando documentType é "cover_letter".',
				path: ['coverLetterId'],
			});
		}
	});

export type CreateExportDTO = z.infer<typeof createExportBodySchema>;
