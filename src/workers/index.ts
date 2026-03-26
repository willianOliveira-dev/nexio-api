import { startCreditsResetWorker } from './credits-reset.worker.js';
import { startExportGenerateWorker } from './export-generate.worker.js';
import { startResumeAnalyzeWorker } from './resume-analyze.worker.js';
import { startScoreRecalculateWorker } from './score-recalculate.worker.js';

export async function startAllWorkers(): Promise<void> {
	console.info('[workers] Iniciando todos os workers...');

	await Promise.all([
		startResumeAnalyzeWorker(),
		startExportGenerateWorker(),
		startScoreRecalculateWorker(),
		startCreditsResetWorker(),
	]);

	console.info('[workers] Todos os workers foram iniciados com sucesso.');
}
