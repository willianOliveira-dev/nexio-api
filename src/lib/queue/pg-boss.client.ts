import { PgBoss } from 'pg-boss';
import { env } from '@/config/env.js';

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
	if (!boss) {
		boss = new PgBoss({ connectionString: env.DATABASE_URL });

		boss.on('error', (error: Error) => {
			console.error('[pg-boss] Erro capturado:', error.message);
		});

		boss.on('stopped', () => {
			console.warn('[pg-boss] Instância parou. Resetando referência para reconexão.');
			boss = null;
		});

		await boss.start();
		console.info('[pg-boss] Instância iniciada e pronta.');
	}
	return boss;
}

export const RESUME_ANALYZE_JOB = 'resume-analyze' as const;
export const SCORE_RECALCULATE_JOB = 'score-recalculate' as const;
export const EXPORT_GENERATE_JOB = 'export-generate' as const;
export const CREDITS_RESET_JOB = 'credits-reset' as const;

export type ResumeAnalyzeJobData = {
	resumeId: string;
	userId: string;
};

export type ScoreRecalculateJobData = {
	resumeId: string;
	userId: string;
};

export type ExportGenerateJobData = {
	exportId: string;
	userId: string;
};

export async function createQueues(): Promise<void> {
	const boss = await getBoss();

	// Cria as filas explicitamente
	await boss.createQueue(RESUME_ANALYZE_JOB);
	await boss.createQueue(EXPORT_GENERATE_JOB);
	await boss.createQueue(SCORE_RECALCULATE_JOB);
	await boss.createQueue(CREDITS_RESET_JOB);

	console.info('[pg-boss] Filas criadas com sucesso.');
}
