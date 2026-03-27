import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { AiChatController } from '../controllers/ai-chat.controller.js';
import { applySuggestionBodySchema } from '../schemas/apply-suggestion.dto.js';
import { createSessionBodySchema } from '../schemas/create-session.dto.js';
import {
	applySuggestionResponseSchema,
	closeSessionResponseSchema,
	messageResponseSchema,
	paginatedSessionsSchema,
	sessionDetailSchema,
} from '../schemas/responses.schema.js';
import { sendMessageBodySchema } from '../schemas/send-message.dto.js';

export const aiChatRoutes = new OpenAPIHono<AppEnv>();
const controller = new AiChatController();

const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

aiChatRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/ai-chat/sessions',
		operationId: 'createChatSession',
		tags: ['AI Chat'],
		summary: 'Cria uma nova sessão de chat com a IA',
		middleware: [authenticateMiddleware],
		request: {
			body: {
				required: true,
				content: { 'application/json': { schema: createSessionBodySchema } },
			},
		},
		responses: {
			201: {
				description: 'Sessão de chat criada',
				content: { 'application/json': { schema: sessionDetailSchema } },
			},
			400: createValidationErrorResponse('Dados inválidos ou currículo não analisado'),
			404: createAppErrorResponse('Currículo ou Job Match não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = c.req.valid('json');
		const session = await controller.createSession(user.id, body);
		return c.json(
			{
				id: session.id,
				resumeId: session.resumeId,
				jobMatchId: session.jobMatchId ?? null,
				title: session.title,
				isActive: session.isActive,
				messages: [],
				createdAt: session.createdAt.toISOString(),
				updatedAt: session.updatedAt.toISOString(),
			},
			201,
		);
	},
);

aiChatRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/ai-chat/sessions',
		operationId: 'listChatSessions',
		tags: ['AI Chat'],
		summary: 'Lista as sessões de chat do usuário com paginação',
		middleware: [authenticateMiddleware],
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: 'Lista paginada de sessões (sem mensagens)',
				content: { 'application/json': { schema: paginatedSessionsSchema } },
			},
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { page, limit } = c.req.valid('query');
		const result = await controller.listSessions(user.id, { page, limit });
		return c.json(
			{
				data: result.data.map((s) => ({
					id: s.id,
					resumeId: s.resumeId,
					jobMatchId: s.jobMatchId ?? null,
					title: s.title,
					isActive: s.isActive,
					createdAt: s.createdAt.toISOString(),
					updatedAt: s.updatedAt.toISOString(),
				})),
				meta: result.meta,
			},
			200,
		);
	},
);

aiChatRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/ai-chat/sessions/:id',
		operationId: 'getChatSession',
		tags: ['AI Chat'],
		summary: 'Obtém uma sessão de chat com mensagens paginadas',
		middleware: [authenticateMiddleware],
		request: {
			params: z.object({ id: z.string().uuid() }),
			query: paginationQuerySchema,
		},
		responses: {
			200: {
				description: 'Sessão de chat com mensagens',
				content: { 'application/json': { schema: sessionDetailSchema } },
			},
			404: createAppErrorResponse('Sessão não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const { page, limit } = c.req.valid('query');
		const session = await controller.getSession(id, user.id, { page, limit });
		return c.json(
			{
				id: session.id,
				resumeId: session.resumeId,
				jobMatchId: session.jobMatchId ?? null,
				title: session.title,
				isActive: session.isActive,
				messages: session.messages.map((m) => ({
					id: m.id,
					role: m.role,
					content: m.content,
					suggestion: m.suggestion ?? null,
					createdAt: m.createdAt.toISOString(),
				})),
				createdAt: session.createdAt.toISOString(),
				updatedAt: session.updatedAt.toISOString(),
			},
			200,
		);
	},
);

aiChatRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/ai-chat/sessions/:id/messages',
		operationId: 'sendChatMessage',
		tags: ['AI Chat'],
		summary: 'Envia uma mensagem para a IA e recebe a resposta (consome 1 crédito)',
		middleware: [authenticateMiddleware],
		request: {
			params: z.object({ id: z.string().uuid() }),
			body: {
				required: true,
				content: { 'application/json': { schema: sendMessageBodySchema } },
			},
		},
		responses: {
			200: {
				description: 'Mensagem do assistente',
				content: { 'application/json': { schema: messageResponseSchema } },
			},
			400: createValidationErrorResponse('Dados inválidos ou sessão encerrada'),
			402: createAppErrorResponse('Créditos de IA esgotados'),
			404: createAppErrorResponse('Sessão não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const { content } = c.req.valid('json');
		const message = await controller.sendMessage(id, user.id, content);
		return c.json(
			{
				id: message.id,
				role: message.role,
				content: message.content,
				suggestion: message.suggestion ?? null,
				createdAt: message.createdAt.toISOString(),
			},
			200,
		);
	},
);

aiChatRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/ai-chat/sessions/:id/apply-suggestion',
		operationId: 'applyChatSuggestion',
		tags: ['AI Chat'],
		summary: 'Aplica uma sugestão da IA ao currículo e cria uma versão',
		middleware: [authenticateMiddleware],
		request: {
			params: z.object({ id: z.string().uuid() }),
			body: {
				required: true,
				content: { 'application/json': { schema: applySuggestionBodySchema } },
			},
		},
		responses: {
			200: {
				description: 'Currículo atualizado e versão criada',
				content: { 'application/json': { schema: applySuggestionResponseSchema } },
			},
			400: createValidationErrorResponse('Dados inválidos'),
			404: createAppErrorResponse('Sessão, currículo ou mensagem não encontrados'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		const result = await controller.applySuggestion(id, user.id, body);
		return c.json(result, 200);
	},
);

aiChatRoutes.openapi(
	createRoute({
		method: 'patch',
		path: '/ai-chat/sessions/:id/close',
		operationId: 'closeChatSession',
		tags: ['AI Chat'],
		summary: 'Encerra uma sessão de chat',
		middleware: [authenticateMiddleware],
		request: {
			params: z.object({ id: z.string().uuid() }),
		},
		responses: {
			200: {
				description: 'Sessão encerrada',
				content: { 'application/json': { schema: closeSessionResponseSchema } },
			},
			404: createAppErrorResponse('Sessão não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		await controller.closeSession(id, user.id);
		return c.json({ isActive: false }, 200);
	},
);
