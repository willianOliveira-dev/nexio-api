import { db } from '@/lib/db/connection.js';
import * as schema from '@/lib/db/schemas/index.schema.js';

const FREE_MODELS_SEED = [
	{
		modelId: 'google/gemma-4-31b-it:free',
		name: 'Gemma 4 31B',
		provider: 'Google',
		contextWindow: 262144,
		isDefault: true,
		isActive: true,
		supportsVision: true,
	},
	{
		modelId: 'google/gemma-4-26b-a4b-it:free',
		name: 'Gemma 4 26B',
		provider: 'Google',
		contextWindow: 262144,
		isDefault: false,
		isActive: true,
		supportsVision: true,
	},
	{
		modelId: 'nvidia/nemotron-3-super-120b-a12b:free',
		name: 'Nemotron 3 Super 120B',
		provider: 'NVIDIA',
		contextWindow: 262144,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
	{
		modelId: 'nvidia/nemotron-nano-12b-v2-vl:free',
		name: 'Nemotron Nano 12B VL',
		provider: 'NVIDIA',
		contextWindow: 128000,
		isDefault: false,
		isActive: true,
		supportsVision: true,
	},
	{
		modelId: 'qwen/qwen3-next-80b-a3b-instruct:free',
		name: 'Qwen3 Next 80B',
		provider: 'Qwen',
		contextWindow: 262144,
		isDefault: false,
		isActive: true,
		supportsVision: false,
	},
	{
		modelId: 'openai/gpt-oss-120b:free',
		name: 'GPT OSS 120B',
		provider: 'OpenAI',
		contextWindow: 131072,
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
