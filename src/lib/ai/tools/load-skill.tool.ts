import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';

export const loadSkillTool = tool({
	description:
		'Carrega o conteúdo detalhado de uma habilidade específica (metodologia, regras e exemplos).',
	inputSchema: z.object({
		filename: z
			.string()
			.describe('O nome do arquivo da skill que deseja carregar (ex: "resume-rewrite.skill.md")'),
	}),
	execute: async ({ filename }: { filename: string }) => {
		try {
			const sanitizedFilename = path.basename(filename);
			const filePath = path.join(process.cwd(), 'src', 'shared', 'skills', sanitizedFilename);

			try {
				await fs.access(filePath);
			} catch {
				return { error: `Arquivo de skill ${sanitizedFilename} não encontrado.` };
			}

			const content = await fs.readFile(filePath, 'utf-8');
			return { content };
		} catch (error) {
			console.error(`[LoadSkillTool] Erro ao ler skill ${filename}:`, error);
			return { error: `Falha ao carregar a skill ${filename}.` };
		}
	},
});
