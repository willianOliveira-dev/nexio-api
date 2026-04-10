import { AiChatRepository } from '@/modules/ai-chat/repositories/ai-chat.repository.js';
import { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { CreateResumeAiDTO, FinalizeResumeAiDTO } from '../schemas/create-resume-ai.dto.js';
import { ResumeBuilderService } from '../services/resume-builder.service.js';

export class ResumeBuilderController {
	private readonly service: ResumeBuilderService;

	constructor() {
		const aiChatRepository = new AiChatRepository();
		const usersRepository = new UsersRepository();

		this.service = new ResumeBuilderService(aiChatRepository, usersRepository);
	}

	createBuilderSession(userId: string, data: CreateResumeAiDTO) {
		return this.service.createBuilderSession(userId, data);
	}

	getBuilderSession(sessionId: string, userId: string) {
		return this.service.getBuilderSession(sessionId, userId);
	}

	finalizeBuilder(sessionId: string, userId: string, data: FinalizeResumeAiDTO) {
		return this.service.finalizeBuilder(sessionId, userId, data.title);
	}
}
