import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { SubscriptionsController } from '../controllers/subscriptions.controller.js';
import { createCheckoutSchema } from '../schemas/create-checkout.dto.js';
import {
	cancelSubscriptionResponseSchema,
	checkoutSessionResponseSchema,
	customerPortalResponseSchema,
	plansResponseSchema,
	resumeSubscriptionResponseSchema,
	subscriptionResponseSchema,
} from '../schemas/responses.schema.js';

export const subscriptionsRoutes = new OpenAPIHono<AppEnv>();
const controller = new SubscriptionsController();

subscriptionsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/subscriptions/plans',
		operationId: 'getPlans',
		tags: ['Subscriptions'],
		summary: 'Lista os planos disponíveis (Free, Pro, Enterprise) com features e limites',
		responses: {
			200: {
				description: 'Lista de planos retornada com sucesso',
				content: { 'application/json': { schema: plansResponseSchema } },
			},
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const plans = await controller.getPlans();
		return c.json(plans, 200);
	},
);

subscriptionsRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/subscriptions/checkout',
		operationId: 'createCheckout',
		tags: ['Subscriptions'],
		summary: 'Cria uma sessão de checkout do Stripe para upgrade de plano (Pro ou Enterprise)',
		middleware: [authenticateMiddleware] as const,
		request: {
			body: {
				required: true,
				content: { 'application/json': { schema: createCheckoutSchema } },
			},
		},
		responses: {
			200: {
				description: 'Sessão de checkout criada. Redirecione o usuário para `url`.',
				content: { 'application/json': { schema: checkoutSessionResponseSchema } },
			},
			400: createValidationErrorResponse('Dados inválidos ou plano já ativo'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = c.req.valid('json');
		const session = await controller.createCheckout(user.id, user.email, body);
		return c.json(session, 200);
	},
);

subscriptionsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/subscriptions/subscription',
		operationId: 'getSubscription',
		tags: ['Subscriptions'],
		summary: 'Obtém a assinatura atual do usuário autenticado',
		middleware: [authenticateMiddleware] as const,
		responses: {
			200: {
				description: 'Dados da assinatura retornados com sucesso',
				content: { 'application/json': { schema: subscriptionResponseSchema } },
			},
			404: createAppErrorResponse('Assinatura não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const subscription = await controller.getSubscription(user.id);
		return c.json(subscription, 200);
	},
);

subscriptionsRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/subscriptions/subscription/cancel',
		operationId: 'cancelSubscription',
		tags: ['Subscriptions'],
		summary: 'Agenda o cancelamento da assinatura ao fim do período atual',
		middleware: [authenticateMiddleware] as const,
		responses: {
			200: {
				description: 'Cancelamento agendado com sucesso',
				content: { 'application/json': { schema: cancelSubscriptionResponseSchema } },
			},
			400: createAppErrorResponse('Assinatura já cancelada ou sem assinatura ativa'),
			404: createAppErrorResponse('Assinatura não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		await controller.cancelSubscription(user.id);
		return c.json({ message: 'Assinatura cancelada com sucesso' }, 200);
	},
);

subscriptionsRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/subscriptions/subscription/resume',
		operationId: 'resumeSubscription',
		tags: ['Subscriptions'],
		summary: 'Reativa uma assinatura com cancelamento agendado antes do fim do período',
		middleware: [authenticateMiddleware] as const,
		responses: {
			200: {
				description: 'Assinatura reativada com sucesso',
				content: { 'application/json': { schema: resumeSubscriptionResponseSchema } },
			},
			400: createAppErrorResponse('Assinatura não está agendada para cancelamento'),
			404: createAppErrorResponse('Assinatura não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		await controller.resumeSubscription(user.id);
		return c.json({ message: 'Assinatura reativada com sucesso' }, 200);
	},
);

subscriptionsRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/subscriptions/portal',
		operationId: 'createPortalSession',
		tags: ['Subscriptions'],
		summary: 'Cria sessão do Stripe Customer Portal para gerenciar assinaturas e faturas',
		middleware: [authenticateMiddleware] as const,
		responses: {
			200: {
				description: 'URL do portal gerada com sucesso. Redirecione o usuário para `url`.',
				content: { 'application/json': { schema: customerPortalResponseSchema } },
			},
			404: createAppErrorResponse('Cliente Stripe não encontrado para este usuário'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const portal = await controller.createPortalSession(user.id);
		return c.json(portal, 200);
	},
);
