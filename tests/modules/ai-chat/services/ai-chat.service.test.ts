import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resumes } from '@/lib/db/schemas/index.schema.js';
import type { JobMatches } from '@/lib/db/schemas/job-matches.schema.js';
import type { ResumeScores } from '@/lib/db/schemas/resume-scores.schema.js';
import type {
	AiChatRepository,
	AiModel,
	ChatSessions,
	Messages,
} from '@/modules/ai-chat/repositories/ai-chat.repository.js';
import { AiChatService } from '@/modules/ai-chat/services/ai-chat.service.js';
import type { JobMatchesRepository } from '@/modules/job-matches/repositories/job-matches.repository.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import { BadRequestError, NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { PaginatedResult } from '@/shared/types/pagination.type.js';

vi.mock('@/lib/ai/openrouter.provider.js', () => ({
	openRouterProvider: vi.fn(() => ({ modelId: 'mock-model' })),
}));

vi.mock('@/lib/ai/tools/web-search.tool.js', () => ({
	webSearchTool: { description: 'mock', execute: vi.fn() },
}));

vi.mock('ai', () => ({
	streamText: vi.fn(() => ({
		toTextStreamResponse: vi.fn(() => new Response(new ReadableStream())),
	})),
}));

vi.mock('@/lib/queue/pg-boss.client.js', () => ({
	getBoss: vi.fn(() => ({
		send: vi.fn().mockResolvedValue(undefined),
	})),
	SCORE_RECALCULATE_JOB: 'score-recalculate',
}));

vi.mock('@/shared/prompts/ai-chat.prompt.js', () => ({
	buildAiChatSystemPrompt: vi.fn(() => 'mock-system-prompt'),
}));

function makeModel(partial: Partial<AiModel> = {}): AiModel {
	return {
		id: 'model-id-1',
		modelId: 'google/gemma-4-31b-it:free',
		name: 'Gemma 4 31B',
		provider: 'Google',
		contextWindow: 262144,
		isDefault: true,
		isActive: true,
		supportsVision: true,
		createdAt: new Date(),
		...partial,
	};
}

function makeSession(partial: Partial<ChatSessions> = {}): ChatSessions {
	return {
		id: 'session-id-1',
		userId: 'user-id-1',
		resumeId: 'resume-id-1',
		jobMatchId: null,
		aiModelId: 'model-id-1',
		title: 'Test Session',
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function makeResume(partial: Partial<Resumes> = {}): Resumes {
	return {
		id: 'resume-id-1',
		userId: 'user-id-1',
		fileName: 'test-resume.pdf',
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
		rawText: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...partial,
	};
}

function makeMessage(partial: Partial<Messages> = {}): Messages {
	return {
		id: 'msg-id-1',
		sessionId: 'session-id-1',
		role: 'user',
		content: 'Hello',
		suggestion: null,
		attachments: null,
		createdAt: new Date(),
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

function createMockAiChatRepository() {
	return {
		createSession: vi.fn(),
		findSessionById: vi.fn(),
		findSessionsByUser: vi.fn(),
		closeSession: vi.fn(),
		createMessage: vi.fn(),
		findMessagesBySession: vi.fn(),
		findAllMessagesBySession: vi.fn(),
		createAiAction: vi.fn(),
		createResumeVersion: vi.fn(),
		findWorkExperiencesByResumeId: vi.fn(),
		findEducationsByResumeId: vi.fn(),
		findSkillsByResumeId: vi.fn(),
		findLanguagesByResumeId: vi.fn(),
		findAllResumesByUser: vi.fn(),
		findScoreByResumeId: vi.fn(),
		findAllActiveModels: vi.fn(),
		findModelById: vi.fn(),
		findModelByModelId: vi.fn(),
		findDefaultModel: vi.fn(),
	};
}

function createMockResumesRepository() {
	return {
		findById: vi.fn(),
		updateAnalyzedFields: vi.fn(),
	};
}

function createMockJobMatchesRepository() {
	return {
		findById: vi.fn(),
	};
}

function createMockUsersRepository() {
	return {
		getCreditsRemaining: vi.fn(),
		incrementCreditsUsed: vi.fn(),
	};
}

type MockAiChatRepo = ReturnType<typeof createMockAiChatRepository>;
type MockResumesRepo = ReturnType<typeof createMockResumesRepository>;
type MockJobMatchesRepo = ReturnType<typeof createMockJobMatchesRepository>;
type MockUsersRepo = ReturnType<typeof createMockUsersRepository>;

describe('AiChatService', () => {
	let aiChatRepo: MockAiChatRepo;
	let resumesRepo: MockResumesRepo;
	let jobMatchesRepo: MockJobMatchesRepo;
	let usersRepo: MockUsersRepo;
	let service: AiChatService;

	beforeEach(() => {
		aiChatRepo = createMockAiChatRepository();
		resumesRepo = createMockResumesRepository();
		jobMatchesRepo = createMockJobMatchesRepository();
		usersRepo = createMockUsersRepository();

		service = new AiChatService(
			aiChatRepo as unknown as AiChatRepository,
			resumesRepo as unknown as ResumesRepository,
			jobMatchesRepo as unknown as JobMatchesRepository,
			usersRepo as unknown as UsersRepository,
		);

		vi.clearAllMocks();
	});

	describe('createSession', () => {
		it('cria sessão quando resume existe e está analisado', async () => {
			const resume = makeResume();
			const model = makeModel();
			const session = makeSession();

			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.findModelByModelId.mockResolvedValue(model);
			aiChatRepo.createSession.mockResolvedValue(session);

			const result = await service.createSession('user-id-1', {
				resumeId: 'resume-id-1',
				modelId: 'google/gemma-4-31b-it:free',
			});

			expect(resumesRepo.findById).toHaveBeenCalledWith('resume-id-1', 'user-id-1');
			expect(aiChatRepo.findModelByModelId).toHaveBeenCalledWith('google/gemma-4-31b-it:free');
			expect(aiChatRepo.createSession).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-id-1',
					resumeId: 'resume-id-1',
					aiModelId: 'model-id-1',
					isActive: true,
				}),
			);
			expect(result).toEqual(session);
		});

		it('lança NotFoundError quando resume não existe', async () => {
			resumesRepo.findById.mockResolvedValue(null);

			await expect(
				service.createSession('user-id-1', { resumeId: 'non-existent' }),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando resume não está analisado', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume({ status: 'processing' }));

			await expect(
				service.createSession('user-id-1', { resumeId: 'resume-id-1' }),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança NotFoundError quando jobMatchId é inválido', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());
			jobMatchesRepo.findById.mockResolvedValue(null);

			await expect(
				service.createSession('user-id-1', {
					resumeId: 'resume-id-1',
					jobMatchId: 'invalid-job',
				}),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando modelId é inválido', async () => {
			resumesRepo.findById.mockResolvedValue(makeResume());
			aiChatRepo.findModelByModelId.mockResolvedValue(null);

			await expect(
				service.createSession('user-id-1', {
					resumeId: 'resume-id-1',
					modelId: 'invalid-model',
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('usa modelo padrão quando modelId não é fornecido', async () => {
			const resume = makeResume();
			const defaultModel = makeModel();
			const session = makeSession();

			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.findDefaultModel.mockResolvedValue(defaultModel);
			aiChatRepo.createSession.mockResolvedValue(session);

			await service.createSession('user-id-1', { resumeId: 'resume-id-1' });

			expect(aiChatRepo.findDefaultModel).toHaveBeenCalled();
			expect(aiChatRepo.createSession).toHaveBeenCalledWith(
				expect.objectContaining({ aiModelId: 'model-id-1' }),
			);
		});

		it('define aiModelId como null quando modelo padrão não é encontrado', async () => {
			const resume = makeResume();
			const session = makeSession({ aiModelId: null });

			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.findDefaultModel.mockResolvedValue(null);
			aiChatRepo.createSession.mockResolvedValue(session);

			await service.createSession('user-id-1', { resumeId: 'resume-id-1' });

			expect(aiChatRepo.createSession).toHaveBeenCalledWith(
				expect.objectContaining({ aiModelId: null }),
			);
		});

		it('inclui jobMatchId quando fornecido e válido', async () => {
			const resume = makeResume();
			const model = makeModel();
			const session = makeSession({ jobMatchId: 'job-match-id-1' });

			resumesRepo.findById.mockResolvedValue(resume);
			jobMatchesRepo.findById.mockResolvedValue({ id: 'job-match-id-1' } as JobMatches);
			aiChatRepo.findModelByModelId.mockResolvedValue(model);
			aiChatRepo.createSession.mockResolvedValue(session);

			const result = await service.createSession('user-id-1', {
				resumeId: 'resume-id-1',
				jobMatchId: 'job-match-id-1',
			});

			expect(aiChatRepo.createSession).toHaveBeenCalledWith(
				expect.objectContaining({ jobMatchId: 'job-match-id-1' }),
			);
			expect(result).toEqual(session);
		});
	});

	describe('getSession', () => {
		it('retorna sessão com mensagens paginadas', async () => {
			const session = makeSession();
			const messages = [makeMessage(), makeMessage({ id: 'msg-2', role: 'assistant' })];
			const paginated: PaginatedResult<Messages> = {
				data: messages,
				meta: {
					total: 2,
					page: 1,
					limit: 20,
					totalPages: 1,
					hasNext: false,
					hasPrevious: false,
				},
			};

			aiChatRepo.findSessionById.mockResolvedValue(session);
			aiChatRepo.findMessagesBySession.mockResolvedValue(paginated);

			const result = await service.getSession('session-id-1', 'user-id-1', {
				page: 1,
				limit: 20,
			});

			expect(result).toEqual({
				...session,
				messages,
				messagesMeta: paginated.meta,
			});
		});

		it('lança NotFoundError quando sessão não existe', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(null);

			await expect(
				service.getSession('non-existent', 'user-id-1', { page: 1, limit: 20 }),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('listSessions', () => {
		it('retorna sessões paginadas para o usuário', async () => {
			const sessions = [makeSession(), makeSession({ id: 'session-2' })];
			const paginated: PaginatedResult<ChatSessions> = {
				data: sessions,
				meta: {
					total: 2,
					page: 1,
					limit: 20,
					totalPages: 1,
					hasNext: false,
					hasPrevious: false,
				},
			};

			aiChatRepo.findSessionsByUser.mockResolvedValue(paginated);

			const result = await service.listSessions('user-id-1', { page: 1, limit: 20 });

			expect(result).toEqual(paginated);
			expect(aiChatRepo.findSessionsByUser).toHaveBeenCalledWith('user-id-1', {
				page: 1,
				limit: 20,
			});
		});
	});

	describe('listModels', () => {
		it('retorna todos os modelos ativos', async () => {
			const models = [
				makeModel(),
				makeModel({ id: 'model-2', modelId: 'other:model', name: 'Other', isDefault: false }),
			];
			aiChatRepo.findAllActiveModels.mockResolvedValue(models);

			const result = await service.listModels();

			expect(result).toEqual(models);
		});
	});

	describe('closeSession', () => {
		it('fecha uma sessão ativa', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(makeSession());

			await service.closeSession('session-id-1', 'user-id-1');

			expect(aiChatRepo.closeSession).toHaveBeenCalledWith('session-id-1');
		});

		it('lança NotFoundError quando sessão não existe', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(null);

			await expect(service.closeSession('non-existent', 'user-id-1')).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});
	});

	describe('applySuggestion', () => {
		it('aplica sugestão de professionalSummary e cria versão', async () => {
			const session = makeSession();
			const resume = makeResume({ professionalSummary: 'Old summary' });
			const version = {
				id: 'version-id-1',
				title: 'Versão antes da sugestão AI',
				createdAt: new Date(),
			};

			aiChatRepo.findSessionById.mockResolvedValue(session);
			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.createResumeVersion.mockResolvedValue(version);

			const result = await service.applySuggestion('session-id-1', 'user-id-1', {
				messageId: 'msg-id-1',
				suggestion: {
					section: 'professionalSummary',
					original: 'Old summary',
					suggested: 'New improved summary',
				},
			});

			expect(aiChatRepo.createResumeVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					originalResumeId: 'resume-id-1',
					title: 'Versão antes da sugestão AI',
				}),
			);
			expect(resumesRepo.updateAnalyzedFields).toHaveBeenCalledWith('resume-id-1', {
				professionalSummary: 'New improved summary',
			});
			expect(result.resume.updatedField).toBe('professionalSummary');
			expect(result.resume.updatedValue).toBe('New improved summary');
		});

		it('aplica sugestão de campo de contato', async () => {
			const session = makeSession();
			const resume = makeResume();
			const version = {
				id: 'version-id-1',
				title: 'Versão antes da sugestão AI',
				createdAt: new Date(),
			};

			aiChatRepo.findSessionById.mockResolvedValue(session);
			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.createResumeVersion.mockResolvedValue(version);

			await service.applySuggestion('session-id-1', 'user-id-1', {
				messageId: 'msg-id-1',
				suggestion: {
					section: 'contact.fullName',
					original: 'John Doe',
					suggested: 'John A. Doe',
				},
			});

			expect(resumesRepo.updateAnalyzedFields).toHaveBeenCalledWith('resume-id-1', {
				fullName: 'John A. Doe',
			});
		});

		it('usa professionalSummary para seções desconhecidas', async () => {
			const session = makeSession();
			const resume = makeResume();
			const version = {
				id: 'version-id-1',
				title: 'Versão antes da sugestão AI',
				createdAt: new Date(),
			};

			aiChatRepo.findSessionById.mockResolvedValue(session);
			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.createResumeVersion.mockResolvedValue(version);

			await service.applySuggestion('session-id-1', 'user-id-1', {
				messageId: 'msg-id-1',
				suggestion: { section: 'unknownSection', suggested: 'Some value' },
			});

			expect(resumesRepo.updateAnalyzedFields).toHaveBeenCalledWith('resume-id-1', {
				professionalSummary: 'Some value',
			});
		});

		it('rejeita nomes de campo de contato inválidos', async () => {
			const session = makeSession();
			const resume = makeResume();
			const version = {
				id: 'version-id-1',
				title: 'Versão antes da sugestão AI',
				createdAt: new Date(),
			};

			aiChatRepo.findSessionById.mockResolvedValue(session);
			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.createResumeVersion.mockResolvedValue(version);

			await service.applySuggestion('session-id-1', 'user-id-1', {
				messageId: 'msg-id-1',
				suggestion: { section: 'contact.invalidField', suggested: 'value' },
			});

			// Campo inválido → fallback para professionalSummary
			expect(resumesRepo.updateAnalyzedFields).toHaveBeenCalledWith('resume-id-1', {
				professionalSummary: 'value',
			});
		});

		it('lança NotFoundError quando sessão não existe', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(null);

			await expect(
				service.applySuggestion('non-existent', 'user-id-1', {
					messageId: 'msg-id-1',
					suggestion: { section: 'professionalSummary', suggested: 'value' },
				}),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando sessão não tem resume', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(makeSession({ resumeId: null }));

			await expect(
				service.applySuggestion('session-id-1', 'user-id-1', {
					messageId: 'msg-id-1',
					suggestion: { section: 'professionalSummary', suggested: 'value' },
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança NotFoundError quando resume associado não existe', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(makeSession());
			resumesRepo.findById.mockResolvedValue(null);

			await expect(
				service.applySuggestion('session-id-1', 'user-id-1', {
					messageId: 'msg-id-1',
					suggestion: { section: 'professionalSummary', suggested: 'value' },
				}),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('sendMessageStream', () => {
		it('lança NotFoundError quando sessão não existe', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(null);

			await expect(
				service.sendMessageStream('non-existent', 'user-id-1', 'Hello'),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando sessão não está ativa', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(makeSession({ isActive: false }));

			await expect(
				service.sendMessageStream('session-id-1', 'user-id-1', 'Hello'),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('lança PaymentRequiredError quando créditos estão esgotados', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(makeSession());
			usersRepo.getCreditsRemaining.mockResolvedValue(0);

			await expect(
				service.sendMessageStream('session-id-1', 'user-id-1', 'Hello'),
			).rejects.toBeInstanceOf(PaymentRequiredError);
		});

		it('lança NotFoundError quando modelo não é encontrado', async () => {
			aiChatRepo.findSessionById.mockResolvedValue(makeSession({ aiModelId: null }));
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findDefaultModel.mockResolvedValue(null);

			await expect(
				service.sendMessageStream('session-id-1', 'user-id-1', 'Hello'),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lança BadRequestError quando modelo não suporta visão e imagem é anexada', async () => {
			const session = makeSession();
			const model = makeModel({ supportsVision: false });

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findModelById.mockResolvedValue(model);

			await expect(
				service.sendMessageStream('session-id-1', 'user-id-1', 'Hello', [
					{ type: 'image', mimeType: 'image/png', base64: 'data:image/png;base64,abc' },
				]),
			).rejects.toBeInstanceOf(BadRequestError);
		});

		it('remove base64 dos anexos antes de salvar no DB', async () => {
			const session = makeSession();
			const model = makeModel();

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findModelById.mockResolvedValue(model);
			aiChatRepo.createMessage.mockResolvedValue(makeMessage());
			aiChatRepo.findAllMessagesBySession.mockResolvedValue([]);

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello', [
				{
					type: 'image',
					mimeType: 'image/png',
					base64: 'data:image/png;base64,abc',
					name: 'test.png',
				},
			]);

			expect(aiChatRepo.createMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					sessionId: 'session-id-1',
					role: 'user',
					content: 'Hello',
					attachments: [{ type: 'image', mimeType: 'image/png', name: 'test.png' }],
				}),
			);
		});

		it('preserva anexos com URL sem modificação', async () => {
			const session = makeSession();
			const model = makeModel();

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findModelById.mockResolvedValue(model);
			aiChatRepo.createMessage.mockResolvedValue(makeMessage());
			aiChatRepo.findAllMessagesBySession.mockResolvedValue([]);

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello', [
				{
					type: 'document',
					mimeType: 'application/pdf',
					url: 'https://example.com/resume.pdf',
				},
			]);

			expect(aiChatRepo.createMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						{
							type: 'document',
							mimeType: 'application/pdf',
							url: 'https://example.com/resume.pdf',
						},
					],
				}),
			);
		});

		it('usa modelo do session.aiModelId quando disponível', async () => {
			const session = makeSession({ aiModelId: 'model-id-1' });
			const model = makeModel();

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findModelById.mockResolvedValue(model);
			aiChatRepo.createMessage.mockResolvedValue(makeMessage());
			aiChatRepo.findAllMessagesBySession.mockResolvedValue([]);

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello');

			expect(aiChatRepo.findModelById).toHaveBeenCalledWith('model-id-1');
			expect(aiChatRepo.findDefaultModel).not.toHaveBeenCalled();
		});

		it('usa modelo padrão quando session.aiModelId é null', async () => {
			const session = makeSession({ aiModelId: null });
			const model = makeModel();

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findDefaultModel.mockResolvedValue(model);
			aiChatRepo.createMessage.mockResolvedValue(makeMessage());
			aiChatRepo.findAllMessagesBySession.mockResolvedValue([]);

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello');

			expect(aiChatRepo.findDefaultModel).toHaveBeenCalled();
		});
	});

	// ── sendMessageStream: buildSystemPrompt integration ──────────────────
	describe('sendMessageStream → buildSystemPrompt', () => {
		function setupMessageFlow() {
			const session = makeSession();
			const resume = makeResume();
			const model = makeModel();

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findModelById.mockResolvedValue(model);
			aiChatRepo.createMessage.mockResolvedValue(makeMessage());
			aiChatRepo.findAllMessagesBySession.mockResolvedValue([]);
			resumesRepo.findById.mockResolvedValue(resume);
			aiChatRepo.findWorkExperiencesByResumeId.mockResolvedValue([]);
			aiChatRepo.findEducationsByResumeId.mockResolvedValue([]);
			aiChatRepo.findSkillsByResumeId.mockResolvedValue([]);
			aiChatRepo.findLanguagesByResumeId.mockResolvedValue([]);
			aiChatRepo.findAllResumesByUser.mockResolvedValue([resume]);
			aiChatRepo.findScoreByResumeId.mockResolvedValue(null);

			return { session, resume, model };
		}

		it('busca score e dados do resume ao construir prompt', async () => {
			const score = makeScore({
				improvements: [{ type: 'grammar', description: 'Fix typos', priority: 'high' }],
				missingKeywords: ['typescript', 'react'],
			});
			aiChatRepo.findScoreByResumeId.mockResolvedValue(score);
			setupMessageFlow();

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello');

			expect(aiChatRepo.findScoreByResumeId).toHaveBeenCalledWith('resume-id-1');
		});

		it('inclui contexto de job match quando sessão tem jobMatchId', async () => {
			const { session, model } = setupMessageFlow();
			aiChatRepo.findSessionById.mockResolvedValue(
				makeSession({ ...session, jobMatchId: 'job-match-id-1' }),
			);
			aiChatRepo.findModelById.mockResolvedValue(model);

			const jobMatch = {
				id: 'job-match-id-1',
				userId: 'user-id-1',
				resumeId: 'resume-id-1',
				jobTitle: 'Software Engineer',
				jobDescription: 'We need a senior dev',
				matchScore: 85,
				foundKeywords: ['typescript', 'node'],
				missingKeywords: ['docker', 'aws'],
				recommendations: [
					{
						title: 'Add Docker exp',
						description: 'Include container projects',
						difficulty: 'medium',
					},
				],
				createdAt: new Date(),
			} as JobMatches;

			jobMatchesRepo.findById.mockResolvedValue(jobMatch);

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello');

			expect(jobMatchesRepo.findById).toHaveBeenCalledWith('job-match-id-1', 'user-id-1');
		});

		it('busca scores de outros resumes quando usuário tem múltiplos', async () => {
			const resume1 = makeResume({ id: 'resume-1' });
			const resume2 = makeResume({ id: 'resume-2', fileName: 'resume-v2.pdf' });
			const session = makeSession();
			const model = makeModel();

			aiChatRepo.findSessionById.mockResolvedValue(session);
			usersRepo.getCreditsRemaining.mockResolvedValue(10);
			aiChatRepo.findModelById.mockResolvedValue(model);
			aiChatRepo.createMessage.mockResolvedValue(makeMessage());
			aiChatRepo.findAllMessagesBySession.mockResolvedValue([]);
			resumesRepo.findById.mockResolvedValue(resume1);
			aiChatRepo.findWorkExperiencesByResumeId.mockResolvedValue([]);
			aiChatRepo.findEducationsByResumeId.mockResolvedValue([]);
			aiChatRepo.findSkillsByResumeId.mockResolvedValue([]);
			aiChatRepo.findLanguagesByResumeId.mockResolvedValue([]);
			aiChatRepo.findAllResumesByUser.mockResolvedValue([resume1, resume2]);
			aiChatRepo.findScoreByResumeId.mockResolvedValue(null);

			await service.sendMessageStream('session-id-1', 'user-id-1', 'Hello');

			expect(aiChatRepo.findScoreByResumeId).toHaveBeenCalledWith('resume-2');
		});
	});
});
