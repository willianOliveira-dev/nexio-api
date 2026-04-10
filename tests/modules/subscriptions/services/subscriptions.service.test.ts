import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Subscriptions } from '@/lib/db/schemas/subscriptions.schema.js';
import { SubscriptionsRepository } from '@/modules/subscriptions/repositories/subscriptions.repository.js';
import { SubscriptionsService } from '@/modules/subscriptions/services/subscriptions.service.js';
import { BadRequestError, NotFoundError } from '@/shared/errors/app.error.js';

vi.mock('@/config/env.js', () => ({
	env: {
		STRIPE_SECRET_KEY: 'sk_test_mock',
		STRIPE_WEBHOOK_SECRET: 'whsec_test',
		FRONTEND_URL: 'https://app.nexio.io',
	},
}));

vi.mock('@/lib/stripe/stripe.client.js', () => ({
	stripe: {
		prices: { retrieve: vi.fn() },
		customers: { create: vi.fn() },
		checkout: { sessions: { create: vi.fn() } },
		subscriptions: { retrieve: vi.fn(), update: vi.fn() },
		billingPortal: { sessions: { create: vi.fn() } },
		webhooks: { constructEvent: vi.fn() },
	},
	STRIPE_WEBHOOK_SECRET: 'whsec_test',
	STRIPE_PRICE_IDS: { pro: 'price_pro', enterprise: 'price_ent' },
	getPlanFromPriceId: vi.fn((id: string) => (id === 'price_pro' ? 'pro' : 'enterprise')),
}));

import { stripe } from '@/lib/stripe/stripe.client.js';

const mockPricesRetrieve = vi.mocked(stripe.prices.retrieve) as ReturnType<typeof vi.fn>;
const mockCustomersCreate = vi.mocked(stripe.customers.create) as ReturnType<typeof vi.fn>;
const mockCheckoutCreate = vi.mocked(stripe.checkout.sessions.create) as ReturnType<typeof vi.fn>;
const mockSubscriptionsRetrieve = vi.mocked(stripe.subscriptions.retrieve) as ReturnType<
	typeof vi.fn
>;
const mockSubscriptionsUpdate = vi.mocked(stripe.subscriptions.update) as ReturnType<typeof vi.fn>;
const mockBillingPortalCreate = vi.mocked(stripe.billingPortal.sessions.create) as ReturnType<
	typeof vi.fn
>;
const mockWebhooksConstruct = vi.mocked(stripe.webhooks.constructEvent) as ReturnType<typeof vi.fn>;

function makeSubscription(partial: Partial<Subscriptions> = {}): Subscriptions {
	return {
		id: 'sub-id-1',
		userId: 'user-id-1',
		stripeCustomerId: 'cus_test',
		stripeSubscriptionId: 'sub_stripe_1',
		stripePriceId: 'price_pro',
		plan: 'pro',
		status: 'active',
		currentPeriodStart: new Date(),
		currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		cancelAtPeriodEnd: false,
		canceledAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function createMockRepository() {
	return {
		findByUserId: vi.fn(),
		findByStripeCustomerId: vi.fn(),
		findByStripeSubscriptionId: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		updateByStripeSubscriptionId: vi.fn(),
		delete: vi.fn(),
	};
}

type MockRepo = ReturnType<typeof createMockRepository>;

describe('SubscriptionsService', () => {
	let repo: MockRepo;
	let service: SubscriptionsService;

	beforeEach(() => {
		repo = createMockRepository();
		vi.clearAllMocks();

		vi.spyOn(SubscriptionsRepository.prototype, 'findByUserId').mockImplementation(
			async (...args) => repo.findByUserId(...args),
		);
		vi.spyOn(SubscriptionsRepository.prototype, 'create').mockImplementation(async (...args) =>
			repo.create(...args),
		);
		vi.spyOn(SubscriptionsRepository.prototype, 'update').mockImplementation(async (...args) =>
			repo.update(...args),
		);
		vi.spyOn(SubscriptionsRepository.prototype, 'updateByStripeSubscriptionId').mockImplementation(
			async (...args) => repo.updateByStripeSubscriptionId(...args),
		);

		service = new SubscriptionsService();
	});

	describe('getPlans', () => {
		it('retorna os 3 planos com features e limits corretos', async () => {
			mockPricesRetrieve
				.mockResolvedValueOnce({
					unit_amount: 2990,
					currency: 'BRL',
				} as unknown as Stripe.Price & { lastResponse: unknown })
				.mockResolvedValueOnce({
					unit_amount: 9990,
					currency: 'BRL',
				} as unknown as Stripe.Price & { lastResponse: unknown });

			const plans = await service.getPlans();

			const freePlan = plans[0];
			const proPlan = plans[1];
			const entPlan = plans[2];

			expect(freePlan).toBeDefined();
			expect(freePlan?.id).toBe('free');
			expect(freePlan?.price).toBe(0);
			expect(proPlan?.id).toBe('pro');
			expect(entPlan?.id).toBe('enterprise');
			expect(freePlan?.features).toHaveLength(3);
			expect(proPlan?.features.length).toBeGreaterThanOrEqual(3);
			expect(entPlan?.features.length).toBeGreaterThanOrEqual(5);
		});
	});

	describe('createCheckoutSession', () => {
		it('cria sessão de checkout para plano pro', async () => {
			repo.findByUserId.mockResolvedValue(undefined);
			mockCustomersCreate.mockResolvedValue({ id: 'cus_new' } as unknown as Stripe.Customer);
			mockCheckoutCreate.mockResolvedValue({
				id: 'cs_session',
				url: 'https://checkout.stripe.com/cs_session',
			} as unknown as Stripe.Checkout.Session);

			const result = await service.createCheckoutSession('user-id-1', 'user@email.com', 'pro');

			expect(mockCustomersCreate).toHaveBeenCalledWith(
				expect.objectContaining({ email: 'user@email.com' }),
			);
			expect(repo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-id-1',
					stripeCustomerId: 'cus_new',
					plan: 'free',
				}),
			);
			expect(result.sessionId).toBe('cs_session');
		});

		it('reutiliza stripeCustomerId quando assinatura já existe', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription());
			mockCheckoutCreate.mockResolvedValue({
				id: 'cs_existing',
				url: 'https://checkout.stripe.com/cs_existing',
			} as unknown as Stripe.Checkout.Session);

			const result = await service.createCheckoutSession('user-id-1', 'user@email.com', 'pro');

			expect(mockCustomersCreate).not.toHaveBeenCalled();
			expect(result.sessionId).toBe('cs_existing');
		});

		it('lança BadRequestError quando Stripe não retorna URL', async () => {
			repo.findByUserId.mockResolvedValue(undefined);
			mockCustomersCreate.mockResolvedValue({ id: 'cus_new' } as unknown as Stripe.Customer);
			mockCheckoutCreate.mockResolvedValue({
				id: 'cs_fail',
				url: null,
			} as unknown as Stripe.Checkout.Session);

			await expect(
				service.createCheckoutSession('user-id-1', 'user@email.com', 'pro'),
			).rejects.toBeInstanceOf(BadRequestError);
		});
	});

	describe('getSubscription', () => {
		it('retorna assinatura do usuário', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription());

			const result = await service.getSubscription('user-id-1');

			expect(result.plan).toBe('pro');
			expect(result.status).toBe('active');
		});

		it('lança NotFoundError quando assinatura não existe', async () => {
			repo.findByUserId.mockResolvedValue(undefined);

			await expect(service.getSubscription('user-id-1')).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('cancelSubscription', () => {
		it('agenda cancelamento no final do período', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription());
			mockSubscriptionsUpdate.mockResolvedValue({
				id: 'sub_stripe_1',
			} as unknown as Stripe.Subscription);

			await service.cancelSubscription('user-id-1');

			expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_stripe_1', {
				cancel_at_period_end: true,
			});
			expect(repo.update).toHaveBeenCalledWith('user-id-1', { cancelAtPeriodEnd: true });
		});

		it('lança NotFoundError quando assinatura não existe', async () => {
			repo.findByUserId.mockResolvedValue(undefined);

			await expect(service.cancelSubscription('user-id-1')).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando não há assinatura paga', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription({ stripeSubscriptionId: null }));

			await expect(service.cancelSubscription('user-id-1')).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança BadRequestError quando já está agendada para cancelar', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: true }));

			await expect(service.cancelSubscription('user-id-1')).rejects.toBeInstanceOf(BadRequestError);
		});
	});

	describe('resumeSubscription', () => {
		it('reativa assinatura agendada para cancelamento', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: true }));
			mockSubscriptionsUpdate.mockResolvedValue({
				id: 'sub_stripe_1',
			} as unknown as Stripe.Subscription);

			await service.resumeSubscription('user-id-1');

			expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_stripe_1', {
				cancel_at_period_end: false,
			});
			expect(repo.update).toHaveBeenCalledWith('user-id-1', {
				cancelAtPeriodEnd: false,
				canceledAt: null,
			});
		});

		it('lança BadRequestError quando assinatura não está agendada para cancelar', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: false }));

			await expect(service.resumeSubscription('user-id-1')).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança NotFoundError quando assinatura não existe', async () => {
			repo.findByUserId.mockResolvedValue(undefined);

			await expect(service.resumeSubscription('user-id-1')).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('createCustomerPortalSession', () => {
		it('cria sessÃ£o do portal do cliente', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription());
			mockBillingPortalCreate.mockResolvedValue({
				url: 'https://billing.stripe.com/portal',
			} as unknown as Stripe.BillingPortal.Session);

			const result = await service.createCustomerPortalSession('user-id-1');

			expect(result.url).toBe('https://billing.stripe.com/portal');
		});

		it('lança NotFoundError quando stripeCustomerId não existe', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription({ stripeCustomerId: null }));

			await expect(service.createCustomerPortalSession('user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		it('lança NotFoundError quando assinatura não existe', async () => {
			repo.findByUserId.mockResolvedValue(undefined);

			await expect(service.createCustomerPortalSession('user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('handleCheckoutCompleted', () => {
		it('atualiza assinatura após checkout completo', async () => {
			repo.findByUserId.mockResolvedValue(makeSubscription());
			mockSubscriptionsRetrieve.mockResolvedValue({
				id: 'sub_stripe_new',
				status: 'active',
				items: { data: [{ price: { id: 'price_pro' } }] },
				cancel_at_period_end: false,
				latest_invoice: {
					period_start: Math.floor(Date.now() / 1000),
					period_end: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60),
				},
			} as unknown as Stripe.Subscription);

			await service.handleCheckoutCompleted({
				metadata: { userId: 'user-id-1', plan: 'pro' },
				subscription: 'sub_stripe_new',
			} as unknown as Stripe.Checkout.Session);

			expect(repo.update).toHaveBeenCalledWith(
				'user-id-1',
				expect.objectContaining({
					plan: 'pro',
					status: 'active',
					cancelAtPeriodEnd: false,
				}),
			);
		});

		it('ignora quando metadata está faltando userId', async () => {
			await service.handleCheckoutCompleted({
				metadata: { plan: 'pro' },
				subscription: 'sub_stripe_new',
			} as unknown as Stripe.Checkout.Session);

			expect(repo.update).not.toHaveBeenCalled();
		});

		it('ignora quando metadata está faltando plan', async () => {
			await service.handleCheckoutCompleted({
				metadata: { userId: 'user-id-1' },
				subscription: 'sub_stripe_new',
			} as unknown as Stripe.Checkout.Session);

			expect(repo.update).not.toHaveBeenCalled();
		});

		it('ignora quando não há subscription ID', async () => {
			await service.handleCheckoutCompleted({
				metadata: { userId: 'user-id-1', plan: 'pro' },
				subscription: null,
			} as unknown as unknown as Stripe.Checkout.Session);

			expect(repo.update).not.toHaveBeenCalled();
		});
	});

	describe('handleSubscriptionUpdated', () => {
		it('atualiza status e período da assinatura', async () => {
			mockSubscriptionsRetrieve.mockResolvedValue({
				id: 'sub_stripe_1',
				status: 'active',
				items: { data: [{ price: { id: 'price_pro' } }] },
				cancel_at_period_end: false,
				latest_invoice: null,
			} as unknown as Stripe.Subscription);

			await service.handleSubscriptionUpdated('sub_stripe_1');

			expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith(
				'sub_stripe_1',
				expect.objectContaining({
					status: 'active',
					cancelAtPeriodEnd: false,
				}),
			);
		});
	});

	describe('handleSubscriptionDeleted', () => {
		it('marca assinatura como cancelada e volta para free', async () => {
			await service.handleSubscriptionDeleted({
				id: 'sub_stripe_1',
			} as unknown as Stripe.Subscription);

			expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith('sub_stripe_1', {
				status: 'canceled',
				plan: 'free',
				canceledAt: expect.any(Date),
				cancelAtPeriodEnd: false,
			});
		});
	});

	describe('handleInvoicePaid', () => {
		it('marca assinatura como ativa', async () => {
			await service.handleInvoicePaid({
				parent: {
					type: 'subscription_details',
					subscription_details: { subscription: 'sub_stripe_1' },
				},
			} as unknown as unknown as Stripe.Invoice);

			expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith('sub_stripe_1', {
				status: 'active',
			});
		});

		it('ignora quando não há subscription reference', async () => {
			await service.handleInvoicePaid({ parent: null } as unknown as unknown as Stripe.Invoice);

			expect(repo.updateByStripeSubscriptionId).not.toHaveBeenCalled();
		});
	});

	describe('handleInvoicePaymentFailed', () => {
		it('marca assinatura como past_due', async () => {
			await service.handleInvoicePaymentFailed({
				parent: {
					type: 'subscription_details',
					subscription_details: { subscription: 'sub_stripe_1' },
				},
			} as unknown as unknown as Stripe.Invoice);

			expect(repo.updateByStripeSubscriptionId).toHaveBeenCalledWith('sub_stripe_1', {
				status: 'past_due',
			});
		});
	});

	describe('constructWebhookEvent', () => {
		it('constrói evento Stripe do raw body e signature', () => {
			const mockEvent = {
				type: 'checkout.session.completed',
				id: 'evt_1',
			} as unknown as Stripe.Event;
			mockWebhooksConstruct.mockReturnValue(mockEvent);

			const event = service.constructWebhookEvent('raw-body', 'sig_test');

			expect(mockWebhooksConstruct).toHaveBeenCalledWith('raw-body', 'sig_test', 'whsec_test');
			expect(event).toEqual(mockEvent);
		});
	});
});
