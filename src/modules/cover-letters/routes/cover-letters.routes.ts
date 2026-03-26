import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { CoverLettersController } from '../controllers/cover-letters.controller.js';
import { generateCoverLetterBodySchema } from '../schemas/generate-cover-letter.dto.js';
import {
	coverLetterDetailSchema,
	paginatedCoverLettersSchema,
} from '../schemas/responses.schema.js';
import { updateCoverLetterBodySchema } from '../schemas/update-cover-letter.dto.js';

export const coverLettersRoutes = new OpenAPIHono<AppEnv>();
const controller = new CoverLettersController();

const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

coverLettersRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/cover-letters/generate',
		operationId: 'generateCoverLetter',
		tags: ['Cover Letters'],
		summary: 'Gera uma cover letter personalizada usando IA',
		middleware: [authenticateMiddleware],
		request: {
			body: {
				required: true,
				content: {
					'application/json': {
						schema: generateCoverLetterBodySchema,
					},
				},
			},
		},
		responses: {
			201: {
				description: 'Cover letter gerada com sucesso',
				content: {
					'application/json': { schema: coverLetterDetailSchema },
				},
			},
			400: createValidationErrorResponse('Dados inválidos ou currículo não analisado'),
			402: createAppErrorResponse('Créditos de IA esgotados'),
			403: createAppErrorResponse('Cover Letters requer plano Pro ou superior'),
			404: createAppErrorResponse('Currículo ou Job Match não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = c.req.valid('json');
		const coverLetter = await controller.generate(user.id, body);
		return c.json(
			{
				id: coverLetter.id,
				title: coverLetter.title,
				content: coverLetter.content,
				baseResumeId: coverLetter.baseResumeId,
				jobMatchId: coverLetter.jobMatchId,
				createdAt: coverLetter.createdAt.toISOString(),
				updatedAt: coverLetter.updatedAt.toISOString(),
			},
			201,
		);
	},
);

coverLettersRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/cover-letters',
		operationId: 'listCoverLetters',
		tags: ['Cover Letters'],
		summary: 'Lista as cover letters do usuário autenticado com paginação',
		middleware: [authenticateMiddleware],
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: 'Lista paginada de cover letters (sem content)',
				content: {
					'application/json': { schema: paginatedCoverLettersSchema },
				},
			},
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { page, limit } = c.req.valid('query');
		const data = await controller.listCoverLetters(user.id, {
			page,
			limit,
		});
		return c.json(
			{
				data: data.data.map((cl) => ({
					id: cl.id,
					title: cl.title,
					baseResumeId: cl.baseResumeId,
					jobMatchId: cl.jobMatchId,
					createdAt: cl.createdAt.toISOString(),
					updatedAt: cl.updatedAt.toISOString(),
				})),
				meta: data.meta,
			},
			200,
		);
	},
);

coverLettersRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/cover-letters/:id',
		operationId: 'getCoverLetter',
		tags: ['Cover Letters'],
		summary: 'Obtém uma cover letter completa incluindo o conteúdo',
		middleware: [authenticateMiddleware],
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			200: {
				description: 'Cover letter completa',
				content: {
					'application/json': { schema: coverLetterDetailSchema },
				},
			},
			404: createAppErrorResponse('Cover letter não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const coverLetter = await controller.getCoverLetter(id, user.id);
		return c.json(
			{
				id: coverLetter.id,
				title: coverLetter.title,
				content: coverLetter.content,
				baseResumeId: coverLetter.baseResumeId,
				jobMatchId: coverLetter.jobMatchId,
				createdAt: coverLetter.createdAt.toISOString(),
				updatedAt: coverLetter.updatedAt.toISOString(),
			},
			200,
		);
	},
);

coverLettersRoutes.openapi(
	createRoute({
		method: 'patch',
		path: '/cover-letters/:id',
		operationId: 'updateCoverLetter',
		tags: ['Cover Letters'],
		summary: 'Atualiza o título e/ou conteúdo de uma cover letter',
		middleware: [authenticateMiddleware],
		request: {
			params: z.object({ id: z.string().uuid() }),
			body: {
				required: true,
				content: {
					'application/json': { schema: updateCoverLetterBodySchema },
				},
			},
		},
		responses: {
			200: {
				description: 'Cover letter atualizada',
				content: {
					'application/json': { schema: coverLetterDetailSchema },
				},
			},
			400: createValidationErrorResponse('Dados inválidos'),
			404: createAppErrorResponse('Cover letter não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		const coverLetter = await controller.updateCoverLetter(id, user.id, body);
		return c.json(
			{
				id: coverLetter.id,
				title: coverLetter.title,
				content: coverLetter.content,
				baseResumeId: coverLetter.baseResumeId,
				jobMatchId: coverLetter.jobMatchId,
				createdAt: coverLetter.createdAt.toISOString(),
				updatedAt: coverLetter.updatedAt.toISOString(),
			},
			200,
		);
	},
);

coverLettersRoutes.openapi(
	createRoute({
		method: 'delete',
		path: '/cover-letters/:id',
		operationId: 'deleteCoverLetter',
		tags: ['Cover Letters'],
		summary: 'Remove uma cover letter',
		middleware: [authenticateMiddleware],
		request: { params: z.object({ id: z.string().uuid() }) },
		responses: {
			204: { description: 'Cover letter excluída com sucesso' },
			404: createAppErrorResponse('Cover letter não encontrada'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		await controller.deleteCoverLetter(id, user.id);
		return c.body(null, 204);
	},
);
