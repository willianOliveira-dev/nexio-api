import { PgBoss } from 'pg-boss';
import { env } from '@/config/env.js';

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
	if (!boss) {
		boss = new PgBoss({ connectionString: env.DATABASE_URL });
		await boss.start();
	}
	return boss;
}

export const RESUME_ANALYZE_JOB = 'resume:analyze' as const;
export const SCORE_RECALCULATE_JOB = 'score:recalculate' as const;

export type ResumeAnalyzeJobData = {
	resumeId: string;
	userId: string;
};

export type ScoreRecalculateJobData = {
	resumeId: string;
	userId: string;
};
