import type { Exports } from '@/lib/db/schemas/exports.schema.js';
import { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import { ExportsRepository } from '../repositories/exports.repository.js';
import type { CreateExportDTO } from '../schemas/create-export.dto.js';
import { ExportsService } from '../services/exports.service.js';

export class ExportsController {
	private readonly service: ExportsService;

	constructor() {
		this.service = new ExportsService(
			new ExportsRepository(),
			new ResumesRepository(),
			new UsersRepository(),
		);
	}

	createExport(userId: string, data: CreateExportDTO): Promise<Exports> {
		return this.service.createExport(userId, data);
	}

	getExport(id: string, userId: string) {
		return this.service.getExport(id, userId);
	}

	getExportStatus(id: string, userId: string) {
		return this.service.getExportStatus(id, userId);
	}

	listExports(userId: string, pagination: Pagination): Promise<PaginatedResult<Exports>> {
		return this.service.listExports(userId, pagination);
	}

	downloadExport(id: string, userId: string) {
		return this.service.downloadExport(id, userId);
	}

	generateShareLink(id: string, userId: string, expiresInDays: number) {
		return this.service.generateShareLink(id, userId, expiresInDays);
	}

	getPublicExport(shareToken: string) {
		return this.service.getPublicExport(shareToken);
	}
}
