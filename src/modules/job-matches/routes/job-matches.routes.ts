import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { JobMatchesController } from '../controllers/job-matches.controller.js';
import { createJobMatchBodySchema } from '../schemas/create-job-match.dto.js';
import { jobMatchDetailSchema, paginatedJobMatchesSchema } from '../schemas/responses.schema.js';

export const jobMatchesRoutes = new OpenAPIHono<AppEnv>();
const controller = new JobMatchesController();

const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	resumeId: z.string().uuid().optional(),
});

jobMatchesRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/job-matches',
		operationId: 'analyzeJobMatch',
		tags: ['Job Matches'],
		summary: 'Analisa a compatibilidade entre um currículo e uma vaga de emprego via IA',
		middleware: [authenticateMiddleware] as const,
		request: {
			body: {
				required: true,
				content: { 'application/json': { schema: createJobMatchBodySchema } },
			},
		},
		responses: {
			201: {
				description: 'Análise de compatibilidade criada',
				content: { 'application/json': { schema: jobMatchDetailSchema } },
			},
			400: createValidationErrorResponse('Dados inválidos ou currículo não analisado'),
			402: createAppErrorResponse('Créditos de IA esgotados'),
			404: createAppErrorResponse('Currículo não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = c.req.valid('json');
		const match = await controller.analyzeMatch(user.id, body);
		return c.json(
			{
				id: match.id,
				resumeId: match.resumeId,
				jobTitle: match.jobTitle ?? null,
				jobDescription: match.jobDescription,
				matchScore: match.matchScore,
				foundKeywords: (match.foundKeywords as string[]) ?? [],
				missingKeywords: (match.missingKeywords as string[]) ?? [],
				recommendations:
					(match.recommendations as {
						title: string;
						description: string;
						difficulty: 'easy' | 'medium' | 'hard';
					}[]) ?? [],
				createdAt: match.createdAt.toISOString(),
			},
			201,
		);
	},
);

jobMatchesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/job-matches',
		operationId: 'listJobMatches',
		tags: ['Job Matches'],
		summary: 'Lista os job matches do usuário autenticado com paginação',
		middleware: [authenticateMiddleware] as const,
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: 'Lista paginada de job matches (sem jobDescription)',
				content: { 'application/json': { schema: paginatedJobMatchesSchema } },
			},
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { page, limit, resumeId } = c.req.valid('query');

		let data: Awaited<ReturnType<typeof controller.listMatches>>;

		if (resumeId) {
			const items = await controller.listMatchesByResume(resumeId, user.id);
			const total = items.length;
			data = {
				data: items,
				meta: {
					total,
					page: 1,
					limit: total,
					totalPages: 1,
					hasNext: false,
					hasPrevious: false,
				},
			};
		} else {
			data = await controller.listMatches(user.id, { page, limit });
		}

		return c.json(
			{
				data: data.data.map((m) => ({
					id: m.id,
					resumeId: m.resumeId,
					jobTitle: m.jobTitle ?? null,
					matchScore: m.matchScore,
					foundKeywords: (m.foundKeywords as string[]) ?? [],
					missingKeywords: (m.missingKeywords as string[]) ?? [],
					recommendations:
						(m.recommendations as {
							title: string;
							description: string;
							difficulty: 'easy' | 'medium' | 'hard';
						}[]) ?? [],
					createdAt: m.createdAt.toISOString(),
				})),
				meta: data.meta,
			},
			200,
		);
	},
);

jobMatchesRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/job-matches/:id',
		operationId: 'getJobMatch',
		tags: ['Job Matches'],
		summary: 'Obtém um job match completo incluindo a descrição da vaga',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			200: {
				description: 'Job match completo',
				content: { 'application/json': { schema: jobMatchDetailSchema } },
			},
			404: createAppErrorResponse('Job match não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const match = await controller.getMatch(id, user.id);
		return c.json(
			{
				id: match.id,
				resumeId: match.resumeId,
				jobTitle: match.jobTitle ?? null,
				jobDescription: match.jobDescription,
				matchScore: match.matchScore,
				foundKeywords: (match.foundKeywords as string[]) ?? [],
				missingKeywords: (match.missingKeywords as string[]) ?? [],
				recommendations:
					(match.recommendations as {
						title: string;
						description: string;
						difficulty: 'easy' | 'medium' | 'hard';
					}[]) ?? [],
				createdAt: match.createdAt.toISOString(),
			},
			200,
		);
	},
);

jobMatchesRoutes.openapi(
	createRoute({
		method: 'delete',
		path: '/job-matches/:id',
		operationId: 'deleteJobMatch',
		tags: ['Job Matches'],
		summary: 'Remove um job match',
		middleware: [authenticateMiddleware] as const,
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			204: { description: 'Job match excluído com sucesso' },
			404: createAppErrorResponse('Job match não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		await controller.deleteMatch(id, user.id);
		return c.body(null, 204);
	},
);
