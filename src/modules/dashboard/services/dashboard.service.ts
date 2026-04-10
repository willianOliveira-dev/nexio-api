import { getAiCreditsPerMonth } from '@/shared/config/plan-limits.js';
import type { DashboardRepository } from '../repositories/dashboard.repository.js';
import type { DashboardSummaryResponse } from '../schemas/dashboard.schema.js';

function buildTrendLabel(current: number, previous: number, suffix: string): string | null {
	if (previous === 0 && current === 0) return null;
	if (previous === 0) return `+${current} ${suffix}`;
	const diff = current - previous;
	if (diff === 0) return `0 ${suffix} vs semana anterior`;
	const signal = diff > 0 ? '+' : '';
	return `${signal}${diff} ${suffix} vs semana anterior`;
}

function buildScoreTrend(current: number, previous: number): string | null {
	if (previous === 0 && current === 0) return null;
	const diff = current - previous;
	if (diff === 0) return 'sem variação vs semana anterior';
	const signal = diff > 0 ? '+' : '';
	return `${signal}${diff}% vs semana anterior`;
}

export class DashboardService {
	constructor(private readonly repository: DashboardRepository) {}

	async getSummary(userId: string): Promise<DashboardSummaryResponse> {
		const [
			resumesAnalyzedCount,
			resumesTrend,
			averageScoreVal,
			scoreTrend,
			jobsMatchedCount,
			jobsTrend,
			recentUploadsData,
			userProfile,
		] = await Promise.all([
			this.repository.getResumesAnalyzed(userId),
			this.repository.getResumesAnalyzedTrend(userId),
			this.repository.getAverageScore(userId),
			this.repository.getAverageScoreTrend(userId),
			this.repository.getJobsMatchedCount(userId),
			this.repository.getJobsMatchedTrend(userId),
			this.repository.getRecentUploads(userId, 5),
			this.repository.getUserProfile(userId),
		]);

		const recentUploads = recentUploadsData.map((d) => ({
			id: d.id,
			fileName: d.fileName,
			score: d.score,
			status: d.status,
			createdAt: d.createdAt.toISOString(),
		}));

		const planName = userProfile?.plan ?? 'free';
		const totalCreditsLimit = getAiCreditsPerMonth(planName);

		return {
			statistics: {
				resumesAnalyzed: {
					value: resumesAnalyzedCount,
					trend: buildTrendLabel(resumesTrend.current, resumesTrend.previous, 'currículos'),
				},
				averageScore: {
					value: averageScoreVal,
					trend: buildScoreTrend(scoreTrend.current, scoreTrend.previous),
				},
				jobsMatched: {
					value: jobsMatchedCount,
					trend: buildTrendLabel(jobsTrend.current, jobsTrend.previous, 'vagas'),
				},
			},
			recentUploads,
			usage: {
				aiCreditsUsed: userProfile?.aiCreditsUsed ?? 0,
				totalCreditsLimit,
				planName: userProfile?.plan ?? 'free',
			},
		};
	}
}
