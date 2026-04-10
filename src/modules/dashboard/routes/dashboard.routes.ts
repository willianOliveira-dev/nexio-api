import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { dashboardSummaryResponseSchema } from '../schemas/dashboard.schema.js';

export const dashboardRoutes = new OpenAPIHono<AppEnv>();

const controller = new DashboardController();

dashboardRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/dashboard/summary',
		operationId: 'getDashboardSummary',
		tags: ['Dashboard'],
		summary: 'Obtém o resumo completo de estatísticas para a Dashboard',
		middleware: [authenticateMiddleware],
		responses: {
			200: {
				description: 'Resumo com estatísticas, uploads recentes e limites do plano',
				content: { 'application/json': { schema: dashboardSummaryResponseSchema } },
			},
			404: createAppErrorResponse('Não Encontrado — Dados não encontrados'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const result = await controller.getSummary(user.id);
		return c.json(result, 200);
	},
);
