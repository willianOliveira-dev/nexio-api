import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authenticateMiddleware } from '@/middlewares/auth/auth.middleware.js';
import {
	createAppErrorResponse,
	createValidationErrorResponse,
	standardAuthErrors,
} from '@/shared/schemas/error-responses.schema.js';
import type { AppEnv } from '@/shared/types/app-env.type.js';
import { ExportsController } from '../controllers/exports.controller.js';
import { createExportBodySchema } from '../schemas/create-export.dto.js';
import {
	exportDownloadResponseSchema,
	exportResponseSchema,
	exportStatusResponseSchema,
	paginatedExportsSchema,
	publicExportResponseSchema,
	shareResponseSchema,
} from '../schemas/responses.schema.js';
import { shareExportBodySchema } from '../schemas/share-export.dto.js';

export const exportsRoutes = new OpenAPIHono<AppEnv>();
const controller = new ExportsController();

const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

exportsRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/exports',
		operationId: 'createExport',
		tags: ['Exports'],
		summary: 'Cria um novo export (assíncrono)',
		middleware: [authenticateMiddleware] as const,
		request: {
			body: {
				required: true,
				content: { 'application/json': { schema: createExportBodySchema } },
			},
		},
		responses: {
			202: {
				description: 'Export criado e enfileirado',
				content: { 'application/json': { schema: exportResponseSchema } },
			},
			400: createValidationErrorResponse('Dados inválidos'),
			403: createAppErrorResponse('Formato requer plano superior'),
			404: createAppErrorResponse('Documento não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const body = c.req.valid('json');
		const record = await controller.createExport(user.id, body);
		return c.json(
			{
				id: record.id,
				status: record.status,
				documentType: record.documentType,
				format: record.format,
				language: record.language,
				shareToken: record.shareToken ?? null,
				shareExpiresAt: record.shareExpiresAt?.toISOString() ?? null,
				downloadUrl: null,
				createdAt: record.createdAt.toISOString(),
			},
			202,
		);
	},
);

exportsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/exports',
		operationId: 'listExports',
		tags: ['Exports'],
		summary: 'Lista os exports do usuário',
		middleware: [authenticateMiddleware] as const,
		request: { query: paginationQuerySchema },
		responses: {
			200: {
				description: 'Lista paginada de exports',
				content: { 'application/json': { schema: paginatedExportsSchema } },
			},
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { page, limit } = c.req.valid('query');
		const result = await controller.listExports(user.id, { page, limit });
		return c.json(
			{
				data: result.data.map((e) => ({
					id: e.id,
					status: e.status,
					documentType: e.documentType,
					format: e.format,
					language: e.language,
					shareToken: e.shareToken ?? null,
					shareExpiresAt: e.shareExpiresAt?.toISOString() ?? null,
					downloadUrl: null,
					createdAt: e.createdAt.toISOString(),
				})),
				meta: result.meta,
			},
			200,
		);
	},
);

exportsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/exports/{id}',
		operationId: 'getExport',
		tags: ['Exports'],
		summary: 'Obtém detalhes de um export',
		middleware: [authenticateMiddleware] as const,
		request: {
			params: z.object({ id: z.string().uuid() }),
		},
		responses: {
			200: {
				description: 'Detalhes do export',
				content: { 'application/json': { schema: exportResponseSchema } },
			},
			404: createAppErrorResponse('Export não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const record = await controller.getExport(id, user.id);
		return c.json(
			{
				id: record.id,
				status: record.status,
				documentType: record.documentType,
				format: record.format,
				language: record.language,
				shareToken: record.shareToken ?? null,
				shareExpiresAt: record.shareExpiresAt?.toISOString() ?? null,
				downloadUrl: record.downloadUrl,
				createdAt: record.createdAt.toISOString(),
			},
			200,
		);
	},
);

exportsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/exports/{id}/status',
		operationId: 'getExportStatus',
		tags: ['Exports'],
		summary: 'Verifica o status de um export (para polling)',
		middleware: [authenticateMiddleware] as const,
		request: {
			params: z.object({ id: z.string().uuid() }),
		},
		responses: {
			200: {
				description: 'Status do export',
				content: { 'application/json': { schema: exportStatusResponseSchema } },
			},
			404: createAppErrorResponse('Export não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const result = await controller.getExportStatus(id, user.id);
		return c.json(result, 200);
	},
);

exportsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/exports/{id}/download',
		operationId: 'downloadExport',
		tags: ['Exports'],
		summary: 'Gera URL presigned para download (15 min)',
		middleware: [authenticateMiddleware] as const,
		request: {
			params: z.object({ id: z.string().uuid() }),
		},
		responses: {
			200: {
				description: 'URL de download',
				content: { 'application/json': { schema: exportDownloadResponseSchema } },
			},
			400: createAppErrorResponse('Export não concluído'),
			404: createAppErrorResponse('Export não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const result = await controller.downloadExport(id, user.id);
		return c.json(result, 200);
	},
);

exportsRoutes.openapi(
	createRoute({
		method: 'post',
		path: '/exports/{id}/share',
		operationId: 'shareExport',
		tags: ['Exports'],
		summary: 'Gera link compartilhável para o export',
		middleware: [authenticateMiddleware] as const,
		request: {
			params: z.object({ id: z.string().uuid() }),
			body: {
				required: false,
				content: { 'application/json': { schema: shareExportBodySchema } },
			},
		},
		responses: {
			200: {
				description: 'Link de compartilhamento',
				content: { 'application/json': { schema: shareResponseSchema } },
			},
			400: createAppErrorResponse('Export não concluído'),
			404: createAppErrorResponse('Export não encontrado'),
			...standardAuthErrors,
		},
	}),
	async (c) => {
		const { user } = c.get('session');
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		const result = await controller.generateShareLink(id, user.id, body.expiresInDays);
		return c.json(result, 200);
	},
);

exportsRoutes.openapi(
	createRoute({
		method: 'get',
		path: '/exports/public/{shareToken}',
		operationId: 'getPublicExport',
		tags: ['Exports'],
		summary: 'Acessa export público via share token (sem autenticação)',
		request: {
			params: z.object({ shareToken: z.string() }),
		},
		responses: {
			200: {
				description: 'URL de download público',
				content: { 'application/json': { schema: publicExportResponseSchema } },
			},
			404: createAppErrorResponse('Link inválido ou expirado'),
		},
	}),
	async (c) => {
		const { shareToken } = c.req.valid('param');
		const result = await controller.getPublicExport(shareToken);
		return c.json(result, 200);
	},
);
