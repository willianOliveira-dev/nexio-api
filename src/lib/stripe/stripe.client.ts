import Stripe from 'stripe';
import { env } from '@/config/env.js';
import type { UserPlan } from '@/shared/config/plan-limits.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
	apiVersion: '2026-03-25.dahlia',
	typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;

export const STRIPE_PRICE_IDS = {
	pro: env.STRIPE_PRICE_ID_PRO_MONTHLY,
	enterprise: env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
} as const;

export const PAID_PLANS = ['pro', 'enterprise'] as const satisfies ReadonlyArray<UserPlan>;

export type PaidPlan = (typeof PAID_PLANS)[number];

export function getPlanFromPriceId(priceId: string): PaidPlan | undefined {
	const entries = Object.entries(STRIPE_PRICE_IDS) as [PaidPlan, string][];
	return entries.find(([, id]) => id === priceId)?.[0];
}
