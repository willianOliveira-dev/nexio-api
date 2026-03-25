import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors/app.error.js';

function handleZodError(error: ZodError, c: Context) {
	const issues = error.issues.map((issue) => {
		return {
			field: issue.path.join('.') || 'unknown',
			message: issue.message,
		};
	});
	return c.json({
		code: 'VALIDATION_ERROR',
		message: 'Dados inválidos',
		details: issues,
	});
}

function handleAppError(error: AppError, c: Context) {
	if (error.statusCode >= 500) {
		console.error(`[${error.code}]`, error.message, error.stack);
	}
	return c.json({ code: error.code, message: error.message }, error.statusCode);
}

export function errorHandler(error: Error, c: Context) {
	if (error instanceof ZodError) {
		return handleZodError(error, c);
	}

	if (error instanceof AppError) {
		return handleAppError(error, c);
	}
	return c.json({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno do servidor' }, 500);
}
