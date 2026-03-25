import { createMiddleware } from 'hono/factory';
import { auth } from '@/lib/auth/auth.lib.js';
import { UnauthorizedError } from '@/shared/errors/app.error.js';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AuthVariables = {
	session: Session;
};

export const authenticateMiddleware = createMiddleware<{
	Variables: AuthVariables;
}>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		throw new UnauthorizedError('Usuário não autenticado');
	}

	c.set('session', session);
	await next();
});
