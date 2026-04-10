import { z } from '@hono/zod-openapi';

export const attachmentSchema = z.object({
	type: z.enum(['image', 'document']),
	url: z.string().url().optional(),
	base64: z.string().optional(),
	mimeType: z.string(),
	name: z.string().optional(),
});

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
	attachments: z.array(attachmentSchema).max(5).optional(),
});

export type SendMessageDTO = z.infer<typeof sendMessageBodySchema>;
