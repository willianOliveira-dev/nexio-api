import { and, asc, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import type {
	AiModel,
	ChatSessions,
	Educations,
	Languages,
	Messages,
	NewAiAction,
	NewChatSession,
	NewMessage,
	ResumeScores,
	Resumes,
	Skills,
	WorkExperiences,
} from '@/lib/db/schemas/index.schema.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { ResumeVersions } from '@/lib/db/schemas/resume-versions.schema.js';
import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import { buildPaginatedResult } from '@/shared/types/pagination.type.js';

export class AiChatRepository {
	async createSession(data: NewChatSession): Promise<ChatSessions> {
		const [session] = await db.insert(schema.chatSessions).values(data).returning();
		if (!session) throw new Error('Falha ao criar a sessão de chat.');
		return session;
	}

	async findSessionById(id: string, userId: string): Promise<ChatSessions | null> {
		const [session] = await db
			.select()
			.from(schema.chatSessions)
			.where(and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.userId, userId)));
		return session ?? null;
	}

	async findSessionsByUser(
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<ChatSessions>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.chatSessions)
				.where(eq(schema.chatSessions.userId, userId))
				.orderBy(desc(schema.chatSessions.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ value: count() })
				.from(schema.chatSessions)
				.where(eq(schema.chatSessions.userId, userId)),
		]);

		const total = countRow?.value ?? 0;
		return buildPaginatedResult(rows, total, pagination);
	}

	async closeSession(id: string): Promise<void> {
		await db
			.update(schema.chatSessions)
			.set({ isActive: false })
			.where(eq(schema.chatSessions.id, id));
	}

	async createMessage(data: NewMessage): Promise<Messages> {
		const [message] = await db.insert(schema.messages).values(data).returning();
		if (!message) throw new Error('Falha ao criar a mensagem.');
		return message;
	}

	async findMessagesBySession(
		sessionId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<Messages>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.messages)
				.where(eq(schema.messages.sessionId, sessionId))
				.orderBy(asc(schema.messages.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ value: count() })
				.from(schema.messages)
				.where(eq(schema.messages.sessionId, sessionId)),
		]);

		const total = countRow?.value ?? 0;
		return buildPaginatedResult(rows, total, pagination);
	}

	async findAllMessagesBySession(sessionId: string): Promise<Messages[]> {
		return db
			.select()
			.from(schema.messages)
			.where(eq(schema.messages.sessionId, sessionId))
			.orderBy(asc(schema.messages.createdAt));
	}

	async createAiAction(data: NewAiAction): Promise<void> {
		await db.insert(schema.aiActions).values(data);
	}

	async createResumeVersion(data: {
		originalResumeId: string;
		title: string;
		content: ResumeContent;
	}): Promise<ResumeVersions> {
		const [version] = await db.insert(schema.resumeVersions).values(data).returning();
		if (!version) throw new Error('Falha ao criar a versão do resume.');
		return version;
	}

	async findWorkExperiencesByResumeId(resumeId: string): Promise<WorkExperiences[]> {
		return db
			.select()
			.from(schema.workExperiences)
			.where(eq(schema.workExperiences.resumeId, resumeId))
			.orderBy(asc(schema.workExperiences.orderIndex));
	}

	async findEducationsByResumeId(resumeId: string): Promise<Educations[]> {
		return db
			.select()
			.from(schema.educations)
			.where(eq(schema.educations.resumeId, resumeId))
			.orderBy(asc(schema.educations.orderIndex));
	}

	async findSkillsByResumeId(resumeId: string): Promise<Skills[]> {
		return db.select().from(schema.skills).where(eq(schema.skills.resumeId, resumeId));
	}

	async findLanguagesByResumeId(resumeId: string): Promise<Languages[]> {
		return db.select().from(schema.languages).where(eq(schema.languages.resumeId, resumeId));
	}

	async findAllResumesByUser(userId: string): Promise<Resumes[]> {
		return db
			.select()
			.from(schema.resumes)
			.where(eq(schema.resumes.userId, userId))
			.orderBy(desc(schema.resumes.createdAt));
	}

	async findScoreByResumeId(resumeId: string): Promise<ResumeScores | null> {
		const [score] = await db
			.select()
			.from(schema.resumeScores)
			.where(eq(schema.resumeScores.resumeId, resumeId))
			.orderBy(desc(schema.resumeScores.createdAt))
			.limit(1);
		return score ?? null;
	}
	async findAllActiveModels(): Promise<AiModel[]> {
		return db
			.select()
			.from(schema.aiModels)
			.where(eq(schema.aiModels.isActive, true))
			.orderBy(desc(schema.aiModels.isDefault), asc(schema.aiModels.name));
	}

	async findModelById(id: string): Promise<AiModel | null> {
		const [model] = await db
			.select()
			.from(schema.aiModels)
			.where(and(eq(schema.aiModels.id, id), eq(schema.aiModels.isActive, true)));
		return model ?? null;
	}

	async findModelByModelId(modelId: string): Promise<AiModel | null> {
		const [model] = await db
			.select()
			.from(schema.aiModels)
			.where(and(eq(schema.aiModels.modelId, modelId), eq(schema.aiModels.isActive, true)));
		return model ?? null;
	}

	async findDefaultModel(): Promise<AiModel | null> {
		const [model] = await db
			.select()
			.from(schema.aiModels)
			.where(and(eq(schema.aiModels.isDefault, true), eq(schema.aiModels.isActive, true)))
			.limit(1);
		return model ?? null;
	}
}

export type { AiModel, ChatSessions, Messages };
