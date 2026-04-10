import { JobMatchesRepository } from '@/modules/job-matches/repositories/job-matches.repository.js';
import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { AiModel, ChatSessions } from '../repositories/ai-chat.repository.js';
import { AiChatRepository } from '../repositories/ai-chat.repository.js';
import type { ApplySuggestionDTO } from '../schemas/apply-suggestion.dto.js';
import type { CreateSessionDTO } from '../schemas/create-session.dto.js';
import type { SendMessageDTO } from '../schemas/send-message.dto.js';
import { AiChatService } from '../services/ai-chat.service.js';

export class AiChatController {
	private readonly service: AiChatService;

	constructor() {
		this.service = new AiChatService(
			new AiChatRepository(),
			new ResumesRepository(),
			new JobMatchesRepository(),
			new UsersRepository(),
		);
	}

	createSession(userId: string, data: CreateSessionDTO): Promise<ChatSessions> {
		return this.service.createSession(userId, data);
	}

	getSession(id: string, userId: string, pagination: Pagination) {
		return this.service.getSession(id, userId, pagination);
	}

	listSessions(userId: string, pagination: Pagination): Promise<PaginatedResult<ChatSessions>> {
		return this.service.listSessions(userId, pagination);
	}

	sendMessage(sessionId: string, userId: string, payload: SendMessageDTO): Promise<Response> {
		const content = payload.content || payload.messages?.[payload.messages.length - 1]?.content;
		if (!content) throw new Error('Content is required');
		return this.service.sendMessageStream(sessionId, userId, content, payload.attachments);
	}

	applySuggestion(sessionId: string, userId: string, data: ApplySuggestionDTO) {
		return this.service.applySuggestion(sessionId, userId, data);
	}

	closeSession(id: string, userId: string): Promise<void> {
		return this.service.closeSession(id, userId);
	}

	listModels(): Promise<AiModel[]> {
		return this.service.listModels();
	}
}
