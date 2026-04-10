import { asc, eq } from 'drizzle-orm';
import { openRouterClient } from '@/lib/ai/openrouter.provider.js';
import { db } from '@/lib/db/connection.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { JobMatchesRepository } from '@/modules/job-matches/repositories/job-matches.repository.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	PaymentRequiredError,
} from '@/shared/errors/app.error.js';
import { buildCoverLetterSystemPrompt } from '@/shared/prompts/cover-letter.prompt.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type {
	CoverLetters,
	CoverLettersRepository,
} from '../repositories/cover-letters.repository.js';
import type { GenerateCoverLetterDTO } from '../schemas/generate-cover-letter.dto.js';
import type { UpdateCoverLetterDTO } from '../schemas/update-cover-letter.dto.js';

export class CoverLettersService {
	constructor(
		private readonly coverLettersRepository: CoverLettersRepository,
		private readonly resumesRepository: ResumesRepository,
		private readonly jobMatchesRepository: JobMatchesRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async generate(userId: string, data: GenerateCoverLetterDTO): Promise<CoverLetters> {
		const profile = await this.usersRepository.findProfileByUserId(userId);
		const plan = profile?.plan ?? 'free';

		if (plan === 'free') {
			throw new ForbiddenError('Cover Letters requer plano Pro ou superior');
		}

		const resume = await this.resumesRepository.findById(data.baseResumeId, userId);
		if (!resume) throw new NotFoundError('Resume');

		if (resume.status !== 'analyzed') {
			throw new BadRequestError(
				"O currículo precisa estar com status 'analyzed' para gerar cover letter",
			);
		}

		let jobMatch = null;
		if (data.jobMatchId) {
			jobMatch = await this.jobMatchesRepository.findById(data.jobMatchId, userId);
			if (!jobMatch) throw new NotFoundError('Job Match');
		}

		const creditsRemaining = await this.usersRepository.getCreditsRemaining(userId);
		if (creditsRemaining <= 0) throw new PaymentRequiredError('Créditos de IA esgotados');

		const [workExperiences, skills] = await Promise.all([
			db
				.select()
				.from(schema.workExperiences)
				.where(eq(schema.workExperiences.resumeId, resume.id))
				.orderBy(asc(schema.workExperiences.orderIndex))
				.limit(3),
			db.select().from(schema.skills).where(eq(schema.skills.resumeId, resume.id)),
		]);

		const contextData = {
			fullName: resume.fullName ?? '',
			professionalSummary: resume.professionalSummary ?? '',
			workExperiences: workExperiences.map((w) => ({
				title: w.title,
				company: w.company,
			})),
			skills: skills.map((s) => ({
				category: s.category ?? 'Geral',
				name: s.name,
			})),
			writingTone: profile?.writingTone ?? 'professional',
			preferredLanguage: profile?.preferredLanguage ?? 'pt-BR',
		};

		const content = await this.generateWithAi(
			jobMatch?.jobTitle && jobMatch?.jobDescription
				? {
						...contextData,
						jobTitle: jobMatch.jobTitle,
						jobDescription: jobMatch.jobDescription,
					}
				: contextData,
		);

		await this.usersRepository.incrementCreditsUsed(userId);

		return this.coverLettersRepository.create({
			userId,
			baseResumeId: data.baseResumeId,
			jobMatchId: data.jobMatchId ?? null,
			title: data.title,
			content,
		});
	}

	async getCoverLetter(id: string, userId: string): Promise<CoverLetters> {
		const coverLetter = await this.coverLettersRepository.findById(id, userId);
		if (!coverLetter) throw new NotFoundError('Cover Letter');
		return coverLetter;
	}

	async listCoverLetters(
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<CoverLetters>> {
		return this.coverLettersRepository.findAllByUser(userId, pagination);
	}

	async updateCoverLetter(
		id: string,
		userId: string,
		data: UpdateCoverLetterDTO,
	): Promise<CoverLetters> {
		const coverLetter = await this.coverLettersRepository.findById(id, userId);
		if (!coverLetter) throw new NotFoundError('Cover Letter');

		const updateData: Partial<Pick<CoverLetters, 'title' | 'content'>> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.content !== undefined) updateData.content = data.content;

		return this.coverLettersRepository.update(id, userId, updateData);
	}

	async deleteCoverLetter(id: string, userId: string): Promise<void> {
		const coverLetter = await this.coverLettersRepository.findById(id, userId);
		if (!coverLetter) throw new NotFoundError('Cover Letter');

		await this.coverLettersRepository.delete(id, userId);
	}

	private async generateWithAi(context: {
		fullName: string;
		professionalSummary: string;
		workExperiences: { title: string; company: string }[];
		skills: { category: string; name: string }[];
		jobTitle?: string;
		jobDescription?: string;
		writingTone: string;
		preferredLanguage: string;
	}): Promise<string> {
		const systemPrompt = buildCoverLetterSystemPrompt(context);

		const completion = await openRouterClient.chat.completions.create({
			model: 'meta-llama/llama-3.3-70b-instruct:free',
			temperature: 0.7,
			messages: [{ role: 'system', content: systemPrompt }],
		});

		const content = completion.choices[0]?.message?.content;

		if (!content) throw new BadRequestError('A IA não retornou uma resposta válida.');

		return content;
	}
}
