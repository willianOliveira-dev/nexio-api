import { serve } from '@hono/node-server';
import { boostrapApp } from './app.js';
import { env } from './config/env.js';

const app = boostrapApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
	console.log(`Serve listening on http://localhost:${info.port}`);
});
