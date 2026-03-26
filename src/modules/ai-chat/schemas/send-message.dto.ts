import { z } from 'zod';

export const sendMessageBodySchema = z.object({
	content: z.string().min(1).max(5000),
});

export type SendMessageDTO = z.infer<typeof sendMessageBodySchema>;
