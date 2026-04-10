import { describe, expect, it } from 'vitest';
import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';
import { calculateResumeScore } from '@/shared/utils/resume-score.util.js';

function makeContent(partial: Partial<ResumeContent> = {}): ResumeContent {
	return {
		contact: { fullName: 'John Doe', email: 'john@example.com' },
		professionalSummary: 'Experienced software engineer',
		workExperience: [
			{
				title: 'Software Engineer',
				company: 'Tech Corp',
				bullets: [
					'Increased performance by 50%',
					'Leded team of 10 developers',
					'Built REST APIs with Node.js',
				],
				startDate: '2020-01',
				endDate: '2023-12',
				isCurrent: false,
				location: 'São Paulo',
			},
		],
		education: [
			{ degree: 'BSc Computer Science', institution: 'USP', startDate: '2016', endDate: '2020' },
		],
		skills: [
			{ category: 'Languages', items: ['TypeScript', 'Python', 'Java'] },
			{ category: 'Frameworks', items: ['React', 'Express', 'NestJS'] },
		],
		languages: [{ language: 'English', proficiency: 'Fluent' }],
		projects: [],
		certifications: [],
		volunteering: [],
		...partial,
	};
}

describe('calculateResumeScore', () => {
	it('calcula score para resume completo', () => {
		const content = makeContent();
		const result = calculateResumeScore(content);

		expect(result.impact).toBeGreaterThan(40);
		expect(result.atsScore).toBe(100);
		expect(result.keywords).toBeGreaterThan(0);
		expect(result.clarity).toBe(100);
		expect(result.overall).toBeGreaterThan(0);
		expect(result.strengths.length).toBeGreaterThan(0);
	});

	it('calcula score baixo para resume vazio', () => {
		const content = makeContent({
			contact: { fullName: '', email: '' },
			workExperience: [],
			education: [],
			skills: [],
		});
		const result = calculateResumeScore(content);

		expect(result.impact).toBe(40);
		expect(result.atsScore).toBe(0);
		expect(result.keywords).toBe(0);
		expect(result.clarity).toBe(0);
	});

	it('identifica bullets quantificados como strength', () => {
		const content = makeContent();
		const result = calculateResumeScore(content);

		expect(result.strengths).toContain('Resultados quantificados nas experiências');
	});

	it('sugere adicionar métricas quando não há bullets quantificados', () => {
		const content = makeContent({
			workExperience: [
				{
					title: 'Dev',
					company: 'Corp',
					bullets: ['Desenvolveu features', 'Participou de reuniões'],
					startDate: '2020',
					endDate: '2023',
					isCurrent: false,
				},
			],
		});
		const result = calculateResumeScore(content);

		expect(result.improvements.some((i) => i.type === 'missing_metrics')).toBe(true);
	});

	it('sugere mais keywords quando há poucas habilidades', () => {
		const content = makeContent({
			skills: [{ category: 'Geral', items: ['JS'] }],
		});
		const result = calculateResumeScore(content);

		expect(result.improvements.some((i) => i.type === 'low_keywords')).toBe(true);
	});

	it('calcula overall como média ponderada', () => {
		const content = makeContent();
		const result = calculateResumeScore(content);

		const expected = Math.round(
			result.impact * 0.3 + result.atsScore * 0.3 + result.keywords * 0.25 + result.clarity * 0.15,
		);

		expect(result.overall).toBe(expected);
	});
});
