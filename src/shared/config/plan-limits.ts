export type UserPlan = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus =
	| 'active'
	| 'canceled'
	| 'past_due'
	| 'trialing'
	| 'incomplete'
	| 'incomplete_expired'
	| 'unpaid';

export type ExportFormat = 'pdf' | 'docx' | 'plain_text';

export const UNLIMITED = -1 as const;

type PlanConfig = {
	maxResumes: number;
	aiCreditsPerMonth: number;
	exportFormats: ExportFormat[];
	jobMatch: boolean;
	coverLetter: boolean;
};

const PLAN_LIMITS: Record<UserPlan, PlanConfig> = {
	free: {
		maxResumes: 3,
		aiCreditsPerMonth: 5,
		exportFormats: ['plain_text'],
		jobMatch: false,
		coverLetter: false,
	},
	pro: {
		maxResumes: 50,
		aiCreditsPerMonth: 50,
		exportFormats: ['pdf', 'docx', 'plain_text'],
		jobMatch: true,
		coverLetter: true,
	},
	enterprise: {
		maxResumes: Infinity,
		aiCreditsPerMonth: Infinity,
		exportFormats: ['pdf', 'docx', 'plain_text'],
		jobMatch: true,
		coverLetter: true,
	},
};

export function getPlanLimits(plan: UserPlan): PlanConfig {
	return PLAN_LIMITS[plan];
}

export function canUseFormat(plan: UserPlan, format: ExportFormat): boolean {
	return PLAN_LIMITS[plan].exportFormats.includes(format);
}

export function canUseJobMatch(plan: UserPlan): boolean {
	return PLAN_LIMITS[plan].jobMatch;
}

export function canUseCoverLetter(plan: UserPlan): boolean {
	return PLAN_LIMITS[plan].coverLetter;
}

export function getMaxResumes(plan: UserPlan): number {
	return PLAN_LIMITS[plan].maxResumes;
}

export function getAiCreditsPerMonth(plan: UserPlan): number {
	return PLAN_LIMITS[plan].aiCreditsPerMonth;
}

export function getMaxResumesForApi(plan: UserPlan): number {
	const v = PLAN_LIMITS[plan].maxResumes;
	return v === Infinity ? UNLIMITED : v;
}

export function getAiCreditsForApi(plan: UserPlan): number {
	const v = PLAN_LIMITS[plan].aiCreditsPerMonth;
	return v === Infinity ? UNLIMITED : v;
}
