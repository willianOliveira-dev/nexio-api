import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { UsersController } from '../controllers/users.controller.js';
import {
	getCreditsResponseSchema,
	getMeResponseSchema,
	profileResponseSchema,
} from '../schemas/responses.schema.js';
import { updateProfileSchema } from '../schemas/update-profile.dto.js';

export const usersRoutes = new OpenAPIHono<AppEnv>();

const controller = new UsersController();

usersRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/users/me',
		operationId: 'getMe',
		tags: ['Users'],
		summary: 'Obtém o usuário autenticado e seu perfil',
		middleware: [authenticateMiddleware] as const,
		responses: {
			200: {
				description: 'Dados do usuário e perfil',
				content: { 'application/json': { schema: getMeResponseSchema } },
			},
			404: createAppErrorResponse('Não Encontrado — Usuário ou perfil inexistente'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const result = await controller.getMe(user.id);
		return c.json(result, 200);
	},
);

usersRoutes.openapi(
	createRoute({
		method: 'patch',
		path: '/users/me/profile',
		operationId: 'updateProfile',
		tags: ['Users'],
		summary: 'Atualiza o perfil do usuário autenticado',
		middleware: [authenticateMiddleware] as const,
		request: {
			body: {
				required: true,
				content: { 'application/json': { schema: updateProfileSchema } },
			},
		},
		responses: {
			200: {
				description: 'Perfil atualizado com sucesso',
				content: { 'application/json': { schema: profileResponseSchema } },
			},
			400: createValidationErrorResponse('Erro de Validação — Formato ou dados enviados inválidos'),
			404: createAppErrorResponse('Não Encontrado — Perfil inexistente'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = c.req.valid('json');
		const result = await controller.updateProfile(user.id, body);
		return c.json(result, 200);
	},
);

usersRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/users/me/credits',
		operationId: 'getCredits',
		tags: ['Users'],
		summary: 'Retorna o saldo de créditos de IA do usuário',
		middleware: [authenticateMiddleware] as const,
		responses: {
			200: {
				description: 'Saldo de créditos disponíveis para uso de IA',
				content: { 'application/json': { schema: getCreditsResponseSchema } },
			},
			404: createAppErrorResponse('Não Encontrado — Perfil inexistente'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const result = await controller.getCredits(user.id);
		return c.json(result, 200);
	},
);
