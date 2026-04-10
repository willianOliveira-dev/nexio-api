import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { ResumesController } from '../controllers/resumes.controller.js';
import { listResumesQuerySchema } from '../schemas/requests.schema.js';
import {
	downloadUrlResponseSchema,
	paginatedResumesSchema,
	paginatedVersionsSchema,
	reanalyzeResponseSchema,
	resumeDetailSchema,
	scoreResponseSchema,
	uploadResumeResponseSchema,
	versionDetailSchema,
} from '../schemas/responses.schema.js';
import { paginationQuerySchema } from '../schemas/upload-resume.dto.js';

export const resumesRoutes = new OpenAPIHono<AppEnv>();
const controller = new ResumesController();

resumesRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/resumes/upload',
		operationId: 'uploadResume',
		tags: ['Resumes'],
		summary: 'Realiza o upload de um currículo e inicia a análise assíncrona por IA',
		middleware: [authenticateMiddleware] as const,
		request: {
			body: {
				required: true,
				content: {
					'multipart/form-data': {
						schema: z.object({
							file: z.custom<File>().openapi({
								type: 'string',
								format: 'binary',
								description: 'Arquivo PDF, DOCX ou TXT (máx 10MB)',
							}),
						}),
					},
				},
			},
		},
		responses: {
			201: {
				description: 'Currículo enviado — análise em processamento',
				content: { 'application/json': { schema: uploadResumeResponseSchema } },
			},
			400: createValidationErrorResponse('Arquivo inválido — tipo ou tamanho não permitido'),
			402: createAppErrorResponse('Créditos de IA esgotados'),
			403: createAppErrorResponse('Limite de currículos do plano atingido'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = await c.req.parseBody();
		const file = body.file;
		if (!(file instanceof File)) throw new Error('Campo "file" ausente ou inválido');
		const resume = await controller.uploadResume(user.id, file);
		return c.json(
			{
				id: resume.id,
				fileName: resume.fileName,
				status: resume.status,
				createdAt: resume.createdAt.toISOString(),
			},
			201,
		);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/resumes',
		operationId: 'listResumes',
		tags: ['Resumes'],
		summary: 'Lista os currículos do usuário autenticado com paginação, busca e filtros',
		middleware: [authenticateMiddleware] as const,
		request: { query: listResumesQuerySchema },
		responses: {
			200: {
				description: 'Lista paginada de currículos',
				content: { 'application/json': { schema: paginatedResumesSchema } },
			},
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { page, limit, search, status, sortBy, sortOrder } = c.req.valid('query');
		const result = await controller.listResumes(
			user.id,
			{ page, limit },
			{
				search,
				status,
				sortBy,
				sortOrder,
			},
		);
		return c.json(
			{
				data: result.data.map((r) => ({
					id: r.id,
					fileName: r.fileName,
					status: r.status,
					fullName: r.fullName,
					score: r.score
						? {
								overall: r.score.overall,
								impact: r.score.impact,
								atsScore: r.score.atsScore,
								keywords: r.score.keywords,
								clarity: r.score.clarity,
							}
						: null,
					createdAt: r.createdAt.toISOString(),
					updatedAt: r.updatedAt.toISOString(),
				})),
				meta: result.meta,
			},
			200,
		);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/resumes/:id',
		operationId: 'getResume',
		tags: ['Resumes'],
		summary: 'Obtém o currículo completo com score e sub-entidades',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			200: {
				description: 'Currículo completo',
				content: { 'application/json': { schema: resumeDetailSchema } },
			},
			404: createAppErrorResponse('Currículo não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const r = await controller.getResume(id, user.id);
		return c.json(
			{
				id: r.id,
				fileName: r.fileName,
				status: r.status,
				mimeType: r.mimeType,
				sizeBytes: r.sizeBytes,
				fullName: r.fullName,
				email: r.email,
				phone: r.phone,
				location: r.location,
				website: r.website,
				professionalSummary: r.professionalSummary,
				score: r.score
					? {
							overall: r.score.overall,
							impact: r.score.impact,
							atsScore: r.score.atsScore,
							keywords: r.score.keywords,
							clarity: r.score.clarity,
							strengths: r.score.strengths ?? [],
							improvements: r.score.improvements ?? [],
							missingKeywords: r.score.missingKeywords ?? [],
						}
					: null,
				workExperiences: [],
				educations: [],
				skills: [],
				languages: [],
				createdAt: r.createdAt.toISOString(),
				updatedAt: r.updatedAt.toISOString(),
			},
			200,
		);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'delete',
		path: '/resumes/:id',
		operationId: 'deleteResume',
		tags: ['Resumes'],
		summary: 'Remove o currículo e o arquivo do storage',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			204: { description: 'Currículo excluído com sucesso' },
			404: createAppErrorResponse('Currículo não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		await controller.deleteResume(id, user.id);
		return c.body(null, 204);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/resumes/:id/reanalyze',
		operationId: 'reanalyzeResume',
		tags: ['Resumes'],
		summary: 'Reenfileira o currículo para reanálise por IA, consumindo 1 crédito',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			202: {
				description: 'Reanálise enfileirada',
				content: { 'application/json': { schema: reanalyzeResponseSchema } },
			},
			402: createAppErrorResponse('Créditos de IA esgotados'),
			404: createAppErrorResponse('Currículo não encontrado'),
			409: createAppErrorResponse(
				'Status inválido para reanálise — precisa estar "analyzed" ou "failed"',
			),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		await controller.reAnalyze(id, user.id);
		return c.json({ message: 'Reanalysis queued', status: 'processing' as const }, 202);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/resumes/:id/score',
		operationId: 'getResumeScore',
		tags: ['Resumes'],
		summary: 'Obtém o score de análise detalhado do currículo',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			200: {
				description: 'Score detalhado',
				content: { 'application/json': { schema: scoreResponseSchema } },
			},
			404: createAppErrorResponse('Score não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const score = await controller.getScore(id, user.id);
		return c.json(
			{
				id: score.id,
				resumeId: score.resumeId,
				overall: score.overall,
				impact: score.impact,
				atsScore: score.atsScore,
				keywords: score.keywords,
				clarity: score.clarity,
				strengths: score.strengths ?? [],
				improvements: score.improvements ?? [],
				missingKeywords: score.missingKeywords ?? [],
				createdAt: score.createdAt.toISOString(),
			},
			200,
		);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/resumes/:id/download',
		operationId: 'getResumeDownloadUrl',
		tags: ['Resumes'],
		summary: 'Gera URL presignada para download do arquivo original (válida por 15 minutos)',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			200: {
				description: 'URL de download presignada',
				content: { 'application/json': { schema: downloadUrlResponseSchema } },
			},
			404: createAppErrorResponse('Currículo não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const result = await controller.getDownloadUrl(id, user.id);
		return c.json(result, 200);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/resumes/:id/versions',
		operationId: 'listResumeVersions',
		tags: ['Resumes'],
		summary: 'Lista as versões otimizadas do currículo com paginação',
		middleware: [authenticateMiddleware] as const,
		request: {
			params: z.object({ id: z.string().uuid() }),
			query: paginationQuerySchema,
		},
		responses: {
			200: {
				description: 'Lista paginada de versões',
				content: { 'application/json': { schema: paginatedVersionsSchema } },
			},
			404: createAppErrorResponse('Currículo não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const { page, limit } = c.req.valid('query');
		const result = await controller.getVersions(id, user.id, { page, limit });
		return c.json(
			{
				data: result.data.map((v) => ({
					id: v.id,
					title: v.title,
					jobMatchId: v.jobMatchId,
					createdAt: v.createdAt.toISOString(),
				})),
				meta: result.meta,
			},
			200,
		);
	},
);

resumesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/resumes/:id/versions/:versionId',
		operationId: 'getResumeVersion',
		tags: ['Resumes'],
		summary: 'Obtém uma versão específica do currículo com conteúdo estruturado completo',
		middleware: [authenticateMiddleware] as const,
		request: {
			params: z.object({ id: z.string().uuid(), versionId: z.string().uuid() }),
		},
		responses: {
			200: {
				description: 'Versão completa com conteúdo',
				content: { 'application/json': { schema: versionDetailSchema } },
			},
			404: createAppErrorResponse('Versão não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id, versionId } = c.req.valid('param');
		const version = await controller.getVersion(id, versionId, user.id);
		return c.json(
			{
				id: version.id,
				title: version.title,
				jobMatchId: version.jobMatchId,
				content: version.content as Record<string, unknown>,
				createdAt: version.createdAt.toISOString(),
				updatedAt: version.updatedAt.toISOString(),
			},
			200,
		);
	},
);
