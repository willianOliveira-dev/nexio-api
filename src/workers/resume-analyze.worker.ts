import type { WorkHandler } from 'pg-boss';
import { groq } from '@/lib/ai/groq.client.js';
import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';
import type { ResumeAnalyzeJobData } from '@/lib/queue/pg-boss.client.js';
import { getBoss, RESUME_ANALYZE_JOB } from '@/lib/queue/pg-boss.client.js';
import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { RESUME_PARSE_SYSTEM_PROMPT } from '@/shared/prompts/resume-parse.prompt.js';
import { calculateResumeScore } from '@/shared/utils/resume-score.util.js';

const repository = new ResumesRepository();

async function extractResumeContent(rawText: string): Promise<ResumeContent> {
	const completion = await groq.chat.completions.create({
		model: 'llama-3.3-70b-versatile',
		response_format: { type: 'json_object' },
		messages: [
			{
				role: 'system',
				content: RESUME_PARSE_SYSTEM_PROMPT,
			},
			{ role: 'user', content: rawText },
		],
	});

	const raw = completion.choices[0]?.message.content ?? '{}';
	return JSON.parse(raw) as ResumeContent;
}

const handle: WorkHandler<ResumeAnalyzeJobData> = async (jobs) => {
	for (const job of jobs) {
		const { resumeId, userId } = job.data;

		const resume = await repository.findById(resumeId, userId);
		if (!resume?.rawText) {
			await repository.updateStatus(resumeId, 'failed');
			continue;
		}

		const content = await extractResumeContent(resume.rawText);
		const score = calculateResumeScore(content);

		await repository.updateAnalyzedFields(resumeId, {
			status: 'analyzed',
			fullName: content.contact.fullName,
			email: content.contact.email,
			phone: content.contact.phone ?? null,
			location: content.contact.location ?? null,
			website: content.contact.website ?? null,
			professionalSummary: content.professionalSummary ?? null,
		});

		if (content.workExperience?.length) {
			await repository.upsertWorkExperiences(
				resumeId,
				content.workExperience.map((w, i) => ({
					resumeId,
					title: w.title,
					company: w.company,
					location: w.location,
					startDate: w.startDate,
					endDate: w.endDate,
					isCurrent: w.isCurrent,
					description: w.bullets.join('\n'),
					orderIndex: i,
				})),
			);
		}

		if (content.education?.length) {
			await repository.upsertEducations(
				resumeId,
				content.education.map((e, i) => ({
					resumeId,
					degree: e.degree,
					institution: e.institution,
					location: e.location,
					startDate: e.startDate,
					endDate: e.endDate,
					orderIndex: i,
				})),
			);
		}

		if (content.skills?.length) {
			await repository.upsertSkills(
				resumeId,
				content.skills.flatMap((s) =>
					s.items.map((item) => ({ resumeId, category: s.category, name: item })),
				),
			);
		}

		if (content.languages?.length) {
			await repository.upsertLanguages(
				resumeId,
				content.languages.map((l) => ({ resumeId, name: l.language, proficiency: l.proficiency })),
			);
		}

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
			type: 'analyze_resume',
			status: 'completed',
		});
	}
};

export async function startResumeAnalyzeWorker(): Promise<void> {
	const boss = await getBoss();

	boss.work<ResumeAnalyzeJobData>(RESUME_ANALYZE_JOB, async (jobs) => {
		for (const job of jobs) {
			try {
				await handle([job]);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Erro desconhecido';
				await repository.updateStatus(job.data.resumeId, 'failed');
				console.error(`[resume:analyze] job ${job.id} falhou:`, message);
			}
		}
	});

	console.info('[resume:analyze] Worker iniciado e aguardando jobs.');
}
