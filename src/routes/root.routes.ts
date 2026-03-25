import type { OpenAPIHono } from '@hono/zod-openapi';
import { authRoutes } from '@/modules/auth/routes/auth.routes.js';
import { healthRoutes } from '@/modules/health/routes/healt.routes.js';
import { swaggerRoutes } from '@/modules/swagger/routes/swagger.routes.js';
import { usersRoutes } from '@/modules/users/routes/users.routes.js';

export function regiterRoutes(app: OpenAPIHono) {
	app.route('/', authRoutes);
	app.route('/', healthRoutes);
	app.route('/', usersRoutes);
	swaggerRoutes(app);
}
