import type Stripe from 'stripe';
import { BadRequestError, InternalServerError } from '@/shared/errors/app.error.js';
import { SubscriptionsService } from '../services/subscriptions.service.js';

export class WebhooksController {
	private readonly service: SubscriptionsService;

	constructor() {
		this.service = new SubscriptionsService();
	}

	async handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
		if (!signature) {
			throw new BadRequestError('Cabeçalho stripe-signature ausente');
		}

		let event: Stripe.Event;

		try {
			event = this.service.constructWebhookEvent(rawBody, signature);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Erro desconhecido';
			console.error(`[webhook] Falha na verificação da assinatura: ${message}`);
			throw new BadRequestError(`Assinatura do webhook inválida: ${message}`);
		}

		console.info(`[webhook] Evento recebido: ${event.type} (${event.id})`);

		try {
			await this.dispatch(event);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Erro desconhecido';
			console.error(`[webhook] Erro ao processar evento ${event.type}: ${message}`);
			throw new InternalServerError(`Erro ao processar evento do webhook: ${message}`);
		}
	}

	private async dispatch(event: Stripe.Event): Promise<void> {
		switch (event.type) {
			case 'checkout.session.completed': {
				await this.service.handleCheckoutCompleted(event.data.object);
				console.info(`[webhook] Checkout concluído: ${event.data.object.id}`);
				break;
			}

			case 'customer.subscription.updated': {
				await this.service.handleSubscriptionUpdated(event.data.object);
				console.info(`[webhook] Assinatura atualizada: ${event.data.object.id}`);
				break;
			}

			case 'customer.subscription.deleted': {
				await this.service.handleSubscriptionDeleted(event.data.object);
				console.info(`[webhook] Assinatura removida: ${event.data.object.id}`);
				break;
			}

			case 'invoice.paid': {
				await this.service.handleInvoicePaid(event.data.object);
				console.info(`[webhook] Fatura paga: ${event.data.object.id}`);
				break;
			}

			case 'invoice.payment_failed': {
				await this.service.handleInvoicePaymentFailed(event.data.object);
				console.warn(`[webhook] Falha no pagamento da fatura: ${event.data.object.id}`);
				break;
			}

			default: {
				console.info(`[webhook] Evento não tratado: ${event.type}`);
			}
		}
	}
}
