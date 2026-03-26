import { serveStatic } from '@hono/node-server/serve-static';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errors/error-handler.middleware.js';
import { regiterRoutes } from './routes/root.routes.js';

export function boostrapApp() {
	const app = new OpenAPIHono();

	app.onError(errorHandler);
	app.use('*', timing());
	app.use('*', logger());
	app.use('*', secureHeaders());
	app.use('/static/*', serveStatic({ root: './public' }));
	app.use(
		'*',
		cors({
			origin: env.ALLOWED_ORIGINS,
			allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
			credentials: true,
		}),
	);

	regiterRoutes(app);

	return app;
}
