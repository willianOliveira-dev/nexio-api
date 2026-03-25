import { OpenAPIHono } from '@hono/zod-openapi';
import { auth } from '@/lib/auth/auth.lib.js';

export const authRoutes = new OpenAPIHono();

authRoutes.all('/api/auth/*', async (c) => {
	return auth.handler(c.req.raw);
});

authRoutes.get('/api/auth/open-api/generate-schema', async (c) => {
	const openApiAuthSchema = await auth.api.generateOpenAPISchema();
	return c.json(openApiAuthSchema);
});
