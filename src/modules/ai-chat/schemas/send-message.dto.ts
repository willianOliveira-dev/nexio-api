import { z } from '@hono/zod-openapi';

export const sendMessageBodySchema = z.object({
	content: z.string().max(5000).optional(),
	messages: z
		.array(
			z.object({
				role: z.string(),
				content: z.string(),
			}),
		)
		.optional(),
});

export type SendMessageDTO = z.infer<typeof sendMessageBodySchema>;
