import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

export const healthRoutes = new OpenAPIHono();

healthRoutes.openapi(
	createRoute({
		method: 'get',
		tags: ['Health'],
		path: '/health',
		operationId: 'checkHealth',
		summary: 'Operação de verificação de integridade',
		responses: {
			200: {
				description: 'Retorna o status de saúde da API',
				content: {
					'application/json': {
						schema: z.object({
							status: z.literal('ok'),
						}),
					},
				},
			},
		},
	}),
	(c) => c.json({ status: 'ok' as const }),
);
