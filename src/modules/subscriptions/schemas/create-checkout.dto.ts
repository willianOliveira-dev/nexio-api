import { z } from '@hono/zod-openapi';

export const createCheckoutSchema = z
	.object({
		plan: z.enum(['pro', 'enterprise']).openapi({
			description: 'Target plan to upgrade to.',
			example: 'pro',
		}),
		successUrl: z.string().url().optional().openapi({
			description:
				'URL to redirect after successful payment. Defaults to ${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}.',
			example: 'https://app.nexio.io/dashboard?session_id={CHECKOUT_SESSION_ID}',
		}),
		cancelUrl: z.string().url().optional().openapi({
			description:
				'URL to redirect if the user cancels checkout. Defaults to ${FRONTEND_URL}/pricing.',
			example: 'https://app.nexio.io/pricing',
		}),
	})
	.openapi('CreateCheckoutBody');

export type CreateCheckoutDto = z.infer<typeof createCheckoutSchema>;
