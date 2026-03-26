import type { OpenAPIHono } from '@hono/zod-openapi';
import { aiChatRoutes } from '@/modules/ai-chat/routes/ai-chat.routes.js';
import { authRoutes } from '@/modules/auth/routes/auth.routes.js';
import { exportsRoutes } from '@/modules/exports/routes/exports.routes.js';
import { healthRoutes } from '@/modules/health/routes/healt.routes.js';
import { jobMatchesRoutes } from '@/modules/job-matches/routes/job-matches.routes.js';
import { resumesRoutes } from '@/modules/resumes/routes/resumes.routes.js';
import { swaggerRoutes } from '@/modules/swagger/routes/swagger.routes.js';
import { usersRoutes } from '@/modules/users/routes/users.routes.js';

export function regiterRoutes(app: OpenAPIHono) {
	app.route('/', authRoutes);
	app.route('/', healthRoutes);
	app.route('/api/v1', usersRoutes);
	app.route('/api/v1', resumesRoutes);
	app.route('/api/v1', jobMatchesRoutes);
	app.route('/api/v1', aiChatRoutes);
	app.route('/api/v1', exportsRoutes);
	swaggerRoutes(app);
}
