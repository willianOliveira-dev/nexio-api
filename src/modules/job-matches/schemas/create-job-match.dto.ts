import { z } from 'zod';

export const createJobMatchBodySchema = z.object({
	resumeId: z.string().uuid(),
	jobTitle: z.string().min(1).max(255),
	jobDescription: z.string().min(100).max(10000),
});

export type CreateJobMatchDTO = z.infer<typeof createJobMatchBodySchema>;
