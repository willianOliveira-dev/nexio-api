import type { ExportCoverLetterData } from './cover-letter-types.js';

/**
 * Gera um texto plano profissional de cover letter seguindo padrões de mercado:
 * - Data no topo
 * - Título da carta
 * - Parágrafos separados por linha em branco
 * - Largura máxima de 80 caracteres para legibilidade
 * - Layout limpo e ATS-friendly
 */
export function buildCoverLetterPlainText(data: ExportCoverLetterData): string {
	const lines: string[] = [];

	// Data atual formatada
	const currentDate = new Date().toLocaleDateString('pt-BR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	// Data no topo
	lines.push(currentDate);
	lines.push('');
	lines.push('');

	// Título da carta
	lines.push(data.title);
	lines.push('');
	lines.push('');

	// Corpo da carta com formatação profissional
	const paragraphs = data.content.split('\n\n');

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i]?.trim();
		if (!paragraph) continue;

		// Quebra de linha a cada 80 caracteres para melhor legibilidade
		const wrappedParagraph = wrapText(paragraph, 80);
		lines.push(wrappedParagraph);

		// Linha em branco entre parágrafos
		if (i < paragraphs.length - 1) {
			lines.push('');
			lines.push('');
		}
	}

	lines.push('');
	lines.push('');

	return lines.join('\n');
}

/**
 * Quebra texto em linhas de no máximo `maxWidth` caracteres,
 * respeitando limites de palavras
 */
function wrapText(text: string, maxWidth: number): string {
	const words = text.split(' ');
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;

		if (testLine.length <= maxWidth) {
			currentLine = testLine;
		} else {
			if (currentLine) {
				lines.push(currentLine);
			}
			currentLine = word;
		}
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines.join('\n');
}
