import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { env } from '@/config/env.js';

export const openRouterProvider = createOpenAI({
	baseURL: 'https://openrouter.ai/api/v1',
	apiKey: env.OPENROUTER_API_KEY,
	headers: {
		'HTTP-Referer': env.APP_URL,
		'X-Title': env.APP_NAME,
	},
});

export const openRouterClient = new OpenAI({
	baseURL: 'https://openrouter.ai/api/v1',
	apiKey: env.OPENROUTER_API_KEY,
	defaultHeaders: {
		'HTTP-Referer': env.APP_URL,
		'X-Title': env.APP_NAME,
	},
});
