import { serve } from '@hono/node-server';
import { boostrapApp } from './app.js';
import { env } from './config/env.js';
import { startAllWorkers } from './workers/index.js';

async function startServer() {
	const app = boostrapApp();

	await startAllWorkers();

	serve({ fetch: app.fetch, port: env.PORT }, (info) => {
		console.log(`Serve listening on http://localhost:${info.port}`);
	});
}

startServer();
