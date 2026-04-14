import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';

export const listSkillsTool = tool({
	description:
		'Lista todas as habilidades (skills) disponíveis no sistema Nexio AI. Use para descobrir quais metodologias você pode aplicar.',
	inputSchema: z.object({}),
	execute: async () => {
		try {
			const skillsDir = path.join(process.cwd(), 'src', 'shared', 'skills');
			const files = await fs.readdir(skillsDir);
			const skills = [];

			for (const file of files) {
				if (!file.endsWith('.skill.md')) continue;
				const content = await fs.readFile(path.join(skillsDir, file), 'utf-8');

				const nameMatch = /^name:\s*(.*)$/m.exec(content);
				const descMatch = /^description:\s*["']?(.*?)["']?$/m.exec(content);

				skills.push({
					filename: file,
					name: nameMatch?.[1]?.trim() ?? file,
					description: descMatch?.[1]?.trim() ?? 'Nenhuma descrição disponível',
				});
			}

			return { skills };
		} catch (error) {
			console.error('[ListSkillsTool] Erro ao ler diretório de skills:', error);
			return { error: 'Falha ao listar as habilidades disponíveis.' };
		}
	},
});
