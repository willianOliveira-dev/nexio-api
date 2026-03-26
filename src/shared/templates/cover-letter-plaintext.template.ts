import type { ExportCoverLetterData } from './cover-letter-types.js';

export function buildCoverLetterPlainText(data: ExportCoverLetterData): string {
	const lines: string[] = [];

	const currentDate = new Date().toLocaleDateString('pt-BR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	lines.push(currentDate);
	lines.push('');
	lines.push('');

	lines.push(data.title);
	lines.push('');
	lines.push('');

	const paragraphs = data.content.split('\n\n');

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i]?.trim();
		if (!paragraph) continue;

		const wrappedParagraph = wrapText(paragraph, 80);
		lines.push(wrappedParagraph);

		if (i < paragraphs.length - 1) {
			lines.push('');
			lines.push('');
		}
	}

	lines.push('');
	lines.push('');

	return lines.join('\n');
}

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
