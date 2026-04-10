import { and, asc, count, desc, eq, ilike, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import type {
	Certifications,
	Educations,
	Languages,
	NewAiAction,
	NewCertification,
	NewEducation,
	NewLanguage,
	NewProject,
	NewResume,
	NewResumeScore,
	NewSkill,
	NewVolunteering,
	NewWorkExperience,
	Projects,
	ResumeScores,
	Resumes,
	ResumeVersions,
	Skills,
	Volunteering,
	WorkExperiences,
} from '@/lib/db/schemas/index.schema.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { ResumeStatus } from '../schemas/resumes.enums.js';

export type ListResumesFilter = {
	search?: string | undefined;
	status?: ResumeStatus[] | undefined;
	sortBy: 'createdAt' | 'fileName';
	sortOrder: 'asc' | 'desc';
};

export class ResumesRepository {
	async create(data: NewResume): Promise<Resumes> {
		const [resume] = await db.insert(schema.resumes).values(data).returning();
		if (!resume) throw new Error('Falha ao criar o resume.');
		return resume;
	}

	async findById(id: string, userId: string): Promise<Resumes | null> {
		const [resume] = await db
			.select()
			.from(schema.resumes)
			.where(and(eq(schema.resumes.id, id), eq(schema.resumes.userId, userId)));
		return resume ?? null;
	}

	async findAllByUser(
		userId: string,
		pagination: Pagination,
		filter: ListResumesFilter,
	): Promise<PaginatedResult<Resumes>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const conditions = [eq(schema.resumes.userId, userId)];

		if (filter.search) {
			conditions.push(ilike(schema.resumes.fileName, `%${filter.search}%`));
		}

		if (filter.status && filter.status.length > 0) {
			conditions.push(inArray(schema.resumes.status, filter.status));
		}

		const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

		const orderColumn =
			filter.sortBy === 'fileName' ? schema.resumes.fileName : schema.resumes.createdAt;
		const orderByClause = filter.sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.resumes)
				.where(whereClause)
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset),
			db.select({ value: count() }).from(schema.resumes).where(whereClause),
		]);

		const total = countRow?.value ?? 0;
		const totalPages = Math.ceil(total / limit);
		return {
			data: rows,
			meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
		};
	}

	async updateStatus(id: string, status: Resumes['status']): Promise<void> {
		await db.update(schema.resumes).set({ status }).where(eq(schema.resumes.id, id));
	}

	async updateAnalyzedFields(id: string, data: Partial<Resumes>): Promise<void> {
		await db.update(schema.resumes).set(data).where(eq(schema.resumes.id, id));
	}

	async delete(id: string, userId: string): Promise<void> {
		await db
			.delete(schema.resumes)
			.where(and(eq(schema.resumes.id, id), eq(schema.resumes.userId, userId)));
	}

	async countByUser(userId: string): Promise<number> {
		const [row] = await db
			.select({ value: count() })
			.from(schema.resumes)
			.where(eq(schema.resumes.userId, userId));
		return row?.value ?? 0;
	}

	async createScore(data: NewResumeScore): Promise<ResumeScores> {
		const [score] = await db.insert(schema.resumeScores).values(data).returning();
		if (!score) throw new Error('Falha ao criar o score.');
		return score;
	}

	async findLatestScore(resumeId: string): Promise<ResumeScores | null> {
		const [score] = await db
			.select()
			.from(schema.resumeScores)
			.where(eq(schema.resumeScores.resumeId, resumeId))
			.orderBy(desc(schema.resumeScores.createdAt))
			.limit(1);
		return score ?? null;
	}

	async upsertWorkExperiences(resumeId: string, items: NewWorkExperience[]): Promise<void> {
		await db.delete(schema.workExperiences).where(eq(schema.workExperiences.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.workExperiences).values(items);
	}

	async upsertEducations(resumeId: string, items: NewEducation[]): Promise<void> {
		await db.delete(schema.educations).where(eq(schema.educations.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.educations).values(items);
	}

	async upsertSkills(resumeId: string, items: NewSkill[]): Promise<void> {
		await db.delete(schema.skills).where(eq(schema.skills.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.skills).values(items);
	}

	async upsertLanguages(resumeId: string, items: NewLanguage[]): Promise<void> {
		await db.delete(schema.languages).where(eq(schema.languages.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.languages).values(items);
	}

	async upsertProjects(resumeId: string, items: NewProject[]): Promise<void> {
		await db.delete(schema.projects).where(eq(schema.projects.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.projects).values(items);
	}

	async upsertCertifications(resumeId: string, items: NewCertification[]): Promise<void> {
		await db.delete(schema.certifications).where(eq(schema.certifications.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.certifications).values(items);
	}

	async upsertVolunteering(resumeId: string, items: NewVolunteering[]): Promise<void> {
		await db.delete(schema.volunteering).where(eq(schema.volunteering.resumeId, resumeId));
		if (items.length > 0) await db.insert(schema.volunteering).values(items);
	}

	async createAiAction(data: NewAiAction): Promise<void> {
		await db.insert(schema.aiActions).values(data);
	}

	async findVersionsByResumeId(
		originalResumeId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<ResumeVersions>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.resumeVersions)
				.where(eq(schema.resumeVersions.originalResumeId, originalResumeId))
				.orderBy(desc(schema.resumeVersions.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ value: count() })
				.from(schema.resumeVersions)
				.where(eq(schema.resumeVersions.originalResumeId, originalResumeId)),
		]);

		const total = countRow?.value ?? 0;
		const totalPages = Math.ceil(total / limit);
		return {
			data: rows,
			meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
		};
	}

	async findVersionById(id: string, originalResumeId: string): Promise<ResumeVersions | null> {
		const [version] = await db
			.select()
			.from(schema.resumeVersions)
			.where(
				and(
					eq(schema.resumeVersions.id, id),
					eq(schema.resumeVersions.originalResumeId, originalResumeId),
				),
			);
		return version ?? null;
	}
}

export type {
	Certifications,
	Educations,
	Languages,
	Projects,
	ResumeScores,
	Resumes,
	ResumeVersions,
	Skills,
	Volunteering,
	WorkExperiences,
};
