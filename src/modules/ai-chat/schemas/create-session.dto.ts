import { z } from 'zod';

export const createSessionBodySchema = z.object({
	resumeId: z.string().uuid(),
	jobMatchId: z.string().uuid().optional(),
});

export type CreateSessionDTO = z.infer<typeof createSessionBodySchema>;
