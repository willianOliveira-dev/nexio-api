import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
	constructor(
		override readonly message: string,
		public readonly statusCode: ContentfulStatusCode,
		public readonly code: string,
	) {
		super(message);
		this.name = 'AppError';
		Error.captureStackTrace(this, this.constructor);
	}
}

export class NotFoundError extends AppError {
	constructor(r: string) {
		super(`${r} não encontrado`, 404, 'NOT_FOUND');
	}
}
export class ConflictError extends AppError {
	constructor(m: string) {
		super(m, 409, 'CONFLICT');
	}
}
export class BadRequestError extends AppError {
	constructor(m: string) {
		super(m, 400, 'BAD_REQUEST');
	}
}
export class UnauthorizedError extends AppError {
	constructor(m = 'Não autorizado') {
		super(m, 401, 'UNAUTHORIZED');
	}
}
export class ForbiddenError extends AppError {
	constructor(m = 'Acesso negado') {
		super(m, 403, 'FORBIDDEN');
	}
}
export class InternalServerError extends AppError {
	constructor(m = 'Erro interno do servidor') {
		super(m, 500, 'INTERNAL_SERVER_ERROR');
	}
}
