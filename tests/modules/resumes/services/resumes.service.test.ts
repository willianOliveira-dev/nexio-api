import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	ResumeScores,
	Resumes,
	ResumeVersions,
	UserProfiles,
} from '@/lib/db/schemas/index.schema.js';
import * as pgBoss from '@/lib/queue/pg-boss.client.js';
import * as r2 from '@/lib/r2/r2.client.js';
import {
	FileTooLargeError,
	InvalidFileTypeError,
	InvalidStatusForReanalysisError,
	ResumeLimitReachedError,
} from '@/modules/resumes/errors/resumes.errors.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { ResumesService } from '@/modules/resumes/services/resumes.service.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import { NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { PaginatedResult } from '@/shared/types/pagination.type.js';

vi.mock('pdf-parse', () => {
	const PDFParse = vi.fn(
		class {
			getText = vi.fn().mockResolvedValue({ text: 'mocked pdf text' });
		},
	);
	return { PDFParse };
});

vi.mock('mammoth', () => ({
	default: { extractRawText: vi.fn().mockResolvedValue({ value: 'mocked docx text' }) },
}));

vi.mock('@/lib/queue/pg-boss.client.js', () => ({
	getBoss: vi.fn(),
	RESUME_ANALYZE_JOB: 'resume-analyze',
}));

vi.mock('@/lib/r2/r2.client.js', () => ({
	uploadToR2: vi.fn().mockResolvedValue(undefined),
	deleteFromR2: vi.fn().mockResolvedValue(undefined),
	getPresignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned-url'),
}));

vi.mock('@/shared/config/plan-limits.js', () => ({
	getMaxResumes: vi.fn((plan: string) => (plan === 'free' ? 3 : 50)),
}));

function makeResume(partial: Partial<Resumes> = {}): Resumes {
	return {
		id: 'resume-id-1',
		userId: 'user-id-1',
		fileName: 'test.pdf',
		storageKey: 'uploads/user-id-1/test.pdf',
		mimeType: 'application/pdf',
		sizeBytes: 1024,
		status: 'pending',
		fullName: null,
		email: null,
		phone: null,
		location: null,
		website: null,
		professionalSummary: null,
		rawText: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function makeScore(partial: Partial<ResumeScores> = {}): ResumeScores {
	return {
		id: 'score-id-1',
		resumeId: 'resume-id-1',
		resumeVersionId: null,
		overall: 75,
		impact: 70,
		atsScore: 80,
		keywords: 65,
		clarity: 85,
		strengths: [],
		improvements: [],
		missingKeywords: [],
		createdAt: new Date(),
		...partial,
	};
}

function makeProfile(partial: Partial<UserProfiles> = {}): UserProfiles {
	return {
		id: 'profile-id-1',
		userId: 'user-id-1',
		subscriptionId: null,
		plan: 'free',
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

function createMockResumesRepository() {
	return {
		create: vi.fn(),
		findById: vi.fn(),
		findAllByUser: vi.fn(),
		updateStatus: vi.fn(),
		updateAnalyzedFields: vi.fn(),
		delete: vi.fn(),
		countByUser: vi.fn(),
		createScore: vi.fn(),
		findLatestScore: vi.fn(),
		upsertWorkExperiences: vi.fn(),
		upsertEducations: vi.fn(),
		upsertSkills: vi.fn(),
		upsertLanguages: vi.fn(),
		upsertProjects: vi.fn(),
		upsertCertifications: vi.fn(),
		upsertVolunteering: vi.fn(),
		createAiAction: vi.fn(),
		findVersionsByResumeId: vi.fn(),
		findVersionById: vi.fn(),
	};
}

function createMockUsersRepository() {
	return {
		findProfileByUserId: vi.fn(),
		getCreditsRemaining: vi.fn(),
		incrementCreditsUsed: vi.fn(),
	};
}

type MockResumesRepo = ReturnType<typeof createMockResumesRepository>;
type MockUsersRepo = ReturnType<typeof createMockUsersRepository>;

function makeFile(overrides: Partial<File> = {}): File {
	return {
		name: 'test.pdf',
		type: 'application/pdf',
		size: 1024,
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
		...overrides,
	} as unknown as File;
}

describe('ResumesService', () => {
	let resumesRepo: MockResumesRepo;
	let usersRepo: MockUsersRepo;
	let service: ResumesService;

	beforeEach(() => {
		resumesRepo = createMockResumesRepository();
		usersRepo = createMockUsersRepository();
		service = new ResumesService(
			resumesRepo as unknown as ResumesRepository,
			usersRepo as unknown as UsersRepository,
		);
		vi.clearAllMocks();
		vi.mocked(pgBoss.getBoss).mockResolvedValue({
			send: vi.fn().mockResolvedValue(undefined),
		} as never);
		vi.mocked(r2.uploadToR2).mockResolvedValue(undefined);
	});

	describe('uploadResume', () => {
		it('rejeita tipo de arquivo inválido', async () => {
			const file = makeFile({ type: 'image/png' });
			await expect(service.uploadResume('user-id-1', file)).rejects.toBeInstanceOf(
				InvalidFileTypeError,
			);
		});

		it('rejeita arquivo maior que 10MB', async () => {
			const file = makeFile({ size: 11 * 1024 * 1024 });
			await expect(service.uploadResume('user-id-1', file)).rejects.toBeInstanceOf(
				FileTooLargeError,
			);
		});

		it('rejeita quando limite de resumes do plano foi atingido', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'free' }));
			resumesRepo.countByUser.mockResolvedValue(3);

			const file = makeFile();
			await expect(service.uploadResume('user-id-1', file)).rejects.toBeInstanceOf(
				ResumeLimitReachedError,
			);
		});

		it('rejeita quando créditos estão esgotados', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'free' }));
			resumesRepo.countByUser.mockResolvedValue(1);
			usersRepo.getCreditsRemaining.mockResolvedValue(0);

			const file = makeFile();
			await expect(service.uploadResume('user-id-1', file)).rejects.toBeInstanceOf(
				PaymentRequiredError,
			);
		});

		it('cria resume, faz upload para R2 e envia job para análise', async () => {
			usersRepo.findProfileByUserId.mockResolvedValue(makeProfile({ plan: 'free' }));
			resumesRepo.countByUser.mockResolvedValue(1);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			resumesRepo.create.mockResolvedValue(makeResume({ status: 'pending' }));

			const file = makeFile();
			const result = await service.uploadResume('user-id-1', file);

			expect(resumesRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-id-1',
					fileName: 'test.pdf',
					mimeType: 'application/pdf',
					status: 'processing',
				}),
			);
			expect(usersRepo.incrementCreditsUsed).toHaveBeenCalledWith('user-id-1');
			expect(result.status).toBe('pending');
		});
	});

	describe('getResume', () => {
		it('retorna resume com score', async () => {
			const resume = makeResume();
			const score = makeScore();

			resumesRepo.findById.mockResolvedValue(resume);
			resumesRepo.findLatestScore.mockResolvedValue(score);

			const result = await service.getResume('resume-id-1', 'user-id-1');

			expect(result).toEqual({ ...resume, score });
		});

		it('retorna resume com score null quando não existe score', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());
			resumesRepo.findLatestScore.mockResolvedValue(null);

			const result = await service.getResume('resume-id-1', 'user-id-1');

			expect(result.score).toBeNull();
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.getResume('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('listResumes', () => {
		it('retorna lista paginada com scores', async () => {
			const r1 = makeResume({ id: 'r1' });
			const r2 = makeResume({ id: 'r2' });
			const s1 = makeScore({ resumeId: 'r1' });
			const paginated: PaginatedResult<Resumes> = {
				data: [r1, r2],
				meta: { total: 2, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrevious: false },
			};

			resumesRepo.findAllByUser.mockResolvedValue(paginated);
			resumesRepo.findLatestScore.mockResolvedValueOnce(s1).mockResolvedValueOnce(null);

			const result = await service.listResumes(
				'user-id-1',
				{ page: 1, limit: 20 },
				{
					sortBy: 'createdAt',
					sortOrder: 'desc',
				},
			);

			expect(result.data[0]).toBeDefined();
			expect(result.data[0]!.score).toEqual(s1);
			expect(result.data[1]!.score).toBeNull();
		});
	});

	describe('deleteResume', () => {
		it('deleta resume e remove arquivo do R2', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());

			await service.deleteResume('resume-id-1', 'user-id-1');

			expect(resumesRepo.delete).toHaveBeenCalledWith('resume-id-1', 'user-id-1');
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.deleteResume('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('reAnalyze', () => {
		it('reenvia resume analisado para reanálise', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'analyzed' }));
			usersRepo.getCreditsRemaining.mockResolvedValue(10);

			await service.reAnalyze('resume-id-1', 'user-id-1');

			expect(resumesRepo.updateStatus).toHaveBeenCalledWith('resume-id-1', 'processing');
			expect(usersRepo.incrementCreditsUsed).toHaveBeenCalledWith('user-id-1');
		});

		it('reenvia resume com falha para reanálise', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'failed' }));
			usersRepo.getCreditsRemaining.mockResolvedValue(10);

			await service.reAnalyze('resume-id-1', 'user-id-1');

			expect(resumesRepo.updateStatus).toHaveBeenCalledWith('resume-id-1', 'processing');
		});

		it('lança erro quando status é inválido para reanálise', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'processing' }));

			await expect(service.reAnalyze('resume-id-1', 'user-id-1')).rejects.toBeInstanceOf(
				InvalidStatusForReanalysisError,
			);
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.reAnalyze('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		it('lança PaymentRequiredError quando créditos estão esgotados', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'analyzed' }));
			usersRepo.getCreditsRemaining.mockResolvedValue(0);

			await expect(service.reAnalyze('resume-id-1', 'user-id-1')).rejects.toBeInstanceOf(
				PaymentRequiredError,
			);
		});
	});

	describe('getScore', () => {
		it('retorna score mais recente', async () => {
			const score = makeScore();
			resumesRepo.findById.mockResolvedValue(makeResume());
			resumesRepo.findLatestScore.mockResolvedValue(score);

			const result = await service.getScore('resume-id-1', 'user-id-1');

			expect(result).toEqual(score);
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.getScore('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		it('lança NotFoundError quando score não existe', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());
			resumesRepo.findLatestScore.mockResolvedValue(null);

			await expect(service.getScore('resume-id-1', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('getDownloadUrl', () => {
		it('retorna URL pre-assinada com expiração', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());

			const result = await service.getDownloadUrl('resume-id-1', 'user-id-1');

			expect(result.url).toBe('https://r2.example.com/presigned-url');
			expect(result.expiresAt).toBeDefined();
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.getDownloadUrl('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('getVersions', () => {
		it('retorna versões paginadas do resume', async () => {
			const version = {
				id: 'v1',
				originalResumeId: 'resume-id-1',
				jobMatchId: null,
				title: 'Versão 1',
				content: {} as Record<string, unknown>,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as ResumeVersions;

			const paginated: PaginatedResult<ResumeVersions> = {
				data: [version],
				meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrevious: false },
			};

			resumesRepo.findById.mockResolvedValue(makeResume());
			resumesRepo.findVersionsByResumeId.mockResolvedValue(paginated);

			const result = await service.getVersions('resume-id-1', 'user-id-1', {
				page: 1,
				limit: 20,
			});

			expect(result.data[0]).toBeDefined();
			expect(result.data[0]!.title).toBe('Versão 1');
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(
				service.getVersions('non-existent', 'user-id-1', { page: 1, limit: 20 }),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('getVersion', () => {
		it('retorna versão específica do resume', async () => {
			const version = {
				id: 'v1',
				originalResumeId: 'resume-id-1',
				jobMatchId: null,
				title: 'Versão 1',
				content: {} as Record<string, unknown>,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as ResumeVersions;

			resumesRepo.findById.mockResolvedValue(makeResume());
			resumesRepo.findVersionById.mockResolvedValue(version);

			const result = await service.getVersion('resume-id-1', 'v1', 'user-id-1');

			expect(result).toEqual(version);
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(service.getVersion('non-existent', 'v1', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		it('lança NotFoundError quando versão não existe', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());
			resumesRepo.findVersionById.mockResolvedValue(null);

			await expect(
				service.getVersion('resume-id-1', 'non-existent', 'user-id-1'),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});
});
