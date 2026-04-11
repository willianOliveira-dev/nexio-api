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
	NewResume,
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

	async updateSessionModelId(id: string, userId: string, aiModelId: string): Promise<void> {
		await db
			.update(schema.chatSessions)
			.set({ aiModelId, updatedAt: new Date() })
			.where(and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.userId, userId)));
	}

	async deleteSession(id: string, userId: string): Promise<void> {
		await db
			.delete(schema.chatSessions)
			.where(and(eq(schema.chatSessions.id, id), eq(schema.chatSessions.userId, userId)));
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

	async findMessageById(id: string): Promise<Messages | null> {
		const [message] = await db.select().from(schema.messages).where(eq(schema.messages.id, id));
		return message ?? null;
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

	async countResumesByUser(userId: string): Promise<number> {
		const [row] = await db
			.select({ value: count() })
			.from(schema.resumes)
			.where(eq(schema.resumes.userId, userId));
		return row?.value ?? 0;
	}

	async getBuilderData(sessionId: string): Promise<ResumeContent | null> {
		const [session] = await db
			.select()
			.from(schema.chatSessions)
			.where(eq(schema.chatSessions.id, sessionId));

		if (!session?.resumeId) return null;

		const messages = await db
			.select()
			.from(schema.messages)
			.where(eq(schema.messages.sessionId, sessionId))
			.orderBy(asc(schema.messages.createdAt));

		const suggestions = messages
			.map((m) => m.suggestion)
			.filter((s): s is { section: string; suggested: string } => s !== null);

		const content: ResumeContent = {
			contact: { fullName: '', email: '' },
			workExperience: [],
			education: [],
			skills: [],
			languages: [],
			certifications: [],
			projects: [],
			volunteering: [],
		};

		for (const suggestion of suggestions) {
			this.applyBuilderSuggestion(content, suggestion.section, suggestion.suggested);
		}

		return content;
	}

	private applyBuilderSuggestion(content: ResumeContent, section: string, value: string): void {
		if (section.startsWith('contact.')) {
			const field = section.replace('contact.', '');
			const contact = content.contact;
			const contactRecord = contact as Record<
				string,
				string | { network: string; url: string }[] | undefined
			>;
			contactRecord[field] = value;
			return;
		}

		if (section === 'professionalSummary') {
			content.professionalSummary = value;
			return;
		}

		if (section === 'workExperience') {
			const parsed = JSON.parse(value) as {
				title: string;
				company: string;
				location?: string;
				startDate?: string;
				endDate?: string;
				isCurrent: boolean;
				bullets: string[];
			};
			content.workExperience ??= [];
			const entry: (typeof content.workExperience)[number] = {
				title: parsed.title,
				company: parsed.company,
				isCurrent: parsed.isCurrent,
				bullets: parsed.bullets,
			};
			if (parsed.location != null) entry.location = parsed.location;
			if (parsed.startDate != null) entry.startDate = parsed.startDate;
			if (parsed.endDate != null) entry.endDate = parsed.endDate;
			content.workExperience.push(entry);
			return;
		}

		if (section === 'education') {
			const parsed = JSON.parse(value) as {
				degree: string;
				institution: string;
				location?: string;
				startDate?: string;
				endDate?: string;
			};
			content.education ??= [];
			const entry: (typeof content.education)[number] = {
				degree: parsed.degree,
				institution: parsed.institution,
			};
			if (parsed.location != null) entry.location = parsed.location;
			if (parsed.startDate != null) entry.startDate = parsed.startDate;
			if (parsed.endDate != null) entry.endDate = parsed.endDate;
			content.education.push(entry);
			return;
		}

		if (section === 'skills') {
			const parsed = JSON.parse(value) as {
				category?: string;
				items: string[];
			};
			content.skills ??= [];
			content.skills.push({
				category: parsed.category ?? 'Geral',
				items: parsed.items,
			});
			return;
		}

		if (section === 'languages') {
			const parsed = JSON.parse(value) as {
				language: string;
				proficiency?: string;
			};
			content.languages ??= [];
			content.languages.push({
				language: parsed.language,
				proficiency: parsed.proficiency ?? '',
			});
			return;
		}

		if (section === 'certifications') {
			const parsed = JSON.parse(value) as {
				name: string;
				issuer: string;
				issueDate?: string;
				expirationDate?: string;
				url?: string;
			};
			content.certifications ??= [];
			const entry: (typeof content.certifications)[number] = {
				name: parsed.name,
				issuer: parsed.issuer,
			};
			if (parsed.issueDate != null) entry.issueDate = parsed.issueDate;
			if (parsed.expirationDate != null) entry.expirationDate = parsed.expirationDate;
			if (parsed.url != null) entry.url = parsed.url;
			content.certifications.push(entry);
			return;
		}

		if (section === 'projects') {
			const parsed = JSON.parse(value) as {
				name: string;
				description: string;
				keywords?: string[];
				url?: string;
			};
			content.projects ??= [];
			const entry: (typeof content.projects)[number] = {
				name: parsed.name,
				description: parsed.description,
			};
			if (parsed.keywords != null) entry.keywords = parsed.keywords;
			if (parsed.url != null) entry.url = parsed.url;
			content.projects.push(entry);
			return;
		}

		if (section === 'volunteering') {
			const parsed = JSON.parse(value) as {
				role: string;
				organization: string;
				startDate?: string;
				endDate?: string;
				description?: string;
			};
			content.volunteering ??= [];
			const entry: (typeof content.volunteering)[number] = {
				role: parsed.role,
				organization: parsed.organization,
			};
			if (parsed.startDate != null) entry.startDate = parsed.startDate;
			if (parsed.endDate != null) entry.endDate = parsed.endDate;
			if (parsed.description != null) entry.description = parsed.description;
			content.volunteering.push(entry);
		}
	}

	async createResumeFromBuilder(
		userId: string,
		title: string,
		content: ResumeContent,
	): Promise<Resumes> {
		const resumeData: NewResume = {
			userId,
			fileName: `${title}.txt`,
			storageKey: `ai-built/${userId}/${crypto.randomUUID()}.txt`,
			mimeType: 'text/plain',
			sizeBytes: 0,
			status: 'analyzed',
			rawText: '',
			fullName: content.contact.fullName,
			email: content.contact.email,
			phone: content.contact.phone ?? null,
			location: content.contact.location ?? null,
			website: content.contact.website ?? null,
			professionalSummary: content.professionalSummary ?? null,
		};

		const [resume] = await db.insert(schema.resumes).values(resumeData).returning();
		if (!resume) throw new Error('Falha ao criar o resume via builder.');

		if (content.workExperience?.length) {
			await db.insert(schema.workExperiences).values(
				content.workExperience.map((w, i) => ({
					resumeId: resume.id,
					title: w.title,
					company: w.company,
					location: w.location,
					startDate: w.startDate,
					endDate: w.endDate,
					isCurrent: w.isCurrent,
					description: w.bullets.join('\n'),
					orderIndex: i,
				})),
			);
		}

		if (content.education?.length) {
			await db.insert(schema.educations).values(
				content.education.map((e, i) => ({
					resumeId: resume.id,
					degree: e.degree,
					institution: e.institution,
					location: e.location,
					startDate: e.startDate,
					endDate: e.endDate,
					orderIndex: i,
				})),
			);
		}

		if (content.skills?.length) {
			await db.insert(schema.skills).values(
				content.skills.flatMap((s) =>
					s.items.map((item) => ({
						resumeId: resume.id,
						category: s.category,
						name: item,
					})),
				),
			);
		}

		if (content.languages?.length) {
			await db.insert(schema.languages).values(
				content.languages.map((l) => ({
					resumeId: resume.id,
					name: l.language,
					proficiency: l.proficiency,
				})),
			);
		}

		if (content.projects?.length) {
			await db.insert(schema.projects).values(
				content.projects.map((p, i) => ({
					resumeId: resume.id,
					name: p.name,
					description: p.description,
					keywords: p.keywords ?? [],
					url: p.url ?? null,
					orderIndex: i,
				})),
			);
		}

		if (content.certifications?.length) {
			await db.insert(schema.certifications).values(
				content.certifications.map((c, i) => ({
					resumeId: resume.id,
					name: c.name,
					issuer: c.issuer,
					issueDate: c.issueDate ?? null,
					expirationDate: c.expirationDate ?? null,
					url: c.url ?? null,
					orderIndex: i,
				})),
			);
		}

		if (content.volunteering?.length) {
			await db.insert(schema.volunteering).values(
				content.volunteering.map((v, i) => ({
					resumeId: resume.id,
					role: v.role,
					organization: v.organization,
					startDate: v.startDate ?? null,
					endDate: v.endDate ?? null,
					description: v.description ?? null,
					orderIndex: i,
				})),
			);
		}

		return resume;
	}
}

export type { AiModel, ChatSessions, Messages };
