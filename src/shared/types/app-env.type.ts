import type { AuthVariables } from '@/middlewares/auth/auth.middleware.js';

/**
 * Env global da aplicação Hono.
 * Deve ser propagado por todos os lugares que criam ou recebem OpenAPIHono.
 */
export type AppEnv = {
	Variables: AuthVariables;
};
