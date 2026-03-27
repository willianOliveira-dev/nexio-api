import dayjs from 'dayjs';
import type Stripe from 'stripe';
import { env } from '@/config/env.js';
import { getPlanFromPriceId, STRIPE_PRICE_IDS, stripe } from '@/lib/stripe/stripe.client.js';
import {
	getAiCreditsForApi,
	getMaxResumesForApi,
	getPlanLimits,
} from '@/shared/config/plan-limits.js';
import { BadRequestError, NotFoundError } from '@/shared/errors/app.error.js';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository.js';
import type {
	CheckoutSessionResponse,
	CustomerPortalResponse,
	PlanResponse,
	SubscriptionResponse,
} from '../schemas/responses.schema.js';

const STRIPE_STATUS_MAP = {
	active: 'active',
	canceled: 'canceled',
	past_due: 'past_due',
	trialing: 'trialing',
	incomplete: 'incomplete',
	incomplete_expired: 'incomplete_expired',
	unpaid: 'unpaid',
	paused: 'canceled',
} as const satisfies Record<
	Stripe.Subscription.Status,
	'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid'
>;

type MappedStatus = (typeof STRIPE_STATUS_MAP)[keyof typeof STRIPE_STATUS_MAP];

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): MappedStatus {
	return STRIPE_STATUS_MAP[stripeStatus];
}

function buildPlanFeatures(plan: 'free' | 'pro' | 'enterprise'): string[] {
	const limits = getPlanLimits(plan);
	const maxResumes = limits.maxResumes === Infinity ? 'ilimitados' : `${limits.maxResumes}`;
	const aiCredits =
		limits.aiCreditsPerMonth === Infinity ? 'ilimitadas' : `${limits.aiCreditsPerMonth}`;
	const exportFormats = limits.exportFormats
		.map((f) => (f === 'plain_text' ? 'TXT' : f.toUpperCase()))
		.join(' + ');

	const features: string[] = [
		`Até ${maxResumes} currículos armazenados`,
		`${aiCredits} análises de IA por mês`,
		`Exportação: ${exportFormats}`,
	];

	if (limits.jobMatch) features.push('Job matching com IA');
	if (limits.coverLetter) features.push('Geração de cover letters');
	if (plan === 'enterprise') {
		features.push('Acesso à API');
		features.push('Custom branding');
	}

	return features;
}

export class SubscriptionsService {
	private readonly repository: SubscriptionsRepository;

	constructor() {
		this.repository = new SubscriptionsRepository();
	}

	async getPlans(): Promise<PlanResponse[]> {
		const plans: Array<'free' | 'pro' | 'enterprise'> = ['free', 'pro', 'enterprise'];

		const stripePrices = await Promise.all(
			plans.map(async (plan) => {
				if (plan === 'free') return null;
				const priceId = STRIPE_PRICE_IDS[plan];
				if (!priceId) return null;
				try {
					return await stripe.prices.retrieve(priceId);
				} catch (err) {
					console.error(`[Stripe] Erro ao buscar preço do plano ${plan}:`, err);
					return null;
				}
			}),
		);

		return plans.map((plan, index) => {
			const limits = getPlanLimits(plan);
			const stripePrice = stripePrices[index];

			const price = stripePrice?.unit_amount
				? stripePrice.unit_amount / 100
				: plan === 'free'
					? 0
					: plan === 'pro'
						? 29.9
						: 99.9;
			const currency = stripePrice?.currency.toLowerCase() || 'brl';

			return {
				id: plan,
				name: plan.charAt(0).toUpperCase() + plan.slice(1),
				price,
				currency,
				interval: 'month' as const,
				features: buildPlanFeatures(plan),
				limits: {
					maxResumes: getMaxResumesForApi(plan),
					maxAiAnalysesPerMonth: getAiCreditsForApi(plan),
					canExportPdf: limits.exportFormats.includes('pdf'),
					canExportDocx: limits.exportFormats.includes('docx'),
					canExportTxt: limits.exportFormats.includes('plain_text'),
					canJobMatch: limits.jobMatch,
					canGenerateCoverLetter: limits.coverLetter,
				},
			};
		});
	}

	async createCheckoutSession(
		userId: string,
		userEmail: string,
		plan: 'pro' | 'enterprise',
		successUrl?: string,
		cancelUrl?: string,
	): Promise<CheckoutSessionResponse> {
		const existingSubscription = await this.repository.findByUserId(userId);

		let stripeCustomerId: string;

		if (existingSubscription?.stripeCustomerId) {
			stripeCustomerId = existingSubscription.stripeCustomerId;
		} else {
			const customer = await stripe.customers.create({
				email: userEmail,
				metadata: { userId },
			});
			stripeCustomerId = customer.id;

			if (existingSubscription) {
				await this.repository.update(userId, { stripeCustomerId });
			} else {
				await this.repository.create({
					userId,
					stripeCustomerId,
					plan: 'free',
					status: 'active',
				});
			}
		}

		const session = await stripe.checkout.sessions.create({
			customer: stripeCustomerId,
			mode: 'subscription',
			line_items: [
				{
					price: STRIPE_PRICE_IDS[plan],
					quantity: 1,
				},
			],
			subscription_data: {
				metadata: { userId, plan },
			},
			success_url: successUrl
				? `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
				: `${env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: cancelUrl ?? `${env.FRONTEND_URL}/pricing`,
			metadata: { userId, plan },
			allow_promotion_codes: true,
		});

		if (!session.url) {
			throw new BadRequestError('Falha ao criar sessão de checkout no Stripe');
		}

		return { sessionId: session.id, url: session.url };
	}

	async getSubscription(userId: string): Promise<SubscriptionResponse> {
		const subscription = await this.repository.findByUserId(userId);

		if (!subscription) {
			throw new NotFoundError('Assinatura');
		}

		return {
			id: subscription.id,
			userId: subscription.userId,
			plan: subscription.plan,
			status: subscription.status,
			currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
			currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			canceledAt: subscription.canceledAt?.toISOString() ?? null,
			createdAt: subscription.createdAt.toISOString(),
			updatedAt: subscription.updatedAt.toISOString(),
		};
	}

	async cancelSubscription(userId: string): Promise<void> {
		const subscription = await this.repository.findByUserId(userId);

		if (!subscription) {
			throw new NotFoundError('Assinatura');
		}

		if (!subscription.stripeSubscriptionId) {
			throw new BadRequestError('Nenhuma assinatura paga ativa para cancelar');
		}

		if (subscription.cancelAtPeriodEnd) {
			throw new BadRequestError('Assinatura já está agendada para cancelamento');
		}

		await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
			cancel_at_period_end: true,
		});

		await this.repository.update(userId, { cancelAtPeriodEnd: true });
	}

	async resumeSubscription(userId: string): Promise<void> {
		const subscription = await this.repository.findByUserId(userId);

		if (!subscription) {
			throw new NotFoundError('Assinatura');
		}

		if (!subscription.stripeSubscriptionId) {
			throw new BadRequestError('Nenhuma assinatura paga ativa para reativar');
		}

		if (!subscription.cancelAtPeriodEnd) {
			throw new BadRequestError('Assinatura não está agendada para cancelamento');
		}

		await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
			cancel_at_period_end: false,
		});

		await this.repository.update(userId, {
			cancelAtPeriodEnd: false,
			canceledAt: null,
		});
	}

	async createCustomerPortalSession(userId: string): Promise<CustomerPortalResponse> {
		const subscription = await this.repository.findByUserId(userId);

		if (!subscription?.stripeCustomerId) {
			throw new NotFoundError('Cliente Stripe');
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: subscription.stripeCustomerId,
			return_url: `${env.FRONTEND_URL}/dashboard/settings`,
		});

		return { url: session.url };
	}

	async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
		const userId = session.metadata?.userId;
		const plan = session.metadata?.plan;

		if (!userId || !plan || (plan !== 'pro' && plan !== 'enterprise')) {
			console.error('[webhook] checkout.session.completed missing userId or plan in metadata');
			return;
		}

		const stripeSubscriptionId =
			typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

		if (!stripeSubscriptionId) {
			console.error('[webhook] checkout.session.completed has no subscription ID');
			return;
		}

		const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
			expand: ['latest_invoice'],
		});
		const priceId = stripeSubscription.items.data[0]?.price.id;
		const status = mapStripeStatus(stripeSubscription.status);

		let currentPeriodStart = dayjs().toDate();
		let currentPeriodEnd = dayjs().add(30, 'days').toDate();

		if (
			stripeSubscription.latest_invoice &&
			typeof stripeSubscription.latest_invoice !== 'string'
		) {
			const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
			if (invoice.period_start) currentPeriodStart = dayjs.unix(invoice.period_start).toDate();
			if (invoice.period_end) currentPeriodEnd = dayjs.unix(invoice.period_end).toDate();
		}

		await this.repository.update(userId, {
			stripeSubscriptionId,
			...(priceId ? { stripePriceId: priceId } : {}),
			plan,
			status,
			currentPeriodStart,
			currentPeriodEnd,
			cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
		});
	}

	async handleSubscriptionUpdated(
		stripeSubscriptionIdOrObj: Stripe.Subscription | string,
	): Promise<void> {
		const stripeSubscriptionId =
			typeof stripeSubscriptionIdOrObj === 'string'
				? stripeSubscriptionIdOrObj
				: stripeSubscriptionIdOrObj.id;

		const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
			expand: ['latest_invoice'],
		});

		const status = mapStripeStatus(stripeSubscription.status);
		const priceId = stripeSubscription.items.data[0]?.price.id;
		const newPlan = priceId ? getPlanFromPriceId(priceId) : undefined;

		let currentPeriodStart = dayjs().toDate();
		let currentPeriodEnd = dayjs().add(30, 'days').toDate();

		if (
			stripeSubscription.latest_invoice &&
			typeof stripeSubscription.latest_invoice !== 'string'
		) {
			const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
			if (invoice.period_start) currentPeriodStart = dayjs.unix(invoice.period_start).toDate();
			if (invoice.period_end) currentPeriodEnd = dayjs.unix(invoice.period_end).toDate();
		}

		await this.repository.updateByStripeSubscriptionId(stripeSubscription.id, {
			status,
			...(newPlan ? { plan: newPlan } : {}),
			...(priceId ? { stripePriceId: priceId } : {}),
			currentPeriodStart,
			currentPeriodEnd,
			cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
		});
	}

	async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
		await this.repository.updateByStripeSubscriptionId(stripeSubscription.id, {
			status: 'canceled',
			plan: 'free',
			canceledAt: dayjs().toDate(),
			cancelAtPeriodEnd: false,
		});
	}

	async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
		const parentDetails = invoice.parent;
		const subRef =
			parentDetails?.type === 'subscription_details'
				? parentDetails.subscription_details?.subscription
				: undefined;
		const stripeSubscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;

		if (!stripeSubscriptionId) return;
		await this.repository.updateByStripeSubscriptionId(stripeSubscriptionId, {
			status: 'active',
		});
	}

	async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
		const parentDetails = invoice.parent;
		const subRef =
			parentDetails?.type === 'subscription_details'
				? parentDetails.subscription_details?.subscription
				: undefined;
		const stripeSubscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;

		if (!stripeSubscriptionId) return;

		await this.repository.updateByStripeSubscriptionId(stripeSubscriptionId, {
			status: 'past_due',
		});
	}
	constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
		return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
	}
}
