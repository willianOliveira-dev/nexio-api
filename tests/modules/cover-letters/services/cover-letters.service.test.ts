import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai/openrouter.provider.js', () => ({
	openRouterClient: {
		chat: {
			completions: { create: vi.fn() },
		},
	},
}));

vi.mock('@/lib/db/connection.js', () => {
	function createChain() {
		const m: Record<string, unknown> = {};
		m.select = vi.fn(() => m);
		m.from = vi.fn(() => m);
		m.where = vi.fn(() => m);
		m.orderBy = vi.fn(() => m);
		m.limit = vi.fn().mockResolvedValue([]);
		return m;
	}
	const db = {
		select: vi.fn(() => createChain()),
	};
	return { db, schema: {} };
});

vi.mock(import('@/shared/prompts/cover-letter.prompt.js'), () => ({
	buildCoverLetterSystemPrompt: vi.fn(() => 'mock-system-prompt'),
}));

import type { Resumes, UserProfiles } from '@/lib/db/schemas/index.schema.js';
import type {
	CoverLetters,
	CoverLettersRepository,
} from '@/modules/cover-letters/repositories/cover-letters.repository.js';
import { CoverLettersService } from '@/modules/cover-letters/services/cover-letters.service.js';
import type { JobMatchesRepository } from '@/modules/job-matches/repositories/job-matches.repository.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	PaymentRequiredError,
} from '@/shared/errors/app.error.js';
import type { PaginatedResult } from '@/shared/types/pagination.type.js';

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
		professionalSummary: 'Experienced engineer',
		rawText: 'raw text',
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

function makeCoverLetter(partial: Partial<CoverLetters> = {}): CoverLetters {
	return {
		id: 'cl-id-1',
		userId: 'user-id-1',
		baseResumeId: 'resume-id-1',
		jobMatchId: null,
		title: 'Cover Letter 1',
		content: 'Dear Hiring Manager...',
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function createMockCoverLettersRepository() {
	return {
		create: vi.fn(),
		findById: vi.fn(),
		findAllByUser: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	};
}

function createMockResumesRepository() {
	return {
		findById: vi.fn(),
	};
}

function createMockJobMatchesRepository() {
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

type MockCoverLettersRepo = ReturnType<typeof createMockCoverLettersRepository>;
type MockResumesRepo = ReturnType<typeof createMockResumesRepository>;
type MockJobMatchesRepo = ReturnType<typeof createMockJobMatchesRepository>;
type MockUsersRepo = ReturnType<typeof createMockUsersRepository>;

describe('CoverLettersService', () => {
	let coverLettersRepo: MockCoverLettersRepo;
	let resumesRepo: MockResumesRepo;
	let jobMatchesRepo: MockJobMatchesRepo;
	let usersRepo: MockUsersRepo;
	let service: CoverLettersService;

	beforeEach(() => {
		coverLettersRepo = createMockCoverLettersRepository();
		resumesRepo = createMockResumesRepository();
		jobMatchesRepo = createMockJobMatchesRepository();
		usersRepo = createMockUsersRepository();
		vi.clearAllMocks();

		service = new CoverLettersService(
			coverLettersRepo as unknown as CoverLettersRepository,
			resumesRepo as unknown as ResumesRepository,
			jobMatchesRepo as unknown as JobMatchesRepository,
			usersRepo as unknown as UsersRepository,
		);
	});

	describe('generate', () => {
		it('lanca ForbiddenError quando plano e free', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'free' }));

			await expect(
				service.generate('user-id-1', {
					baseResumeId: 'resume-id-1',
					title: 'My Cover Letter',
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
		});

		it('lanca NotFoundError quando resume nao existe', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(null);

			await expect(
				service.generate('user-id-1', {
					baseResumeId: 'non-existent',
					title: 'My Cover Letter',
				}),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lanca BadRequestError quando resume nao esta analisado', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'processing' }));

			await expect(
				service.generate('user-id-1', {
					baseResumeId: 'resume-id-1',
					title: 'My Cover Letter',
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lanca NotFoundError quando job match nao existe', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume());
			jobMatchesRepo.findById.mockResolvedValue(null);

			await expect(
				service.generate('user-id-1', {
					baseResumeId: 'resume-id-1',
					jobMatchId: 'non-existent',
					title: 'My Cover Letter',
				}),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lanca PaymentRequiredError quando creditos estao esgotados', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'pro' }));
			resumesRepo.findById.mockResolvedValue(makeResume());
			usersRepo.getCreditsRemaining.mockResolvedValue(0);

			await expect(
				service.generate('user-id-1', {
					baseResumeId: 'resume-id-1',
					title: 'My Cover Letter',
				}),
			).rejects.toBeInstanceOf(PaymentRequiredError);
		});
	});

	describe('getCoverLetter', () => {
		it('retorna cover letter existente', async () => {
			const cl = makeCoverLetter();
			coverLettersRepo.findById.mockResolvedValue(cl);

			const result = await service.getCoverLetter('cl-id-1', 'user-id-1');

			expect(result).toEqual(cl);
		});

		it('lanca NotFoundError quando cover letter nao existe', async () => {
			coverLettersRepo.findById.mockResolvedValue(null);

			await expect(service.getCoverLetter('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('listCoverLetters', () => {
		it('retorna lista paginada de cover letters', async () => {
			const cls = [makeCoverLetter(), makeCoverLetter({ id: 'cl-2' })];
			const paginated: PaginatedResult<CoverLetters> = {
				data: cls,
				meta: { total: 2, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrevious: false },
			};

			coverLettersRepo.findAllByUser.mockResolvedValue(paginated);

			const result = await service.listCoverLetters('user-id-1', { page: 1, limit: 20 });

			expect(result.data).toHaveLength(2);
			expect(result.meta.total).toBe(2);
		});
	});

	describe('updateCoverLetter', () => {
		it('atualiza titulo e conteudo', async () => {
			const cl = makeCoverLetter();
			coverLettersRepo.findById.mockResolvedValue(cl);
			coverLettersRepo.update.mockResolvedValue({
				...cl,
				title: 'Updated Title',
				content: 'Updated Content',
			});

			const result = await service.updateCoverLetter('cl-id-1', 'user-id-1', {
				title: 'Updated Title',
				content: 'Updated Content',
			});

			expect(result.title).toBe('Updated Title');
		});

		it('atualiza apenas o titulo', async () => {
			const cl = makeCoverLetter();
			coverLettersRepo.findById.mockResolvedValue(cl);
			coverLettersRepo.update.mockResolvedValue({ ...cl, title: 'New Title' });

			const result = await service.updateCoverLetter('cl-id-1', 'user-id-1', {
				title: 'New Title',
			});

			expect(result.title).toBe('New Title');
		});

		it('lanca NotFoundError quando cover letter nao existe', async () => {
			coverLettersRepo.findById.mockResolvedValue(null);

			await expect(
				service.updateCoverLetter('non-existent', 'user-id-1', { title: 'New Title' }),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('deleteCoverLetter', () => {
		it('deleta cover letter existente', async () => {
			coverLettersRepo.findById.mockResolvedValue(makeCoverLetter());

			await service.deleteCoverLetter('cl-id-1', 'user-id-1');

			expect(coverLettersRepo.delete).toHaveBeenCalledWith('cl-id-1', 'user-id-1');
		});

		it('lanca NotFoundError quando cover letter nao existe', async () => {
			coverLettersRepo.findById.mockResolvedValue(null);

			await expect(service.deleteCoverLetter('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});
});
