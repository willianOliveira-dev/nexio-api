import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './user.schema.js';

export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'pro', 'enterprise']);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
	'active',
	'canceled',
	'past_due',
	'trialing',
	'incomplete',
	'incomplete_expired',
	'unpaid',
]);

export const subscriptions = pgTable('subscriptions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	stripeCustomerId: text('stripe_customer_id').unique(),
	stripeSubscriptionId: text('stripe_subscription_id').unique(),
	stripePriceId: text('stripe_price_id'),
	plan: subscriptionPlanEnum('plan').default('free').notNull(),
	status: subscriptionStatusEnum('status').default('active').notNull(),
	currentPeriodStart: timestamp('current_period_start', {
		withTimezone: true,
	}),
	currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
	cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
	canceledAt: timestamp('canceled_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export type Subscriptions = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
