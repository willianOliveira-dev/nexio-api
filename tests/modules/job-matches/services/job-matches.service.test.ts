import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resumes, UserProfiles } from '@/lib/db/schemas/index.schema.js';
import type {
	JobMatches,
	JobMatchesRepository,
} from '@/modules/job-matches/repositories/job-matches.repository.js';
import { JobMatchesService } from '@/modules/job-matches/services/job-matches.service.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	PaymentRequiredError,
} from '@/shared/errors/app.error.js';
import type { PaginatedResult } from '@/shared/types/pagination.type.js';

vi.mock('@/lib/ai/openrouter.provider.js', () => ({
	openRouterClient: {
		chat: {
			completions: { create: vi.fn() },
		},
	},
}));

vi.mock('@/shared/config/plan-limits.js', () => ({
	canUseJobMatch: vi.fn((plan: string) => plan === 'pro' || plan === 'enterprise'),
}));

vi.mock('@/shared/prompts/job-match.prompt.js', () => ({
	JOB_MATCH_SYSTEM_PROMPT: 'mock-system-prompt',
	buildJobMatchUserPrompt: vi.fn((a: string, b: string) => `${a}\n\n${b}`),
}));

import { openRouterClient } from '@/lib/ai/openrouter.provider.js';

const mockCreateCompletion = vi.mocked(openRouterClient.chat.completions.create);

function makeResume(partial: Partial<Resumes> = {}): Resumes {
	return {
		id: 'resume-id-1',
		userId: 'user-id-1',
		fileName: 'test.pdf',
		storageKey: 'test-key',
		mimeType: 'application/pdf',
		sizeBytes: 1024,
		status: 'analyzed',
		fullName: 'John Doe',
		email: 'john@example.com',
		phone: null,
		location: null,
		website: null,
		professionalSummary: null,
		rawText: 'Experienced software engineer with TypeScript and Node.js skills.',
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function makeProfile(partial: Partial<UserProfiles> = {}): UserProfiles {
	return {
		id: 'profile-id-1',
		userId: 'user-id-1',
		subscriptionId: null,
		plan: 'pro',
		currentRole: null,
		targetRole: null,
		experienceLevel: null,
		industry: null,
		skills: [],
		socialLinks: [],
		preferredLanguage: 'pt',
		targetCountry: null,
		workModel: 'any',
		willingToRelocate: false,
		writingTone: 'modern',
		careerGoals: null,
		aiCreditsUsed: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function makeJobMatch(partial: Partial<JobMatches> = {}): JobMatches {
	return {
		id: 'match-id-1',
		userId: 'user-id-1',
		resumeId: 'resume-id-1',
		jobTitle: 'Software Engineer',
		jobDescription: 'Looking for a TS developer',
		matchScore: 85,
		foundKeywords: ['typescript', 'node'],
		missingKeywords: ['react'],
		recommendations: [],
		createdAt: new Date(),
		...partial,
	};
}

function createMockJobMatchesRepository() {
	return {
		create: vi.fn(),
		findById: vi.fn(),
		findAllByUser: vi.fn(),
		findAllByResume: vi.fn(),
		delete: vi.fn(),
	};
}

function createMockResumesRepository() {
	return {
		findById: vi.fn(),
	};
}

function createMockUsersRepository() {
	return {
		findProfileByUserId: vi.fn(),
		getCreditsRemaining: vi.fn(),
		incrementCreditsUsed: vi.fn(),
	};
}

type MockJobMatchesRepo = ReturnType<typeof createMockJobMatchesRepository>;
type MockResumesRepo = ReturnType<typeof createMockResumesRepository>;
type MockUsersRepo = ReturnType<typeof createMockUsersRepository>;

describe('JobMatchesService', () => {
	let jobMatchesRepo: MockJobMatchesRepo;
	let resumesRepo: MockResumesRepo;
	let usersRepo: MockUsersRepo;
	let service: JobMatchesService;

	beforeEach(() => {
		jobMatchesRepo = createMockJobMatchesRepository();
		resumesRepo = createMockResumesRepository();
		usersRepo = createMockUsersRepository();
		service = new JobMatchesService(
			jobMatchesRepo as unknown as JobMatchesRepository,
			resumesRepo as unknown as ResumesRepository,
			usersRepo as unknown as UsersRepository,
		);
		vi.clearAllMocks();
	});

	describe('analyzeMatch', () => {
		it('cria análise de job match com sucesso', async () => {
			const resume = makeResume();
			const aiResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								matchScore: 85,
								foundKeywords: ['ts'],
								missingKeywords: ['react'],
								recommendations: [],
							}),
						},
					},
				],
			};

			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(resume);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			mockCreateCompletion.mockResolvedValue(aiResponse as never);
			jobMatchesRepo.create.mockResolvedValue(makeJobMatch());

			const result = await service.analyzeMatch('user-id-1', {
				resumeId: 'resume-id-1',
				jobTitle: 'Software Engineer',
				jobDescription: 'Need TS dev',
			});

			expect(mockCreateCompletion).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'meta-llama/llama-3.3-70b-instruct:free',
					temperature: 0.2,
					response_format: { type: 'json_object' },
				}),
			);
			expect(usersRepo.incrementCreditsUsed).toHaveBeenCalledWith('user-id-1');
			expect(result).toBeDefined();
		});

		it('lança ForbiddenError quando plano não permite job match', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'free' }));

			await expect(
				service.analyzeMatch('user-id-1', {
					resumeId: 'resume-id-1',
					jobTitle: 'Dev',
					jobDescription: 'desc',
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
		});

		it('lança NotFoundError quando resume não existe', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(null);

			await expect(
				service.analyzeMatch('user-id-1', {
					resumeId: 'non-existent',
					jobTitle: 'Dev',
					jobDescription: 'desc',
				}),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando resume não está analisado', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'processing' }));

			await expect(
				service.analyzeMatch('user-id-1', {
					resumeId: 'resume-id-1',
					jobTitle: 'Dev',
					jobDescription: 'desc',
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança BadRequestError quando resume não possui texto extraído', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume({ rawText: null }));

			await expect(
				service.analyzeMatch('user-id-1', {
					resumeId: 'resume-id-1',
					jobTitle: 'Dev',
					jobDescription: 'desc',
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança PaymentRequiredError quando créditos estão esgotados', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume());
			usersRepo.getCreditsRemaining.mockResolvedValue(0);

			await expect(
				service.analyzeMatch('user-id-1', {
					resumeId: 'resume-id-1',
					jobTitle: 'Dev',
					jobDescription: 'desc',
				}),
			).rejects.toBeInstanceOf(PaymentRequiredError);
		});

		it('lança BadRequestError quando IA não retorna resposta válida', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume());
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			mockCreateCompletion.mockResolvedValue({
				choices: [{ message: { content: null } }],
			} as never);

			await expect(
				service.analyzeMatch('user-id-1', {
					resumeId: 'resume-id-1',
					jobTitle: 'Dev',
					jobDescription: 'desc',
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});
	});

	describe('getMatch', () => {
		it('retorna job match existente', async () => {
			const match = makeJobMatch();
			jobMatchesRepo.findById.mockResolvedValue(match);

			const result = await service.getMatch('match-id-1', 'user-id-1');

			expect(result).toEqual(match);
		});

		it('lança NotFoundError quando job match não existe', async () => {
			jobMatchesRepo.findById.mockResolvedValue(null);

			await expect(service.getMatch('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('listMatches', () => {
		it('retorna lista paginada de job matches', async () => {
			const matches = [makeJobMatch(), makeJobMatch({ id: 'match-2' })];
			const paginated: PaginatedResult<JobMatches> = {
				data: matches,
				meta: { total: 2, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrevious: false },
			};

			jobMatchesRepo.findAllByUser.mockResolvedValue(paginated);

			const result = await service.listMatches('user-id-1', { page: 1, limit: 20 });

			expect(result.data).toHaveLength(2);
			expect(result.meta.total).toBe(2);
		});
	});

	describe('listMatchesByResume', () => {
		it('retorna todos os job matches de um resume', async () => {
			const matches = [makeJobMatch(), makeJobMatch({ id: 'match-2' })];

			resumesRepo.findById.mockResolvedValue(makeResume());
			jobMatchesRepo.findAllByResume.mockResolvedValue(matches);

			const result = await service.listMatchesByResume('resume-id-1', 'user-id-1');

			expect(result).toHaveLength(2);
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.listMatchesByResume('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('deleteMatch', () => {
		it('deleta job match existente', async () => {
			jobMatchesRepo.findById.mockResolvedValue(makeJobMatch());

			await service.deleteMatch('match-id-1', 'user-id-1');

			expect(jobMatchesRepo.delete).toHaveBeenCalledWith('match-id-1', 'user-id-1');
		});

		it('lança NotFoundError quando job match não existe', async () => {
			jobMatchesRepo.findById.mockResolvedValue(null);

			await expect(service.deleteMatch('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});
});
