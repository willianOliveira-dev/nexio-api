import type { CreateCheckoutDto } from '../schemas/create-checkout.dto.js';
import type {
	CheckoutSessionResponse,
	CustomerPortalResponse,
	PlanResponse,
	SubscriptionResponse,
} from '../schemas/responses.schema.js';
import { SubscriptionsService } from '../services/subscriptions.service.js';

export class SubscriptionsController {
	private readonly service: SubscriptionsService;

	constructor() {
		this.service = new SubscriptionsService();
	}

	getPlans(): Promise<PlanResponse[]> {
		return this.service.getPlans();
	}

	createCheckout(
		userId: string,
		email: string,
		body: CreateCheckoutDto,
	): Promise<CheckoutSessionResponse> {
		return this.service.createCheckoutSession(
			userId,
			email,
			body.plan,
			body.successUrl,
			body.cancelUrl,
		);
	}

	getSubscription(userId: string): Promise<SubscriptionResponse> {
		return this.service.getSubscription(userId);
	}

	cancelSubscription(userId: string): Promise<void> {
		return this.service.cancelSubscription(userId);
	}

	resumeSubscription(userId: string): Promise<void> {
		return this.service.resumeSubscription(userId);
	}

	createPortalSession(userId: string): Promise<CustomerPortalResponse> {
		return this.service.createCustomerPortalSession(userId);
	}
}
