import { asc, eq } from 'drizzle-orm';
import type { WorkHandler } from 'pg-boss';
import { db } from '@/lib/db/connection.js';
import type { Exports } from '@/lib/db/schemas/exports.schema.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { ExportGenerateJobData } from '@/lib/queue/pg-boss.client.js';
import { EXPORT_GENERATE_JOB, getBoss } from '@/lib/queue/pg-boss.client.js';
import { uploadToR2 } from '@/lib/r2/r2.client.js';
import { ExportsRepository } from '@/modules/exports/repositories/exports.repository.js';
import type { ExportResumeData } from '@/shared/templates/export-types.js';
import { buildResumeDocx } from '@/shared/templates/resume-docx.template.js';
import { buildResumePdf } from '@/shared/templates/resume-pdf.template.js';
import { buildResumePlainText } from '@/shared/templates/resume-plaintext.template.js';

const repository = new ExportsRepository();

async function loadResumeData(resumeId: string): Promise<ExportResumeData> {
	const [resume] = await db.select().from(schema.resumes).where(eq(schema.resumes.id, resumeId));

	if (!resume) throw new Error(`Resume ${resumeId} não encontrado.`);

	const [workExperiences, educations, skills, languages, projects, certifications, volunteering] =
		await Promise.all([
			db
				.select()
				.from(schema.workExperiences)
				.where(eq(schema.workExperiences.resumeId, resumeId))
				.orderBy(asc(schema.workExperiences.orderIndex)),
			db
				.select()
				.from(schema.educations)
				.where(eq(schema.educations.resumeId, resumeId))
				.orderBy(asc(schema.educations.orderIndex)),
			db.select().from(schema.skills).where(eq(schema.skills.resumeId, resumeId)),
			db.select().from(schema.languages).where(eq(schema.languages.resumeId, resumeId)),
			db
				.select()
				.from(schema.projects)
				.where(eq(schema.projects.resumeId, resumeId))
				.orderBy(asc(schema.projects.orderIndex)),
			db
				.select()
				.from(schema.certifications)
				.where(eq(schema.certifications.resumeId, resumeId))
				.orderBy(asc(schema.certifications.orderIndex)),
			db
				.select()
				.from(schema.volunteering)
				.where(eq(schema.volunteering.resumeId, resumeId))
				.orderBy(asc(schema.volunteering.orderIndex)),
		]);

	return {
		contact: {
			fullName: resume.fullName ?? '',
			email: resume.email ?? '',
			...(resume.phone != null ? { phone: resume.phone } : {}),
			...(resume.location != null ? { location: resume.location } : {}),
			...(resume.website != null ? { website: resume.website } : {}),
		},
		...(resume.professionalSummary != null
			? { professionalSummary: resume.professionalSummary }
			: {}),
		workExperiences,
		educations,
		skills,
		languages,
		projects,
		certifications,
		volunteering,
	};
}

async function loadResumeVersionData(versionId: string): Promise<ExportResumeData> {
	const [version] = await db
		.select()
		.from(schema.resumeVersions)
		.where(eq(schema.resumeVersions.id, versionId));

	if (!version) throw new Error(`ResumeVersion ${versionId} não encontrada.`);

	const content = version.content;

	return {
		contact: content.contact,
		...(content.professionalSummary != null
			? { professionalSummary: content.professionalSummary }
			: {}),
		workExperiences: [],
		educations: [],
		skills: [],
		languages: [],
		projects: content.projects ?? [],
		certifications: content.certifications ?? [],
		volunteering: content.volunteering ?? [],
	};
}

async function generateFile(
	exportRecord: Exports,
	data: ExportResumeData,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
	const language = exportRecord.language as 'pt' | 'en';

	switch (exportRecord.format) {
		case 'pdf': {
			const buffer = await buildResumePdf(data, language);
			return { buffer, contentType: 'application/pdf', ext: 'pdf' };
		}
		case 'docx': {
			const buffer = await buildResumeDocx(data, language);
			return {
				buffer,
				contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				ext: 'docx',
			};
		}
		case 'plain_text': {
			const text = buildResumePlainText(data, language);
			return { buffer: Buffer.from(text, 'utf-8'), contentType: 'text/plain', ext: 'txt' };
		}
		default:
			throw new Error(`Formato não suportado: ${exportRecord.format}`);
	}
}

const handle: WorkHandler<ExportGenerateJobData> = async (jobs) => {
	for (const job of jobs) {
		const { exportId, userId } = job.data;

		const [exportRecord] = await db
			.select()
			.from(schema.exports)
			.where(eq(schema.exports.id, exportId));

		if (!exportRecord) {
			console.warn(`[export:generate] Export ${exportId} não encontrado.`);
			continue;
		}

		await repository.updateStatus(exportId, 'running');

		let data: ExportResumeData;

		switch (exportRecord.documentType) {
			case 'resume': {
				if (!exportRecord.resumeId) throw new Error('resumeId ausente.');
				data = await loadResumeData(exportRecord.resumeId);
				break;
			}
			case 'resume_version': {
				if (!exportRecord.resumeVersionId) throw new Error('resumeVersionId ausente.');
				data = await loadResumeVersionData(exportRecord.resumeVersionId);
				break;
			}
			case 'cover_letter': {
				if (!exportRecord.coverLetterId) throw new Error('coverLetterId ausente.');
				const [cl] = await db
					.select()
					.from(schema.coverLetters)
					.where(eq(schema.coverLetters.id, exportRecord.coverLetterId));
				if (!cl) throw new Error('Cover letter não encontrada.');
				data = {
					contact: { fullName: '', email: '' },
					professionalSummary: cl.content,
					workExperiences: [],
					educations: [],
					skills: [],
					languages: [],
					projects: [],
					certifications: [],
					volunteering: [],
				};
				break;
			}
			default:
				throw new Error(`Tipo de documento desconhecido: ${exportRecord.documentType}`);
		}

		const { buffer, contentType, ext } = await generateFile(exportRecord, data);
		const storageKey = `exports/${userId}/${exportId}.${ext}`;

		await uploadToR2(storageKey, buffer, contentType);
		await repository.updateStatus(exportId, 'completed', storageKey);

		console.info(`[export:generate] Export ${exportId} concluído.`);
	}
};

export async function startExportGenerateWorker(): Promise<void> {
	const boss = await getBoss();

	boss.work<ExportGenerateJobData>(EXPORT_GENERATE_JOB, async (jobs) => {
		for (const job of jobs) {
			try {
				await handle([job]);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Erro desconhecido';
				await repository.updateStatus(job.data.exportId, 'failed');
				console.error(`[export:generate] job ${job.id} falhou:`, message);
			}
		}
	});

	console.info('[export:generate] Worker iniciado e aguardando jobs.');
}
