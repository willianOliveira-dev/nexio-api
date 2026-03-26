import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import type { ExportCoverLetterData } from './cover-letter-types.js';

export async function buildCoverLetterDocx(data: ExportCoverLetterData): Promise<Buffer> {
	const sections: Paragraph[] = [];

	const currentDate = new Date().toLocaleDateString('pt-BR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	sections.push(
		new Paragraph({
			alignment: AlignmentType.RIGHT,
			spacing: { after: 360 },
			children: [
				new TextRun({
					text: currentDate,
					size: 20,
					font: 'Calibri',
				}),
			],
		}),
	);

	sections.push(
		new Paragraph({
			alignment: AlignmentType.LEFT,
			spacing: { after: 240 },
			children: [
				new TextRun({
					text: data.title,
					bold: true,
					size: 24,
					font: 'Calibri',
				}),
			],
		}),
	);

	const paragraphs = data.content.split('\n\n');

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i]?.trim();
		if (!paragraph) continue;

		sections.push(
			new Paragraph({
				alignment: AlignmentType.LEFT,
				spacing: {
					after: i < paragraphs.length - 1 ? 360 : 0,
					line: 276,
				},
				children: [
					new TextRun({
						text: paragraph,
						size: 22,
						font: 'Calibri',
					}),
				],
			}),
		);
	}

	const doc = new Document({
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: 1440,
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
