import { z } from '@hono/zod-openapi';

export const planEnumSchema = z.enum(['free', 'pro', 'enterprise']);

export const subscriptionStatusSchema = z.enum([
	'active',
	'canceled',
	'past_due',
	'trialing',
	'incomplete',
	'incomplete_expired',
	'unpaid',
]);

export const planLimitsSchema = z.object({
	maxResumes: z
		.number()
		.int()
		.openapi({ description: 'Máximo de currículos armazenados. -1 = ilimitado.', example: 50 }),
	maxAiAnalysesPerMonth: z
		.number()
		.int()
		.openapi({ description: 'Créditos de IA por mês. -1 = ilimitado.', example: 50 }),
	canExportPdf: z.boolean().openapi({ example: true }),
	canExportDocx: z.boolean().openapi({ example: true }),
	canExportTxt: z.boolean().openapi({ example: true }),
	canJobMatch: z.boolean().openapi({ example: true }),
	canGenerateCoverLetter: z.boolean().openapi({ example: true }),
});

export const planSchema = z
	.object({
		id: planEnumSchema.openapi({ example: 'pro' }),
		name: z.string().openapi({ example: 'Pro' }),
		price: z
			.number()
			.openapi({ description: 'Preço na moeda principal por intervalo.', example: 9.99 }),
		currency: z.string().openapi({ example: 'usd' }),
		interval: z.enum(['month', 'year']).openapi({ example: 'month' }),
		features: z.array(z.string()).openapi({
			description: 'Lista de recursos em formato legível.',
			example: ['50 currículos', '50 análises de IA/mês'],
		}),
		limits: planLimitsSchema,
	})
	.openapi('Plan');

export const plansResponseSchema = z.array(planSchema).openapi('PlansResponse');

export const subscriptionResponseSchema = z
	.object({
		id: z.string().openapi({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }),
		userId: z.string().openapi({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }),
		plan: planEnumSchema,
		status: subscriptionStatusSchema,
		currentPeriodStart: z
			.string()
			.datetime()
			.nullable()
			.openapi({ example: '2025-01-01T00:00:00.000Z' }),
		currentPeriodEnd: z
			.string()
			.datetime()
			.nullable()
			.openapi({ example: '2025-02-01T00:00:00.000Z' }),
		cancelAtPeriodEnd: z.boolean().openapi({ example: false }),
		canceledAt: z.string().datetime().nullable().openapi({ example: null }),
		createdAt: z.string().datetime().openapi({ example: '2025-01-01T00:00:00.000Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2025-01-01T00:00:00.000Z' }),
	})
	.openapi('SubscriptionResponse');

export const checkoutSessionResponseSchema = z
	.object({
		sessionId: z.string().openapi({ example: 'cs_test_...' }),
		url: z.string().url().openapi({ example: 'https://checkout.stripe.com/pay/cs_test_...' }),
	})
	.openapi('CheckoutSessionResponse');

export const customerPortalResponseSchema = z
	.object({
		url: z.string().url().openapi({ example: 'https://billing.stripe.com/session/...' }),
	})
	.openapi('CustomerPortalResponse');

export const cancelSubscriptionResponseSchema = z
	.object({
		message: z.string().openapi({ example: 'Assinatura cancelada com sucesso' }),
	})
	.openapi('CancelSubscriptionResponse');

export const resumeSubscriptionResponseSchema = z
	.object({
		message: z.string().openapi({ example: 'Assinatura reativada com sucesso' }),
	})
	.openapi('ResumeSubscriptionResponse');

export type PlanResponse = z.infer<typeof planSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;
export type CustomerPortalResponse = z.infer<typeof customerPortalResponseSchema>;
