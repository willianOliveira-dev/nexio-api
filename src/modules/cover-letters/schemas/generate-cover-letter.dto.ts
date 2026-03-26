import { z } from 'zod';

export const generateCoverLetterBodySchema = z.object({
	baseResumeId: z.string().uuid(),
	jobMatchId: z.string().uuid().optional(),
	title: z.string().min(1).max(255),
});

export type GenerateCoverLetterDTO = z.infer<typeof generateCoverLetterBodySchema>;
