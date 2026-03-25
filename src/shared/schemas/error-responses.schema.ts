import { z } from '@hono/zod-openapi';

export const appErrorResponseSchema = z.object({
	code: z.string().openapi({ example: 'NOT_FOUND' }),
	message: z.string().openapi({ example: 'Usuário não encontrado' }),
});

export const validationErrorResponseSchema = z.object({
	code: z.literal('VALIDATION_ERROR'),
	message: z.literal('Dados inválidos'),
	details: z.array(
		z.object({
			field: z.string().openapi({ example: 'email' }),
			message: z.string().openapi({ example: 'Email inválido' }),
		}),
	),
});

export const standardAuthErrors = {
	401: {
		description: 'Não Autorizado — Sessão ausente, inválida ou expirada',
		content: { 'application/json': { schema: appErrorResponseSchema } },
	},
	500: {
		description: 'Erro Interno do Servidor',
		content: { 'application/json': { schema: appErrorResponseSchema } },
	},
} as const;

export const createAppErrorResponse = (description: string) =>
	({
		description,
		content: { 'application/json': { schema: appErrorResponseSchema } },
	}) as const;

export const createValidationErrorResponse = (description: string) =>
	({
		description,
		content: { 'application/json': { schema: validationErrorResponseSchema } },
	}) as const;
