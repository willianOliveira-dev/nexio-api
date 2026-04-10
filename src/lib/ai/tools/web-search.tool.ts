import { tool } from 'ai';
import { z } from 'zod';
import { env } from '@/config/env.js';

export const webSearchTool = tool({
	description:
		'Busca informações atualizadas e em tempo real na internet. Use esta ferramenta quando o usuário perguntar sobre notícias recentes, fatos atuais ou dados que o modelo possa desconhecer.',
	inputSchema: z.object({
		query: z.string().describe('A string de busca em linguagem natural ou palavras-chave.'),
	}),
	execute: async ({ query }) => {
		if (!env.TAVILY_API_KEY) {
			return {
				error: 'Tavily API key não configurada no servidor. Busca abortada.',
			};
		}

		try {
			const res = await fetch('https://api.tavily.com/search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					api_key: env.TAVILY_API_KEY,
					query,
					search_depth: 'basic',
					include_answer: true,
					max_results: 5,
				}),
			});

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`API Tavily falhou: ${res.status} - ${errorText}`);
			}

			const data = (await res.json()) as {
				answer?: string;
				results: { title: string; content: string; url: string }[];
			};

			const formattedResults = data.results
				.map((r) => `[${r.title}](${r.url})\n${r.content}`)
				.join('\n\n');

			return {
				answer: data.answer || 'Nenhuma resposta direta gerada.',
				results: formattedResults,
				context: `Os seguintes trechos de páginas web foram encontrados:\n\n${formattedResults}`,
			};
		} catch (error) {
			console.error('[WebSearchTool] Erro inesperado:', error);
			return {
				error: `A busca falhou com erro: ${error instanceof Error ? error.message : 'Erro Desconhecido'}`,
			};
		}
	},
});
