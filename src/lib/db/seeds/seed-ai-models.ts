import { db } from '@/lib/db/connection.js';
import * as schema from '@/lib/db/schemas/index.schema.js';

const FREE_MODELS_SEED = [
	{
		modelId: 'google/gemma-4-31b-it:free',
		name: 'Gemma 4 31B',
		description: 'Rápido e versátil — ideal para o dia a dia',
		provider: 'Google',
		contextWindow: 262144,
		isDefault: true,
		isActive: true,
		supportsVision: true,
	},
	{
		modelId: 'google/gemma-4-26b-a4b-it:free',
		name: 'Gemma 4 26B',
		description: 'Compacto e eficiente para respostas instantâneas',
		provider: 'Google',
		contextWindow: 262144,
		isDefault: false,
		isActive: true,
		supportsVision: true,
	},
	{
		modelId: 'nvidia/nemotron-3-super-120b-a12b:free',
		name: 'Nemotron 3 Super 120B',
		description: 'Análises profundas e matching avançado de vagas',
		provider: 'NVIDIA',
		contextWindow: 262144,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
	{
		modelId: 'nvidia/nemotron-nano-12b-v2-vl:free',
		name: 'Nemotron Nano 12B VL',
		description: 'Suporte a visão — analise imagens de currículos',
		provider: 'NVIDIA',
		contextWindow: 128000,
		isDefault: false,
		isActive: true,
		supportsVision: true,
	},
	{
		modelId: 'qwen/qwen3-next-80b-a3b-instruct:free',
		name: 'Qwen3 Next 80B',
		description: 'Raciocínio avançado para recomendações estratégicas',
		provider: 'Qwen',
		contextWindow: 262144,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
	{
		modelId: 'openai/gpt-oss-120b:free',
		name: 'GPT OSS 120B',
		description: 'Geração de texto longa e reescrita completa de seções',
		provider: 'OpenAI',
		contextWindow: 131072,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
	{
		modelId: 'meta-llama/llama-3.3-70b-instruct:free',
		name: 'Llama 3.3 70B',
		description: 'Multilíngue e equilibrado — excelente para currículos e análise de vagas',
		provider: 'Meta',
		contextWindow: 131072,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
	{
		modelId: 'minimax/minimax-m2.5:free',
		name: 'MiniMax M2.5',
		description: 'Alta qualidade em tarefas complexas — rivaliza com modelos premium',
		provider: 'MiniMax',
		contextWindow: 196608,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
];

export async function seedAiModels(): Promise<void> {
	await db.insert(schema.aiModels).values(FREE_MODELS_SEED).onConflictDoNothing();
	console.info('[seed] AI models seeded successfully.');
}

seedAiModels()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('[seed] Failed to seed AI models:', err);
		process.exit(1);
	});
