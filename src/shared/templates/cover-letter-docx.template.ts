import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import type { ExportCoverLetterData } from './cover-letter-types.js';

/**
 * Gera um DOCX profissional de cover letter seguindo padrões de mercado:
 * - Margens de 1 polegada (1440 twips) em todos os lados
 * - Fonte Calibri 11pt para corpo do texto
 * - Espaçamento de 1.5 linhas entre parágrafos (360 twips)
 * - Layout limpo e ATS-friendly
 */
export async function buildCoverLetterDocx(data: ExportCoverLetterData): Promise<Buffer> {
	const sections: Paragraph[] = [];

	// Data atual formatada (padrão de carta profissional)
	const currentDate = new Date().toLocaleDateString('pt-BR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	// Data no topo (alinhada à direita)
	sections.push(
		new Paragraph({
			alignment: AlignmentType.RIGHT,
			spacing: { after: 360 }, // 1.5 linhas
			children: [
				new TextRun({
					text: currentDate,
					size: 20, // 10pt
					font: 'Calibri',
				}),
			],
		}),
	);

	// Título da carta
	sections.push(
		new Paragraph({
			alignment: AlignmentType.LEFT,
			spacing: { after: 240 }, // 1 linha
			children: [
				new TextRun({
					text: data.title,
					bold: true,
					size: 24, // 12pt
					font: 'Calibri',
				}),
			],
		}),
	);

	// Corpo da carta com espaçamento profissional
	const paragraphs = data.content.split('\n\n');

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i]?.trim();
		if (!paragraph) continue;

		sections.push(
			new Paragraph({
				alignment: AlignmentType.LEFT, // Alinhamento à esquerda é mais profissional
				spacing: {
					after: i < paragraphs.length - 1 ? 360 : 0, // 1.5 linhas entre parágrafos
					line: 276, // Espaçamento de linha 1.15 (padrão profissional)
				},
				children: [
					new TextRun({
						text: paragraph,
						size: 22, // 11pt (padrão profissional)
						font: 'Calibri',
					}),
				],
			}),
		);
	}

	// Margens de 1 polegada (1440 twips) em todos os lados
	const doc = new Document({
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: 1440, // 1 polegada
							right: 1440,
							bottom: 1440,
							left: 1440,
						},
					},
				},
				children: sections,
			},
		],
	});

	const buffer = await Packer.toBuffer(doc);
	return Buffer.from(buffer);
}
