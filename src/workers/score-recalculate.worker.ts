import type { WorkHandler } from 'pg-boss';
import { groq } from '@/lib/ai/groq.client.js';
import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';
import type { ScoreRecalculateJobData } from '@/lib/queue/pg-boss.client.js';
import { getBoss, SCORE_RECALCULATE_JOB } from '@/lib/queue/pg-boss.client.js';
import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { RESUME_PARSE_SYSTEM_PROMPT } from '@/shared/prompts/resume-parse.prompt.js';
import { calculateResumeScore } from '@/shared/utils/resume-score.util.js';

const repository = new ResumesRepository();

const handle: WorkHandler<ScoreRecalculateJobData> = async (jobs) => {
	for (const job of jobs) {
		const { resumeId, userId } = job.data;

		const resume = await repository.findById(resumeId, userId);
		if (!resume?.rawText) {
			console.warn(`[score-recalculate] Resume ${resumeId} não encontrado ou sem rawText.`);
			continue;
		}

		const completion = await groq.chat.completions.create({
			model: 'llama-3.3-70b-versatile',
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: RESUME_PARSE_SYSTEM_PROMPT },
				{ role: 'user', content: resume.rawText },
			],
		});

		const raw = completion.choices[0]?.message.content ?? '{}';
		const content = JSON.parse(raw) as ResumeContent;
		const score = calculateResumeScore(content);

		await repository.createScore({
			resumeId,
			overall: score.overall,
			impact: score.impact,
			atsScore: score.atsScore,
			keywords: score.keywords,
			clarity: score.clarity,
			strengths: score.strengths,
			improvements: score.improvements,
			missingKeywords: score.missingKeywords,
		});

		await repository.createAiAction({
			userId,
			resumeId,
			type: 'score_resume',
			status: 'completed',
		});

		console.info(`[score-recalculate] Score recalculado p/ resume ${resumeId}.`);
	}
};

export async function startScoreRecalculateWorker(): Promise<void> {
	const boss = await getBoss();

	boss.work<ScoreRecalculateJobData>(SCORE_RECALCULATE_JOB, async (jobs) => {
		for (const job of jobs) {
			try {
				await handle([job]);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Erro desconhecido';
				console.error(`[score-recalculate] job ${job.id} falhou:`, message);
			}
		}
	});

	console.info('[score-recalculate] Worker iniciado e aguardando jobs.');
}
