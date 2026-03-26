import PDFDocument from 'pdfkit';
import type { ExportCoverLetterData } from './cover-letter-types.js';

/**
 * Gera um PDF profissional de cover letter seguindo padrões de mercado:
 * - Margens de 1 polegada (72 pontos) em todos os lados
 * - Fonte Helvetica 11pt para corpo do texto
 * - Espaçamento de 1.5 linhas entre parágrafos
 * - Layout limpo e ATS-friendly
 */
export async function buildCoverLetterPdf(
	data: ExportCoverLetterData,
	_language: 'pt' | 'en',
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		// Margens profissionais: 1 polegada (72 pontos) = ~2.54cm
		const doc = new PDFDocument({
			size: 'A4',
			margin: 72,
		});
		const chunks: Buffer[] = [];

		doc.on('data', (chunk: Buffer) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		// Data atual formatada (padrão de carta profissional)
		const currentDate = new Date().toLocaleDateString('pt-BR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

		// Data no topo (alinhada à direita, padrão de carta formal)
		doc.fontSize(10).font('Helvetica').text(currentDate, { align: 'right' });
		doc.moveDown(1.5);

		// Título da carta (opcional, pode ser omitido em cartas formais)
		// Mantido para identificação do documento
		doc.fontSize(12).font('Helvetica-Bold').text(data.title, { align: 'left' });
		doc.moveDown(1);

		// Corpo da carta com espaçamento profissional
		const paragraphs = data.content.split('\n\n');

		for (let i = 0; i < paragraphs.length; i++) {
			const paragraph = paragraphs[i]?.trim();
			if (!paragraph) continue;

			// Fonte 11pt para corpo do texto (padrão profissional)
			doc.fontSize(11).font('Helvetica').text(paragraph, {
				align: 'left', // Alinhamento à esquerda é mais profissional que justify
				lineGap: 3, // Espaçamento entre linhas dentro do parágrafo
			});

			// Espaçamento entre parágrafos (1.5 linhas)
			if (i < paragraphs.length - 1) {
				doc.moveDown(1.5);
			}
		}

		doc.end();
	});
}
