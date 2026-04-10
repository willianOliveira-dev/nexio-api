import type { ChatSessions, Resumes } from '@/lib/db/schemas/index.schema.js';
import type { AiChatRepository } from '@/modules/ai-chat/repositories/ai-chat.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import { getMaxResumes } from '@/shared/config/plan-limits.js';
import { BadRequestError, NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { CreateResumeAiDTO } from '../schemas/create-resume-ai.dto.js';

export class ResumeBuilderService {
	constructor(
		private readonly aiChatRepository: AiChatRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async createBuilderSession(userId: string, data: CreateResumeAiDTO): Promise<ChatSessions> {
		const profile = await this.usersRepository.findProfileByUserId(userId);
		const maxResumes = getMaxResumes(profile?.plan ?? 'free');
		const resumeCount = await this.aiChatRepository.countResumesByUser(userId);
		if (resumeCount >= maxResumes) {
			throw new BadRequestError('Limite de currículos do plano atingido');
		}

		const creditsRemaining = await this.usersRepository.getCreditsRemaining(userId);
		if (creditsRemaining <= 0) throw new PaymentRequiredError('Créditos de IA esgotados');

		let aiModelId: string | null = null;

		if (data.modelId) {
			const modelRow = await this.aiChatRepository.findModelByModelId(data.modelId);
			if (!modelRow) throw new BadRequestError('Modelo de IA inválido ou indisponível.');
			aiModelId = modelRow.id;
		} else {
			const defaultModel = await this.aiChatRepository.findDefaultModel();
			if (defaultModel) aiModelId = defaultModel.id;
		}

		return this.aiChatRepository.createSession({
			userId,
			resumeId: null,
			jobMatchId: null,
			aiModelId,
			title: 'Criador de Currículos AI',
			isBuilder: true,
			isActive: true,
		});
	}

	async finalizeBuilder(
		sessionId: string,
		userId: string,
		title: string,
	): Promise<{ resume: Resumes; session: ChatSessions }> {
		const session = await this.aiChatRepository.findSessionById(sessionId, userId);
		if (!session) throw new NotFoundError('Sessão de builder');

		if (!session.isBuilder) {
			throw new BadRequestError('Esta sessão não é uma sessão de builder.');
		}

		if (!session.isActive) {
			throw new BadRequestError('Esta sessão de builder está encerrada.');
		}

		const builderData = await this.aiChatRepository.getBuilderData(sessionId);
		if (!builderData) {
			throw new BadRequestError('Nenhum dado coletado nesta sessão de builder.');
		}

		if (!builderData.contact?.fullName || !builderData.contact?.email) {
			throw new BadRequestError('Nome completo e email são obrigatórios para finalizar.');
		}

		const hasContent =
			(builderData.workExperience ?? []).length > 0 ||
			(builderData.education ?? []).length > 0 ||
			(builderData.projects ?? []).length > 0 ||
			(builderData.skills ?? []).length > 0;

		if (!hasContent) {
			throw new BadRequestError(
				'É necessário adicionar pelo menos uma experiência, formação, projeto ou habilidade.',
			);
		}

		const resume = await this.aiChatRepository.createResumeFromBuilder(userId, title, builderData);

		await this.aiChatRepository.createAiAction({
			userId,
			sessionId,
			resumeId: resume.id,
			type: 'create_resume_ai',
			status: 'completed',
		});

		await this.aiChatRepository.closeSession(sessionId);

		await this.usersRepository.incrementCreditsUsed(userId);

		return { resume, session };
	}

	async getBuilderSession(sessionId: string, userId: string): Promise<ChatSessions> {
		const session = await this.aiChatRepository.findSessionById(sessionId, userId);
		if (!session) throw new NotFoundError('Sessão de builder');

		if (!session.isBuilder) {
			throw new BadRequestError('Esta sessão não é uma sessão de builder.');
		}

		return session;
	}
}
