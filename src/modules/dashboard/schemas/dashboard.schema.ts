import { z } from '@hono/zod-openapi';

export const dashboardSummaryResponseSchema = z.object({
	statistics: z.object({
		resumesAnalyzed: z.object({
			value: z.number().int(),
			trend: z.string().nullable(),
		}),
		averageScore: z.object({
			value: z.number(),
			trend: z.string().nullable(),
		}),
		jobsMatched: z.object({
			value: z.number().int(),
			trend: z.string().nullable(),
		}),
	}),
	recentUploads: z.array(
		z.object({
			id: z.string().uuid(),
			fileName: z.string(),
			score: z.number().nullable(),
			status: z.string(),
			createdAt: z.string().datetime(),
		}),
	),
	usage: z.object({
		aiCreditsUsed: z.number().int(),
		totalCreditsLimit: z.number().int(),
		planName: z.string(),
	}),
});

export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
