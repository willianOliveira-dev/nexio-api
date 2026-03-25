import type { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { env } from '@/config/env.js';

export function swaggerRoutes(app: OpenAPIHono) {
	app.doc('/doc', {
		openapi: '3.1.0',
		info: {
			title: 'Nexio API',
			version: env.API_VERSION,
			description:
				'O Nexio API é um sistema inteligente que utiliza IA para transformar currículos comuns em perfis de alto impacto. O sistema analisa o CV do usuário, compara com descrições de vagas reais, sugere melhorias em tempo real via chat e gera versões otimizadas para sistemas de recrutamento (ATS). ',
		},
		servers: [
			{
				url: `http://localhost:${env.PORT}`,
				description: 'Localhost',
			},
			{
				url: env.BASE_URL,
				description: 'Production',
			},
		],
	}),
		app.get(
			'/docs',
			Scalar({
				pageTitle: 'Nexio API Documentação',
				theme: 'bluePlanet',
				sources: [
					{
						title: 'Nexio API',
						url: '/doc',
					},
					{
						title: 'Auth API',
						url: '/api/auth/open-api/generate-schema',
					},
				],
			}),
		);
}
