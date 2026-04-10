import { type AssistantContent, type ModelMessage, streamText, type UserContent } from 'ai';
import { openRouterProvider } from '@/lib/ai/openrouter.provider.js';
import { webSearchTool } from '@/lib/ai/tools/web-search.tool.js';
import type { AttachmentMeta } from '@/lib/db/schemas/chat.schema.js';
import type { ResumeContent } from '@/lib/db/schemas/resumes.schema.js';
import { getBoss, SCORE_RECALCULATE_JOB } from '@/lib/queue/pg-boss.client.js';
import type { JobMatchesRepository } from '@/modules/job-matches/repositories/job-matches.repository.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import { BadRequestError, NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { AiChatPromptContext } from '@/shared/prompts/ai-chat.prompt.js';
import { buildAiChatSystemPrompt } from '@/shared/prompts/ai-chat.prompt.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type {
	AiChatRepository,
	AiModel,
	ChatSessions,
	Messages,
} from '../repositories/ai-chat.repository.js';
import type { ApplySuggestionDTO } from '../schemas/apply-suggestion.dto.js';
import type { CreateSessionDTO } from '../schemas/create-session.dto.js';

type SuggestionData = {
	section: string;
	original?: string;
	suggested: string;
};

type SessionWithMessages = ChatSessions & {
	messages: Messages[];
	messagesMeta: PaginatedResult<Messages>['meta'];
};

export class AiChatService {
	constructor(
		private readonly aiChatRepository: AiChatRepository,
		private readonly resumesRepository: ResumesRepository,
		private readonly jobMatchesRepository: JobMatchesRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async createSession(userId: string, data: CreateSessionDTO): Promise<ChatSessions> {
		const resume = await this.resumesRepository.findById(data.resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');

		if (resume.status !== 'analyzed') {
			throw new BadRequestError(
				'O currículo precisa estar com status "analyzed" para iniciar um chat.',
			);
		}

		if (data.jobMatchId) {
			const jobMatch = await this.jobMatchesRepository.findById(data.jobMatchId, userId);
			if (!jobMatch) throw new NotFoundError('Job Match');
		}

		let aiModelId: string | null = null;

		if (data.modelId) {
			const modelRow = await this.aiChatRepository.findModelByModelId(data.modelId);
			if (!modelRow) throw new BadRequestError('Modelo de IA inválido ou indisponível.');
			aiModelId = modelRow.id;
		} else {
			const defaultModel = await this.aiChatRepository.findDefaultModel();
			if (defaultModel) aiModelId = defaultModel.id;
		}

		const title = `Chat com Nexio AI - ${resume.fileName}`;

		return this.aiChatRepository.createSession({
			userId,
			resumeId: data.resumeId,
			jobMatchId: data.jobMatchId ?? null,
			aiModelId,
			title,
			isActive: true,
		});
	}

	async getSession(
		id: string,
		userId: string,
		pagination: Pagination,
	): Promise<SessionWithMessages> {
		const session = await this.aiChatRepository.findSessionById(id, userId);
		if (!session) throw new NotFoundError('Sessão de chat');

		const messagesResult = await this.aiChatRepository.findMessagesBySession(id, pagination);

		return {
			...session,
			messages: messagesResult.data,
			messagesMeta: messagesResult.meta,
		};
	}

	async listSessions(
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<ChatSessions>> {
		return this.aiChatRepository.findSessionsByUser(userId, pagination);
	}

	async sendMessageStream(
		sessionId: string,
		userId: string,
		content: string,
		attachments?: AttachmentMeta[], // Adicionado attachments
	): Promise<Response> {
		const session = await this.aiChatRepository.findSessionById(sessionId, userId);
		if (!session) throw new NotFoundError('Sessão de chat');

		if (!session.isActive) {
			throw new BadRequestError('Esta sessão de chat está encerrada.');
		}

		const creditsRemaining = await this.usersRepository.getCreditsRemaining(userId);
		if (creditsRemaining <= 0) throw new PaymentRequiredError('Créditos de IA esgotados');

		const modelRow = session.aiModelId
			? await this.aiChatRepository.findModelById(session.aiModelId)
			: await this.aiChatRepository.findDefaultModel();

		if (!modelRow) throw new NotFoundError('Modelo de IA');

		// Validar suporte a visão se possuir imagens
		if (attachments?.some((a) => a.type === 'image') && !modelRow.supportsVision) {
			throw new BadRequestError(`O modelo selecionado (${modelRow.name}) não suporta imagens.`);
		}

		// Filtrar payload base64 antes de salvar no DB
		const dbAttachments = attachments?.map((att) => {
			if (att.base64) {
				const { base64, ...rest } = att;
				return rest; // Salva apenas os metadados, despreza o peso do base64 no Postgres
			}
			return att;
		});

		await this.aiChatRepository.createMessage({
			sessionId,
			role: 'user',
			content,
			attachments: dbAttachments && dbAttachments.length > 0 ? dbAttachments : null,
		});

		const systemPrompt = await this.buildSystemPrompt(session, userId);

		// Recarrega o history, porém o último será anexado artificialmente para ter os base64 na Vercel
		const historyFromDb = await this.aiChatRepository.findAllMessagesBySession(sessionId);

		const chatMessages: ModelMessage[] = historyFromDb.map((m, index) => {
			const isLast = index === historyFromDb.length - 1;
			const attsToUse = isLast && attachments ? attachments : m.attachments;

			if (attsToUse && attsToUse.length > 0) {
				if (m.role === 'user') {
					const userContent: UserContent = [
						{ type: 'text', text: m.content },
						...attsToUse.map((att) => {
							if (att.type === 'image') {
								return {
									type: 'image' as const,
									image: new URL(att.url ?? att.base64 ?? ''),
									mediaType: att.mimeType,
								};
							}
							return {
								type: 'file' as const,
								data: new URL(att.url ?? att.base64 ?? ''),
								mediaType: att.mimeType,
							};
						}),
					];
					return { role: 'user', content: userContent };
				}

				const assistantContent: AssistantContent = [
					{ type: 'text', text: m.content },
					...attsToUse
						.filter((att) => att.type === 'document')
						.map((att) => ({
							type: 'file' as const,
							data: new URL(att.url ?? att.base64 ?? ''),
							mediaType: att.mimeType,
						})),
				];
				return { role: 'assistant', content: assistantContent };
			}

			if (m.role === 'user') {
				return { role: 'user', content: m.content };
			}
			return { role: 'assistant', content: m.content };
		});

		const startTime = Date.now();

		const result = streamText({
			model: openRouterProvider(modelRow.modelId),
			system: systemPrompt,
			temperature: 0.6,
			maxOutputTokens: 2048,
			messages: chatMessages,
			tools: {
				webSearch: webSearchTool,
			},
			onFinish: async (event) => {
				const durationMs = Date.now() - startTime;

				if (!event.text) return;

				const suggestion = this.parseSuggestion(event.text);
				const cleanContent = this.cleanContent(event.text);

				await this.aiChatRepository.createMessage({
					sessionId,
					role: 'assistant',
					content: cleanContent,
					suggestion,
				});

				await this.aiChatRepository.createAiAction({
					userId,
					sessionId,
					resumeId: session.resumeId,
					type: suggestion ? 'rewrite_section' : 'improve_section',
					status: 'completed',
					inputTokens: event.usage.inputTokens ?? 0,
					outputTokens: event.usage.outputTokens ?? 0,
					durationMs,
				});

				await this.usersRepository.incrementCreditsUsed(userId);
			},
		});

		return result.toTextStreamResponse();
	}

	async applySuggestion(
		sessionId: string,
		userId: string,
		data: ApplySuggestionDTO,
	): Promise<{
		resume: { id: string; updatedField: string; updatedValue: string };
		version: { id: string; title: string; createdAt: string };
	}> {
		const session = await this.aiChatRepository.findSessionById(sessionId, userId);
		if (!session) throw new NotFoundError('Sessão de chat');

		if (!session.resumeId) {
			throw new BadRequestError('Esta sessão não possui um currículo associado.');
		}

		const resume = await this.resumesRepository.findById(session.resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');

		const currentContent: ResumeContent = {
			contact: {
				fullName: resume.fullName ?? '',
				email: resume.email ?? '',
				...(resume.phone != null ? { phone: resume.phone } : {}),
				...(resume.location != null ? { location: resume.location } : {}),
				...(resume.website != null ? { website: resume.website } : {}),
			},
			...(resume.professionalSummary != null
				? { professionalSummary: resume.professionalSummary }
				: {}),
		};

		const version = await this.aiChatRepository.createResumeVersion({
			originalResumeId: resume.id,
			title: 'Versão antes da sugestão AI',
			content: currentContent,
		});

		const { section, suggested } = data.suggestion;
		const updateData = this.mapSectionToField(section, suggested);

		await this.resumesRepository.updateAnalyzedFields(resume.id, updateData);

		const boss = await getBoss();
		await boss.send(SCORE_RECALCULATE_JOB, { resumeId: resume.id, userId });

		return {
			resume: {
				id: resume.id,
				updatedField: section,
				updatedValue: suggested,
			},
			version: {
				id: version.id,
				title: version.title,
				createdAt: version.createdAt.toISOString(),
			},
		};
	}

	async listModels(): Promise<AiModel[]> {
		return this.aiChatRepository.findAllActiveModels();
	}

	async closeSession(id: string, userId: string): Promise<void> {
		const session = await this.aiChatRepository.findSessionById(id, userId);
		if (!session) throw new NotFoundError('Sessão de chat');
		await this.aiChatRepository.closeSession(id);
	}

	private async buildSystemPrompt(session: ChatSessions, userId: string): Promise<string> {
		let resumeContent = '{}';
		let overall = 0;
		let impact = 0;
		let atsScore = 0;
		let keywords = 0;
		let clarity = 0;
		let improvements = '';
		let missingKeywords = '';
		let jobMatchContext: string | undefined;

		if (session.resumeId) {
			const resume = await this.resumesRepository.findById(session.resumeId, userId);
			if (resume) {
				const [workExperiences, educations, skillRows, languageRows, allResumes] =
					await Promise.all([
						this.aiChatRepository.findWorkExperiencesByResumeId(resume.id),
						this.aiChatRepository.findEducationsByResumeId(resume.id),
						this.aiChatRepository.findSkillsByResumeId(resume.id),
						this.aiChatRepository.findLanguagesByResumeId(resume.id),
						this.aiChatRepository.findAllResumesByUser(userId),
					]);

				const skillsByCategory: Record<string, string[]> = {};
				for (const s of skillRows) {
					const cat = s.category ?? 'Geral';
					if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
					skillsByCategory[cat]?.push(s.name);
				}

				const fullResumeData = {
					contact: {
						fullName: resume.fullName,
						email: resume.email,
						phone: resume.phone,
						location: resume.location,
						website: resume.website,
					},
					professionalSummary: resume.professionalSummary,
					workExperience: workExperiences.map((w) => ({
						title: w.title,
						company: w.company,
						location: w.location,
						startDate: w.startDate,
						endDate: w.endDate,
						isCurrent: w.isCurrent,
						description: w.description,
					})),
					education: educations.map((e) => ({
						degree: e.degree,
						institution: e.institution,
						location: e.location,
						startDate: e.startDate,
						endDate: e.endDate,
					})),
					skills: Object.entries(skillsByCategory).map(([category, items]) => ({
						category,
						items,
					})),
					languages: languageRows.map((l) => ({
						language: l.name,
						proficiency: l.proficiency,
					})),
				};

				resumeContent = JSON.stringify(fullResumeData, null, 2);

				const score = await this.aiChatRepository.findScoreByResumeId(resume.id);
				if (score) {
					overall = score.overall;
					impact = score.impact;
					atsScore = score.atsScore;
					keywords = score.keywords;
					clarity = score.clarity;
					const improvementsList = score.improvements as
						| { type: string; description: string; priority: string }[]
						| null;
					if (improvementsList?.length) {
						improvements = improvementsList
							.map((i) => `- [${i.priority.toUpperCase()}] ${i.description}`)
							.join('\n');
					}
					const mkList = score.missingKeywords as string[] | null;
					if (mkList?.length) {
						missingKeywords = mkList.join(', ');
					}
				}

				if (allResumes.length > 1) {
					const otherResumes = allResumes.filter((r) => r.id !== resume.id);
					const otherScores = await Promise.all(
						otherResumes.map(async (r) => {
							const s = await this.aiChatRepository.findScoreByResumeId(r.id);
							return {
								fileName: r.fileName,
								status: r.status,
								fullName: r.fullName,
								overall: s?.overall ?? null,
								createdAt: r.createdAt.toISOString(),
							};
						}),
					);

					resumeContent += `\n\nOTHER RESUMES FROM THIS USER (${otherResumes.length}):`;
					resumeContent += `\n${JSON.stringify(otherScores, null, 2)}`;
				}
			}
		}

		if (session.jobMatchId) {
			const jobMatch = await this.jobMatchesRepository.findById(session.jobMatchId, session.userId);
			if (jobMatch) {
				const fk = (jobMatch.foundKeywords as string[]) ?? [];
				const mk = (jobMatch.missingKeywords as string[]) ?? [];
				const recs =
					(jobMatch.recommendations as {
						title: string;
						description: string;
						difficulty: string;
					}[]) ?? [];

				let ctx = `Job Title: ${jobMatch.jobTitle ?? 'N/A'}`;
				ctx += `\nJob Description:\n${jobMatch.jobDescription}`;
				ctx += `\nMatch Score: ${jobMatch.matchScore}/100`;
				ctx += `\nFound Keywords: ${fk.join(', ')}`;
				ctx += `\nMissing Keywords: ${mk.join(', ')}`;
				if (recs.length > 0) {
					ctx += '\nRecommendations:';
					for (const r of recs) {
						ctx += `\n  - [${r.difficulty.toUpperCase()}] ${r.title}: ${r.description}`;
					}
				}
				jobMatchContext = ctx;

				if (!missingKeywords && mk.length > 0) {
					missingKeywords = mk.join(', ');
				}
			}
		}

		const ctx: AiChatPromptContext = {
			resumeContent,
			overall,
			impact,
			atsScore,
			keywords,
			clarity,
			improvements,
			missingKeywords,
			writingTone: 'conversational',
			preferredLanguage: 'pt-BR',
			...(jobMatchContext != null ? { jobMatchContext } : {}),
		};

		return buildAiChatSystemPrompt(ctx);
	}

	private parseSuggestion(content: string): SuggestionData | null {
		const regex = /<--SUGGESTION-->([\s\S]*?)<--\/SUGGESTION-->/;
		const match = regex.exec(content);
		if (!match?.[1]) return null;

		try {
			const parsed = JSON.parse(match[1].trim()) as SuggestionData;
			if (!parsed.section || !parsed.suggested) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	private cleanContent(content: string): string {
		return content.replace(/<--SUGGESTION-->[\s\S]*?<--\/SUGGESTION-->/, '').trim();
	}

	private mapSectionToField(section: string, _value: string): Record<string, string | null> {
		if (section === 'professionalSummary') {
			return { professionalSummary: _value };
		}
		if (section.startsWith('contact.')) {
			const field = section.replace('contact.', '');
			const allowedFields = ['fullName', 'email', 'phone', 'location', 'website'];
			if (allowedFields.includes(field)) {
				return { [field]: _value };
			}
		}

		return { professionalSummary: _value };
	}
}
