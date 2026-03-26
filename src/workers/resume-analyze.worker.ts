import type { WorkHandler } from 'pg-boss';
import { groq } from '@/lib/ai/groq.client.js';
import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';
import type { ResumeAnalyzeJobData } from '@/lib/queue/pg-boss.client.js';
import { getBoss, RESUME_ANALYZE_JOB } from '@/lib/queue/pg-boss.client.js';
import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { RESUME_PARSE_SYSTEM_PROMPT } from '@/shared/prompts/resume-parse.prompt.js';

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

function calculateScore(content: ResumeContent): {
	impact: number;
	atsScore: number;
	keywords: number;
	clarity: number;
	overall: number;
	strengths: string[];
	improvements: { type: string; description: string; priority: 'low' | 'medium' | 'high' }[];
	missingKeywords: string[];
} {
	const workExp = content.workExperience ?? [];
	const skills = content.skills ?? [];

	const allBullets = workExp.flatMap((w) => w.bullets);
	const quantifiedBullets = allBullets.filter((b) =>
		/\d+%|\$\d+|\d+ (people|users|clients|projects)/i.test(b),
	);
	const impact = Math.round(
		Math.min(100, 40 + (quantifiedBullets.length / Math.max(allBullets.length, 1)) * 60),
	);

	const hasContact = !!(content.contact.fullName && content.contact.email);
	const hasWorkExp = workExp.length > 0;
	const atsScore = Math.round(
		Math.min(100, (hasContact ? 40 : 0) + (hasWorkExp ? 30 : 0) + (skills.length > 0 ? 30 : 0)),
	);

	const keywordCount = skills.reduce((acc, s) => acc + s.items.length, 0);
	const keywords = Math.round(Math.min(100, keywordCount * 3));

	const hasEducation = (content.education ?? []).length > 0;
	const clarity = Math.round(
		Math.min(
			100,
			(hasContact ? 25 : 0) +
				(hasWorkExp ? 25 : 0) +
				(hasEducation ? 25 : 0) +
				(skills.length > 0 ? 25 : 0),
		),
	);

	const overall = Math.round(impact * 0.3 + atsScore * 0.3 + keywords * 0.25 + clarity * 0.15);

	const strengths: string[] = [];
	const improvements: { type: string; description: string; priority: 'low' | 'medium' | 'high' }[] =
		[];

	if (hasContact) strengths.push('Informações de contato presentes e bem formatadas');
	if (quantifiedBullets.length > 0) strengths.push('Resultados quantificados nas experiências');

	if (allBullets.length > 0 && quantifiedBullets.length === 0) {
		improvements.push({
			type: 'missing_metrics',
			description: 'Adicione resultados quantificáveis nas experiências profissionais',
			priority: 'high',
		});
	}
	if (keywordCount < 10) {
		improvements.push({
			type: 'low_keywords',
			description: 'Adicione mais palavras-chave técnicas na seção de habilidades',
			priority: 'medium',
		});
	}

	return {
		impact,
		atsScore,
		keywords,
		clarity,
		overall,
		strengths,
		improvements,
		missingKeywords: [],
	};
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
		const score = calculateScore(content);

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
