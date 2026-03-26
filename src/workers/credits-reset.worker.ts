import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import { getBoss } from '@/lib/queue/pg-boss.client.js';

export const CREDITS_RESET_JOB = 'credits:reset';

export async function startCreditsResetWorker(): Promise<void> {
	const boss = await getBoss();

	await boss.schedule(CREDITS_RESET_JOB, '0 0 1 * *', {});

	boss.work(CREDITS_RESET_JOB, async () => {
		console.info('[credits:reset] Iniciando reset mensal de créditos...');

		await db
			.update(schema.userProfiles)
			.set({ aiCreditsUsed: 0 })
			.where(eq(schema.userProfiles.aiCreditsUsed, schema.userProfiles.aiCreditsUsed));

		console.info('[credits:reset] Reset concluído. Perfis atualizados.');
	});

	console.info('[credits:reset] Worker iniciado. Agendado para executar todo dia 1 às 00:00.');
}
