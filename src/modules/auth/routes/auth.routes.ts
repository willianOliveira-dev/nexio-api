import type { OpenAPIHono } from '@hono/zod-openapi';
import { auth } from '@/lib/auth/auth.lib.js';

export function authRoutes(app: OpenAPIHono) {
	app.all('/api/auth/*', async (c) => {
		return auth.handler(c.req.raw);
	});
	app.get('/api/auth/open-api/generate-schema', async (c) => {
		const openApiAuthSchema = await auth.api.generateOpenAPISchema();
		return c.json(openApiAuthSchema);
	});
}
