import PDFDocument from 'pdfkit';
import type { ExportResumeData } from './export-types.js';
import { getLabels } from './export-types.js';

export async function buildResumePdf(
	data: ExportResumeData,
	language: 'pt' | 'en',
): Promise<Buffer> {
	const l = getLabels(language);

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A4', margin: 50 });
		const chunks: Buffer[] = [];

		doc.on('data', (chunk: Buffer) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fontSize(22).font('Helvetica-Bold').text(data.contact.fullName, { align: 'center' });
		doc.moveDown(0.3);

		const contactParts: string[] = [data.contact.email];
		if (data.contact.phone) contactParts.push(data.contact.phone);
		if (data.contact.location) contactParts.push(data.contact.location);
		if (data.contact.website) contactParts.push(data.contact.website);
		doc.fontSize(9).font('Helvetica').text(contactParts.join('  •  '), { align: 'center' });
		doc.moveDown(0.8);

		const drawSectionHeader = (title: string) => {
			doc.moveDown(0.5);
			doc.fontSize(12).font('Helvetica-Bold').text(title.toUpperCase());
			doc
				.moveTo(doc.x, doc.y + 2)
				.lineTo(doc.page.width - 50, doc.y + 2)
				.stroke('#333333');
			doc.moveDown(0.5);
		};

		if (data.professionalSummary) {
			drawSectionHeader(l.summary);
			doc.fontSize(10).font('Helvetica').text(data.professionalSummary);
		}

		if (data.workExperiences.length > 0) {
			drawSectionHeader(l.experience);
			for (const w of data.workExperiences) {
				const period = [w.startDate, w.endDate ?? l.present].filter(Boolean).join(' - ');
				doc.fontSize(11).font('Helvetica-Bold').text(w.title);
				doc
					.fontSize(10)
					.font('Helvetica')
					.text(`${w.company}${w.location ? ` | ${w.location}` : ''} | ${period}`);
				if (w.description) {
					doc.moveDown(0.2);
					for (const bullet of w.description.split('\n')) {
						const trimmed = bullet.trim();
						if (trimmed) {
							doc.fontSize(10).font('Helvetica').text(`•  ${trimmed}`, { indent: 10 });
						}
					}
				}
				doc.moveDown(0.4);
			}
		}

		if (data.educations.length > 0) {
			drawSectionHeader(l.education);
			for (const e of data.educations) {
				const period = [e.startDate, e.endDate].filter(Boolean).join(' - ');
				doc.fontSize(11).font('Helvetica-Bold').text(e.degree);
				doc
					.fontSize(10)
					.font('Helvetica')
					.text(
						`${e.institution}${e.location ? ` | ${e.location}` : ''}${period ? ` | ${period}` : ''}`,
					);
				doc.moveDown(0.3);
			}
		}

		if (data.skills.length > 0) {
			drawSectionHeader(l.skills);
			const grouped: Record<string, string[]> = {};
			for (const s of data.skills) {
				const cat = s.category ?? 'Geral';
				if (!grouped[cat]) grouped[cat] = [];
				grouped[cat]!.push(s.name);
			}
			for (const [category, items] of Object.entries(grouped)) {
				doc
					.fontSize(10)
					.font('Helvetica-Bold')
					.text(`${category}: `, { continued: true })
					.font('Helvetica')
					.text(items.join(', '));
			}
		}

		if (data.projects.length > 0) {
			drawSectionHeader(l.projects);
			for (const p of data.projects) {
				doc.fontSize(11).font('Helvetica-Bold').text(p.name);
				doc.fontSize(10).font('Helvetica').text(p.description);
				if (p.keywords?.length) {
					doc.fontSize(9).font('Helvetica-Oblique').text(p.keywords.join(', '));
				}
				if (p.url) {
					doc.fontSize(9).font('Helvetica').text(p.url, { link: p.url });
				}
				doc.moveDown(0.3);
			}
		}

		if (data.certifications.length > 0) {
			drawSectionHeader(l.certifications);
			for (const c of data.certifications) {
				const dates = [c.issueDate, c.expirationDate].filter(Boolean).join(' - ');
				doc.fontSize(11).font('Helvetica-Bold').text(c.name);
				doc
					.fontSize(10)
					.font('Helvetica')
					.text(`${c.issuer}${dates ? ` | ${dates}` : ''}`);
				if (c.url) {
					doc.fontSize(9).font('Helvetica').text(c.url, { link: c.url });
				}
				doc.moveDown(0.3);
			}
		}

		if (data.volunteering.length > 0) {
			drawSectionHeader(l.volunteering);
			for (const v of data.volunteering) {
				const period = [v.startDate, v.endDate].filter(Boolean).join(' - ');
				doc.fontSize(11).font('Helvetica-Bold').text(v.role);
				doc
					.fontSize(10)
					.font('Helvetica')
					.text(`${v.organization}${period ? ` | ${period}` : ''}`);
				if (v.description) {
					doc.fontSize(10).font('Helvetica').text(v.description);
				}
				doc.moveDown(0.3);
			}
		}

		if (data.languages.length > 0) {
			drawSectionHeader(l.languages);
			for (const lang of data.languages) {
				doc
					.fontSize(10)
					.font('Helvetica')
					.text(`${lang.name}${lang.proficiency ? ` — ${lang.proficiency}` : ''}`);
			}
		}

		doc.end();
	});
}
