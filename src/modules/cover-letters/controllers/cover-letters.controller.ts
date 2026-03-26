import { JobMatchesRepository } from '@/modules/job-matches/repositories/job-matches.repository.js';
import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { CoverLetters } from '../repositories/cover-letters.repository.js';
import { CoverLettersRepository } from '../repositories/cover-letters.repository.js';
import type { GenerateCoverLetterDTO } from '../schemas/generate-cover-letter.dto.js';
import type { UpdateCoverLetterDTO } from '../schemas/update-cover-letter.dto.js';
import { CoverLettersService } from '../services/cover-letters.service.js';

export class CoverLettersController {
	private readonly service: CoverLettersService;

	constructor() {
		this.service = new CoverLettersService(
			new CoverLettersRepository(),
			new ResumesRepository(),
			new JobMatchesRepository(),
			new UsersRepository(),
		);
	}

	generate(userId: string, data: GenerateCoverLetterDTO): Promise<CoverLetters> {
		return this.service.generate(userId, data);
	}

	getCoverLetter(id: string, userId: string): Promise<CoverLetters> {
		return this.service.getCoverLetter(id, userId);
	}

	listCoverLetters(userId: string, pagination: Pagination): Promise<PaginatedResult<CoverLetters>> {
		return this.service.listCoverLetters(userId, pagination);
	}

	updateCoverLetter(id: string, userId: string, data: UpdateCoverLetterDTO): Promise<CoverLetters> {
		return this.service.updateCoverLetter(id, userId, data);
	}

	deleteCoverLetter(id: string, userId: string): Promise<void> {
		return this.service.deleteCoverLetter(id, userId);
	}
}
