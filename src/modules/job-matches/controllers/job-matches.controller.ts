import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { JobMatches } from '../repositories/job-matches.repository.js';
import { JobMatchesRepository } from '../repositories/job-matches.repository.js';
import type { CreateJobMatchDTO } from '../schemas/create-job-match.dto.js';
import { JobMatchesService } from '../services/job-matches.service.js';

export class JobMatchesController {
	private readonly service: JobMatchesService;

	constructor() {
		this.service = new JobMatchesService(
			new JobMatchesRepository(),
			new ResumesRepository(),
			new UsersRepository(),
		);
	}

	analyzeMatch(userId: string, data: CreateJobMatchDTO): Promise<JobMatches> {
		return this.service.analyzeMatch(userId, data);
	}

	getMatch(id: string, userId: string): Promise<JobMatches> {
		return this.service.getMatch(id, userId);
	}

	listMatches(userId: string, pagination: Pagination): Promise<PaginatedResult<JobMatches>> {
		return this.service.listMatches(userId, pagination);
	}

	listMatchesByResume(resumeId: string, userId: string): Promise<JobMatches[]> {
		return this.service.listMatchesByResume(resumeId, userId);
	}

	deleteMatch(id: string, userId: string): Promise<void> {
		return this.service.deleteMatch(id, userId);
	}
}
