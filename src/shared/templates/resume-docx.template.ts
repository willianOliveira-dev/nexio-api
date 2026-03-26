import {
	AlignmentType,
	BorderStyle,
	Document,
	HeadingLevel,
	Packer,
	Paragraph,
	TextRun,
} from 'docx';
import type { ExportResumeData } from './export-types.js';
import { getLabels } from './export-types.js';

function sectionHeader(title: string): Paragraph {
	return new Paragraph({
		heading: HeadingLevel.HEADING_2,
		spacing: { before: 300, after: 100 },
		border: {
			bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
		},
		children: [
			new TextRun({
				text: title.toUpperCase(),
				bold: true,
				size: 24,
				font: 'Calibri',
			}),
		],
	});
}

export async function buildResumeDocx(
	data: ExportResumeData,
	language: 'pt' | 'en',
): Promise<Buffer> {
	const l = getLabels(language);
	const sections: Paragraph[] = [];

	sections.push(
		new Paragraph({
			alignment: AlignmentType.CENTER,
			spacing: { after: 50 },
			children: [
				new TextRun({
					text: data.contact.fullName,
					bold: true,
					size: 36,
					font: 'Calibri',
				}),
			],
		}),
	);

	const contactParts: string[] = [data.contact.email];
	if (data.contact.phone) contactParts.push(data.contact.phone);
	if (data.contact.location) contactParts.push(data.contact.location);
	if (data.contact.website) contactParts.push(data.contact.website);

	sections.push(
		new Paragraph({
			alignment: AlignmentType.CENTER,
			spacing: { after: 200 },
			children: [
				new TextRun({
					text: contactParts.join('  •  '),
					size: 18,
					font: 'Calibri',
					color: '666666',
				}),
			],
		}),
	);

	if (data.professionalSummary) {
		sections.push(sectionHeader(l.summary));
		sections.push(
			new Paragraph({
				children: [new TextRun({ text: data.professionalSummary, size: 20, font: 'Calibri' })],
			}),
		);
	}

	if (data.workExperiences.length > 0) {
		sections.push(sectionHeader(l.experience));
		for (const w of data.workExperiences) {
			const period = [w.startDate, w.endDate ?? l.present].filter(Boolean).join(' - ');
			sections.push(
				new Paragraph({
					spacing: { before: 100 },
					children: [new TextRun({ text: w.title, bold: true, size: 22, font: 'Calibri' })],
				}),
			);
			sections.push(
				new Paragraph({
					children: [
						new TextRun({
							text: `${w.company}${w.location ? ` | ${w.location}` : ''} | ${period}`,
							size: 20,
							font: 'Calibri',
							color: '555555',
						}),
					],
				}),
			);
			if (w.description) {
				for (const bullet of w.description.split('\n')) {
					const trimmed = bullet.trim();
					if (trimmed) {
						sections.push(
							new Paragraph({
								bullet: { level: 0 },
								children: [new TextRun({ text: trimmed, size: 20, font: 'Calibri' })],
							}),
						);
					}
				}
			}
		}
	}

	if (data.educations.length > 0) {
		sections.push(sectionHeader(l.education));
		for (const e of data.educations) {
			const period = [e.startDate, e.endDate].filter(Boolean).join(' - ');
			sections.push(
				new Paragraph({
					spacing: { before: 100 },
					children: [new TextRun({ text: e.degree, bold: true, size: 22, font: 'Calibri' })],
				}),
			);
			sections.push(
				new Paragraph({
					children: [
						new TextRun({
							text: `${e.institution}${e.location ? ` | ${e.location}` : ''}${period ? ` | ${period}` : ''}`,
							size: 20,
							font: 'Calibri',
							color: '555555',
						}),
					],
				}),
			);
		}
	}

	if (data.skills.length > 0) {
		sections.push(sectionHeader(l.skills));
		const grouped: Record<string, string[]> = {};
		for (const s of data.skills) {
			const cat = s.category ?? 'Geral';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat]!.push(s.name);
		}
		for (const [category, items] of Object.entries(grouped)) {
			sections.push(
				new Paragraph({
					children: [
						new TextRun({ text: `${category}: `, bold: true, size: 20, font: 'Calibri' }),
						new TextRun({ text: items.join(', '), size: 20, font: 'Calibri' }),
					],
				}),
			);
		}
	}

	if (data.projects.length > 0) {
		sections.push(sectionHeader(l.projects));
		for (const p of data.projects) {
			sections.push(
				new Paragraph({
					spacing: { before: 100 },
					children: [new TextRun({ text: p.name, bold: true, size: 22, font: 'Calibri' })],
				}),
			);
			sections.push(
				new Paragraph({
					children: [new TextRun({ text: p.description, size: 20, font: 'Calibri' })],
				}),
			);
			if (p.keywords?.length) {
				sections.push(
					new Paragraph({
						children: [
							new TextRun({
								text: p.keywords.join(', '),
								size: 18,
								font: 'Calibri',
								italics: true,
								color: '555555',
							}),
						],
					}),
				);
			}
			if (p.url) {
				sections.push(
					new Paragraph({
						children: [new TextRun({ text: p.url, size: 18, font: 'Calibri', color: '0563C1' })],
					}),
				);
			}
		}
	}

	if (data.certifications.length > 0) {
		sections.push(sectionHeader(l.certifications));
		for (const c of data.certifications) {
			const dates = [c.issueDate, c.expirationDate].filter(Boolean).join(' - ');
			sections.push(
				new Paragraph({
					spacing: { before: 100 },
					children: [new TextRun({ text: c.name, bold: true, size: 22, font: 'Calibri' })],
				}),
			);
			sections.push(
				new Paragraph({
					children: [
						new TextRun({
							text: `${c.issuer}${dates ? ` | ${dates}` : ''}`,
							size: 20,
							font: 'Calibri',
							color: '555555',
						}),
					],
				}),
			);
			if (c.url) {
				sections.push(
					new Paragraph({
						children: [new TextRun({ text: c.url, size: 18, font: 'Calibri', color: '0563C1' })],
					}),
				);
			}
		}
	}

	if (data.volunteering.length > 0) {
		sections.push(sectionHeader(l.volunteering));
		for (const v of data.volunteering) {
			const period = [v.startDate, v.endDate].filter(Boolean).join(' - ');
			sections.push(
				new Paragraph({
					spacing: { before: 100 },
					children: [new TextRun({ text: v.role, bold: true, size: 22, font: 'Calibri' })],
				}),
			);
			sections.push(
				new Paragraph({
					children: [
						new TextRun({
							text: `${v.organization}${period ? ` | ${period}` : ''}`,
							size: 20,
							font: 'Calibri',
							color: '555555',
						}),
					],
				}),
			);
			if (v.description) {
				sections.push(
					new Paragraph({
						children: [new TextRun({ text: v.description, size: 20, font: 'Calibri' })],
					}),
				);
			}
		}
	}

	if (data.languages.length > 0) {
		sections.push(sectionHeader(l.languages));
		for (const lang of data.languages) {
			sections.push(
				new Paragraph({
					children: [
						new TextRun({
							text: `${lang.name}${lang.proficiency ? ` — ${lang.proficiency}` : ''}`,
							size: 20,
							font: 'Calibri',
						}),
					],
				}),
			);
		}
	}

	const doc = new Document({
		sections: [{ children: sections }],
	});

	const buffer = await Packer.toBuffer(doc);
	return Buffer.from(buffer);
}
