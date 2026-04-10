import type { ResumeScores, Resumes, ResumeVersions } from '@/lib/db/schemas/index.schema.js';
import { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { ListResumesFilter } from '../repositories/resumes.repository.js';
import { ResumesRepository } from '../repositories/resumes.repository.js';
import type { ResumeWithScore } from '../services/resumes.service.js';
import { ResumesService } from '../services/resumes.service.js';

export class ResumesController {
	private readonly service: ResumesService;

	constructor() {
		this.service = new ResumesService(new ResumesRepository(), new UsersRepository());
	}

	uploadResume(userId: string, file: File): Promise<Resumes> {
		return this.service.uploadResume(userId, file);
	}

	getResume(id: string, userId: string): Promise<ResumeWithScore> {
		return this.service.getResume(id, userId);
	}

	listResumes(
		userId: string,
		pagination: Pagination,
		filter: ListResumesFilter,
	): Promise<PaginatedResult<ResumeWithScore>> {
		return this.service.listResumes(userId, pagination, filter);
	}

	deleteResume(id: string, userId: string): Promise<void> {
		return this.service.deleteResume(id, userId);
	}

	reAnalyze(id: string, userId: string): Promise<void> {
		return this.service.reAnalyze(id, userId);
	}

	getScore(resumeId: string, userId: string): Promise<ResumeScores> {
		return this.service.getScore(resumeId, userId);
	}

	getDownloadUrl(id: string, userId: string): Promise<{ url: string; expiresAt: string }> {
		return this.service.getDownloadUrl(id, userId);
	}

	getVersions(
		resumeId: string,
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<ResumeVersions>> {
		return this.service.getVersions(resumeId, userId, pagination);
	}

	getVersion(resumeId: string, versionId: string, userId: string): Promise<ResumeVersions> {
		return this.service.getVersion(resumeId, versionId, userId);
	}
}
