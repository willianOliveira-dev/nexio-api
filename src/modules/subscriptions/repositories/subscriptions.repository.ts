import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import type { NewSubscription, Subscriptions } from '@/lib/db/schemas/subscriptions.schema.js';
import { subscriptions } from '@/lib/db/schemas/subscriptions.schema.js';
import { userProfiles } from '@/lib/db/schemas/user-profiles.schema.js';

type ImmutableSubscriptionFields = 'id' | 'userId' | 'createdAt' | 'updatedAt';
type UpdateSubscriptionData = Partial<Omit<Subscriptions, ImmutableSubscriptionFields>>;

export class SubscriptionsRepository {
	async findByUserId(userId: string): Promise<Subscriptions | undefined> {
		const [subscription] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId));

		return subscription;
	}

	async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscriptions | undefined> {
		const [subscription] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.stripeCustomerId, stripeCustomerId));

		return subscription;
	}

	async findByStripeSubscriptionId(
		stripeSubscriptionId: string,
	): Promise<Subscriptions | undefined> {
		const [subscription] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

		return subscription;
	}

	async create(data: NewSubscription): Promise<Subscriptions> {
		const [subscription] = await db.insert(subscriptions).values(data).returning();

		if (!subscription) {
			throw new Error('Falha ao criar assinatura');
		}

		await db
			.update(userProfiles)
			.set({
				subscriptionId: subscription.id,
				plan: subscription.plan,
			})
			.where(eq(userProfiles.userId, subscription.userId));

		return subscription;
	}

	async update(userId: string, data: UpdateSubscriptionData): Promise<Subscriptions> {
		const [subscription] = await db
			.update(subscriptions)
			.set(data)
			.where(eq(subscriptions.userId, userId))
			.returning();

		if (!subscription) {
			throw new Error('Assinatura não encontrada');
		}

		if (data.plan) {
			await db.update(userProfiles).set({ plan: data.plan }).where(eq(userProfiles.userId, userId));
		}

		return subscription;
	}

	async updateByStripeSubscriptionId(
		stripeSubscriptionId: string,
		data: UpdateSubscriptionData,
	): Promise<Subscriptions> {
		const [subscription] = await db
			.update(subscriptions)
			.set(data)
			.where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
			.returning();

		if (!subscription) {
			throw new Error('Assinatura não encontrada');
		}

		if (data.plan) {
			await db
				.update(userProfiles)
				.set({ plan: data.plan })
				.where(eq(userProfiles.userId, subscription.userId));
		}

		return subscription;
	}

	async delete(userId: string): Promise<void> {
		await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
	}
}
