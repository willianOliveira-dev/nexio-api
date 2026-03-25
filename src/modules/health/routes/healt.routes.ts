import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

export function healthRoutes(app: OpenAPIHono) {
	const route = createRoute({
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
	});

	app.openapi(route, (c) => c.json({ status: 'ok' as const }));
}
