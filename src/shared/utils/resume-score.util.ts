import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';

export type ScoreResult = {
	impact: number;
	atsScore: number;
	keywords: number;
	clarity: number;
	overall: number;
	strengths: string[];
	improvements: { type: string; description: string; priority: 'low' | 'medium' | 'high' }[];
	missingKeywords: string[];
};

export function calculateResumeScore(content: ResumeContent): ScoreResult {
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
