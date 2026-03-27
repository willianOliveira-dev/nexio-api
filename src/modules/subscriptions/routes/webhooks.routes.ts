import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createAppErrorResponse } from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { WebhooksController } from '../controllers/webhooks.controller.js';

export const webhooksRoutes = new OpenAPIHono<AppEnv>();
const controller = new WebhooksController();

webhooksRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/webhooks/stripe',
		operationId: 'handleStripeWebhook',
		tags: ['Webhooks'],
		summary:
			'Recebe eventos do Stripe via webhook (checkout, assinaturas, faturas). ' +
			'Não requer autenticação — valida a assinatura Stripe internamente.',
		responses: {
			200: {
				description: 'Evento recebido e processado com sucesso',
				content: {
					'application/json': {
						schema: z.object({
							received: z.literal(true).openapi({ example: true }),
						}),
					},
				},
			},
			400: createAppErrorResponse('Assinatura do webhook inválida ou cabeçalho ausente'),
			500: createAppErrorResponse('Erro interno ao processar o evento do webhook'),
		},
	}),
	async (c) => {
		const rawBody = await c.req.text();
		const signature = c.req.header('stripe-signature') ?? '';

		await controller.handleStripeWebhook(rawBody, signature);

		return c.json({ received: true as const }, 200);
	},
);
