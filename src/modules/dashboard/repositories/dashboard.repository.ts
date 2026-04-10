import { and, avg, count, desc, eq, gt, lte } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import { jobMatches } from '@/lib/db/schemas/job-matches.schema.js';
import { resumeScores } from '@/lib/db/schemas/resume-scores.schema.js';
import { resumes } from '@/lib/db/schemas/resumes.schema.js';
import { userProfiles } from '@/lib/db/schemas/user-profiles.schema.js';

const DAYS_WINDOW = 7;

export class DashboardRepository {
	async getResumesAnalyzed(userId: string) {
		const [result] = await db
			.select({ count: count() })
			.from(resumes)
			.where(eq(resumes.userId, userId));
		return result?.count ?? 0;
	}

	async getResumesAnalyzedTrend(userId: string) {
		const now = new Date();
		const currentStart = new Date(now.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);
		const previousStart = new Date(currentStart.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

		const [currentResult] = await db
			.select({ count: count() })
			.from(resumes)
			.where(
				and(
					eq(resumes.userId, userId),
					gt(resumes.createdAt, currentStart),
					lte(resumes.createdAt, now),
				),
			);

		const [previousResult] = await db
			.select({ count: count() })
			.from(resumes)
			.where(
				and(
					eq(resumes.userId, userId),
					gt(resumes.createdAt, previousStart),
					lte(resumes.createdAt, currentStart),
				),
			);

		const current = currentResult?.count ?? 0;
		const previous = previousResult?.count ?? 0;
		return { current, previous };
	}

	async getAverageScore(userId: string) {
		const [result] = await db
			.select({ average: avg(resumeScores.overall) })
			.from(resumeScores)
			.innerJoin(resumes, eq(resumes.id, resumeScores.resumeId))
			.where(eq(resumes.userId, userId));

		return result?.average ? Math.round(Number(result.average)) : 0;
	}

	async getAverageScoreTrend(userId: string) {
		const now = new Date();
		const currentStart = new Date(now.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);
		const previousStart = new Date(currentStart.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

		const [currentResult] = await db
			.select({ average: avg(resumeScores.overall) })
			.from(resumeScores)
			.innerJoin(resumes, eq(resumes.id, resumeScores.resumeId))
			.where(
				and(
					eq(resumes.userId, userId),
					gt(resumes.createdAt, currentStart),
					lte(resumes.createdAt, now),
				),
			);

		const [previousResult] = await db
			.select({ average: avg(resumeScores.overall) })
			.from(resumeScores)
			.innerJoin(resumes, eq(resumes.id, resumeScores.resumeId))
			.where(
				and(
					eq(resumes.userId, userId),
					gt(resumes.createdAt, previousStart),
					lte(resumes.createdAt, currentStart),
				),
			);

		const current = currentResult?.average ? Math.round(Number(currentResult.average)) : 0;
		const previous = previousResult?.average ? Math.round(Number(previousResult.average)) : 0;
		return { current, previous };
	}

	async getJobsMatchedCount(userId: string) {
		const [result] = await db
			.select({ count: count() })
			.from(jobMatches)
			.where(eq(jobMatches.userId, userId));
		return result?.count ?? 0;
	}

	async getJobsMatchedTrend(userId: string) {
		const now = new Date();
		const currentStart = new Date(now.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);
		const previousStart = new Date(currentStart.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

		const [currentResult] = await db
			.select({ count: count() })
			.from(jobMatches)
			.where(
				and(
					eq(jobMatches.userId, userId),
					gt(jobMatches.createdAt, currentStart),
					lte(jobMatches.createdAt, now),
				),
			);

		const [previousResult] = await db
			.select({ count: count() })
			.from(jobMatches)
			.where(
				and(
					eq(jobMatches.userId, userId),
					gt(jobMatches.createdAt, previousStart),
					lte(jobMatches.createdAt, currentStart),
				),
			);

		const current = currentResult?.count ?? 0;
		const previous = previousResult?.count ?? 0;
		return { current, previous };
	}

	async getRecentUploads(userId: string, limit: number = 5) {
		const recentResumes = await db
			.select({
				id: resumes.id,
				fileName: resumes.fileName,
				status: resumes.status,
				createdAt: resumes.createdAt,
				score: resumeScores.overall,
			})
			.from(resumes)
			.leftJoin(resumeScores, eq(resumes.id, resumeScores.resumeId))
			.where(eq(resumes.userId, userId))
			.orderBy(desc(resumes.createdAt))
			.limit(limit);

		return recentResumes;
	}

	async getUserProfile(userId: string) {
		const [profile] = await db
			.select({
				aiCreditsUsed: userProfiles.aiCreditsUsed,
				plan: userProfiles.plan,
			})
			.from(userProfiles)
			.where(eq(userProfiles.userId, userId));

		return profile;
	}
}
