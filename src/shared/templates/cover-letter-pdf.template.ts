import PDFDocument from 'pdfkit';
import type { ExportCoverLetterData } from './cover-letter-types.js';

export async function buildCoverLetterPdf(
	data: ExportCoverLetterData,
	_language: 'pt' | 'en',
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margin: 72,
		});
		const chunks: Buffer[] = [];

		doc.on('data', (chunk: Buffer) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		const currentDate = new Date().toLocaleDateString('pt-BR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

		doc.fontSize(10).font('Helvetica').text(currentDate, { align: 'right' });
		doc.moveDown(1.5);

		doc.fontSize(12).font('Helvetica-Bold').text(data.title, { align: 'left' });
		doc.moveDown(1);

		const paragraphs = data.content.split('\n\n');

		for (let i = 0; i < paragraphs.length; i++) {
			const paragraph = paragraphs[i]?.trim();
			if (!paragraph) continue;

			doc.fontSize(11).font('Helvetica').text(paragraph, {
				align: 'left',
				lineGap: 3,
			});

			if (i < paragraphs.length - 1) {
				doc.moveDown(1.5);
			}
		}

		doc.end();
	});
}
