import { createQueues, getBoss } from '@/lib/queue/pg-boss.client.js';
import { startCreditsResetWorker } from './credits-reset.worker.js';
import { startExportGenerateWorker } from './export-generate.worker.js';
import { startResumeAnalyzeWorker } from './resume-analyze.worker.js';
import { startScoreRecalculateWorker } from './score-recalculate.worker.js';

export async function startAllWorkers(): Promise<void> {
	console.info('[workers] Iniciando todos os workers...');

	await getBoss();
	console.info('[workers] pg-boss inicializado com sucesso.');

	await createQueues();
	console.info('[workers] Filas criadas com sucesso.');

	console.info('[workers] Aguardando pg-boss estar completamente pronto...');

	await new Promise((resolve) => setTimeout(resolve, 2000));

	console.info('[workers] Iniciando resume analyze worker...');
	await startResumeAnalyzeWorker();

	console.info('[workers] Iniciando export generate worker...');
	await startExportGenerateWorker();

	console.info('[workers] Iniciando score recalculate worker...');
	await startScoreRecalculateWorker();

	console.info('[workers] Iniciando credits reset worker...');
	await startCreditsResetWorker();

	console.info('[workers] Todos os workers foram iniciados com sucesso.');
}
