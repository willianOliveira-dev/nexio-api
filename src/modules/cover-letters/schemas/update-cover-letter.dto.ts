import { z } from 'zod';

export const updateCoverLetterBodySchema = z.object({
	title: z.string().min(1).max(255).optional(),
	content: z.string().min(1).optional(),
});

export type UpdateCoverLetterDTO = z.infer<typeof updateCoverLetterBodySchema>;
