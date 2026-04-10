import { openRouterClient } from '@/lib/ai/openrouter.provider.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import { canUseJobMatch } from '@/shared/config/plan-limits.js';
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	PaymentRequiredError,
} from '@/shared/errors/app.error.js';
import {
	buildJobMatchUserPrompt,
	JOB_MATCH_SYSTEM_PROMPT,
} from '@/shared/prompts/job-match.prompt.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { JobMatches, JobMatchesRepository } from '../repositories/job-matches.repository.js';
import type { CreateJobMatchDTO } from '../schemas/create-job-match.dto.js';

type AiAnalysisResult = {
	matchScore: number;
	foundKeywords: string[];
	missingKeywords: string[];
	recommendations: { title: string; description: string; difficulty: 'easy' | 'medium' | 'hard' }[];
};

export class JobMatchesService {
	constructor(
		private readonly jobMatchesRepository: JobMatchesRepository,
		private readonly resumesRepository: ResumesRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async analyzeMatch(userId: string, data: CreateJobMatchDTO): Promise<JobMatches> {
		const profile = await this.usersRepository.findProfileByUserId(userId);
		if (!canUseJobMatch(profile?.plan ?? 'free')) {
			throw new ForbiddenError('Job Match requer plano Pro ou superior.');
		}

		const resume = await this.resumesRepository.findById(data.resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');

		if (resume.status !== 'analyzed') {
			throw new BadRequestError(
				'O currículo precisa estar com status "analyzed" para realizar a análise de vaga.',
			);
		}

		if (!resume.rawText) {
			throw new BadRequestError('O currículo não possui texto extraído para análise.');
		}

		const creditsRemaining = await this.usersRepository.getCreditsRemaining(userId);
		if (creditsRemaining <= 0) throw new PaymentRequiredError('Créditos de IA esgotados');
		await this.usersRepository.incrementCreditsUsed(userId);

		const result = await this.analyzeWithAi(resume.rawText, data.jobDescription);

		return this.jobMatchesRepository.create({
			userId,
			resumeId: data.resumeId,
			jobTitle: data.jobTitle,
			jobDescription: data.jobDescription,
			matchScore: result.matchScore,
			foundKeywords: result.foundKeywords,
			missingKeywords: result.missingKeywords,
			recommendations: result.recommendations,
		});
	}

	async getMatch(id: string, userId: string): Promise<JobMatches> {
		const match = await this.jobMatchesRepository.findById(id, userId);
		if (!match) throw new NotFoundError('Job Match');
		return match;
	}

	async listMatches(userId: string, pagination: Pagination): Promise<PaginatedResult<JobMatches>> {
		return this.jobMatchesRepository.findAllByUser(userId, pagination);
	}

	async listMatchesByResume(resumeId: string, userId: string): Promise<JobMatches[]> {
		const resume = await this.resumesRepository.findById(resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');
		return this.jobMatchesRepository.findAllByResume(resumeId, userId);
	}

	async deleteMatch(id: string, userId: string): Promise<void> {
		const match = await this.jobMatchesRepository.findById(id, userId);
		if (!match) throw new NotFoundError('Job Match');
		await this.jobMatchesRepository.delete(id, userId);
	}

	private async analyzeWithAi(rawText: string, jobDescription: string): Promise<AiAnalysisResult> {
		const completion = await openRouterClient.chat.completions.create({
			model: 'meta-llama/llama-3.3-70b-instruct:free',
			temperature: 0.2,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: JOB_MATCH_SYSTEM_PROMPT },
				{ role: 'user', content: buildJobMatchUserPrompt(rawText, jobDescription) },
			],
		});

		const content = completion.choices[0]?.message?.content;

		if (!content) throw new BadRequestError('A IA não retornou uma resposta válida.');

		const parsed = JSON.parse(content) as AiAnalysisResult;
		return parsed;
	}
}
