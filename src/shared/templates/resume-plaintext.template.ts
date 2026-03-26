import type { ExportResumeData } from './export-types.js';
import { getLabels } from './export-types.js';

export function buildResumePlainText(data: ExportResumeData, language: 'pt' | 'en'): string {
	const l = getLabels(language);
	const lines: string[] = [];

	lines.push(data.contact.fullName.toUpperCase());
	const contactParts: string[] = [data.contact.email];
	if (data.contact.phone) contactParts.push(data.contact.phone);
	if (data.contact.location) contactParts.push(data.contact.location);
	if (data.contact.website) contactParts.push(data.contact.website);
	lines.push(contactParts.join(' | '));
	lines.push('');

	if (data.professionalSummary) {
		lines.push(`--- ${l.summary} ---`);
		lines.push(data.professionalSummary);
		lines.push('');
	}

	if (data.workExperiences.length > 0) {
		lines.push(`--- ${l.experience} ---`);
		for (const w of data.workExperiences) {
			const period = [w.startDate, w.endDate ?? l.present].filter(Boolean).join(' - ');
			lines.push(`${w.title} @ ${w.company}${w.location ? ` (${w.location})` : ''}`);
			lines.push(period);
			if (w.description) {
				for (const bullet of w.description.split('\n')) {
					lines.push(`  • ${bullet.trim()}`);
				}
			}
			lines.push('');
		}
	}

	if (data.educations.length > 0) {
		lines.push(`--- ${l.education} ---`);
		for (const e of data.educations) {
			const period = [e.startDate, e.endDate].filter(Boolean).join(' - ');
			lines.push(`${e.degree} - ${e.institution}${e.location ? ` (${e.location})` : ''}`);
			if (period) lines.push(period);
			lines.push('');
		}
	}

	if (data.skills.length > 0) {
		lines.push(`--- ${l.skills} ---`);
		const grouped: Record<string, string[]> = {};
		for (const s of data.skills) {
			const cat = s.category ?? 'Geral';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat]!.push(s.name);
		}
		for (const [category, items] of Object.entries(grouped)) {
			lines.push(`${category}: ${items.join(', ')}`);
		}
		lines.push('');
	}

	if (data.projects.length > 0) {
		lines.push(`--- ${l.projects} ---`);
		for (const p of data.projects) {
			lines.push(p.name);
			lines.push(`  ${p.description}`);
			if (p.keywords?.length) {
				const keywordsLabel = language === 'pt' ? 'Palavras-chave' : 'Keywords';
				lines.push(`  ${keywordsLabel}: ${p.keywords.join(', ')}`);
			}
			if (p.url) lines.push(`  ${p.url}`);
			lines.push('');
		}
	}

	if (data.certifications.length > 0) {
		lines.push(`--- ${l.certifications} ---`);
		for (const c of data.certifications) {
			const dates = [c.issueDate, c.expirationDate].filter(Boolean).join(' - ');
			lines.push(`${c.name} — ${c.issuer}${dates ? ` (${dates})` : ''}`);
			if (c.url) lines.push(`  ${c.url}`);
		}
		lines.push('');
	}

	if (data.volunteering.length > 0) {
		lines.push(`--- ${l.volunteering} ---`);
		for (const v of data.volunteering) {
			const period = [v.startDate, v.endDate].filter(Boolean).join(' - ');
			lines.push(`${v.role} @ ${v.organization}${period ? ` (${period})` : ''}`);
			if (v.description) lines.push(`  ${v.description}`);
			lines.push('');
		}
	}

	if (data.languages.length > 0) {
		lines.push(`--- ${l.languages} ---`);
		for (const lang of data.languages) {
			lines.push(`${lang.name}${lang.proficiency ? ` (${lang.proficiency})` : ''}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}
