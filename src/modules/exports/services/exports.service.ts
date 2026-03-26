import { randomUUID } from 'node:crypto';
import { env } from '@/config/env.js';
import type { Exports } from '@/lib/db/schemas/exports.schema.js';
import { EXPORT_GENERATE_JOB, getBoss } from '@/lib/queue/pg-boss.client.js';
import { getPresignedUrl } from '@/lib/r2/r2.client.js';
import type { ResumesRepository } from '@/modules/resumes/repositories/resumes.repository.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import type { ExportFormat, UserPlan } from '@/shared/config/plan-limits.js';
import { canUseFormat } from '@/shared/config/plan-limits.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/shared/errors/app.error.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import type { ExportsRepository } from '../repositories/exports.repository.js';
import type { CreateExportDTO } from '../schemas/create-export.dto.js';

export class ExportsService {
	constructor(
		private readonly exportsRepository: ExportsRepository,
		private readonly resumesRepository: ResumesRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async createExport(userId: string, data: CreateExportDTO): Promise<Exports> {
		const profile = await this.usersRepository.findProfileByUserId(userId);
		const plan: UserPlan = profile?.plan ?? 'free';

		if (!canUseFormat(plan, data.format as ExportFormat)) {
			throw new ForbiddenError(`O formato "${data.format}" requer plano Pro ou superior.`);
		}

		if (data.documentType === 'resume' && data.resumeId) {
			const resume = await this.resumesRepository.findById(data.resumeId, userId);
			if (!resume) throw new NotFoundError('Resume');
			if (resume.status !== 'analyzed') {
				throw new BadRequestError('O currículo precisa estar com status "analyzed".');
			}
		}

		const exportRecord = await this.exportsRepository.create({
			userId,
			documentType: data.documentType,
			resumeId: data.documentType === 'resume' ? data.resumeId : null,
			resumeVersionId: data.documentType === 'resume_version' ? data.resumeVersionId : null,
			coverLetterId: data.documentType === 'cover_letter' ? data.coverLetterId : null,
			format: data.format,
			language: data.language,
			status: 'pending',
		});

		const boss = await getBoss();
		await boss.send(EXPORT_GENERATE_JOB, {
			exportId: exportRecord.id,
			userId,
		});

		return exportRecord;
	}

	async getExport(id: string, userId: string): Promise<Exports & { downloadUrl: string | null }> {
		const exportRecord = await this.exportsRepository.findById(id, userId);
		if (!exportRecord) throw new NotFoundError('Export');

		let downloadUrl: string | null = null;
		if (exportRecord.status === 'completed' && exportRecord.storageKey) {
			downloadUrl = await getPresignedUrl(exportRecord.storageKey);
		}

		return { ...exportRecord, downloadUrl };
	}

	async getExportStatus(
		id: string,
		userId: string,
	): Promise<{ status: Exports['status']; downloadUrl: string | null }> {
		const exportRecord = await this.exportsRepository.findById(id, userId);
		if (!exportRecord) throw new NotFoundError('Export');

		let downloadUrl: string | null = null;
		if (exportRecord.status === 'completed' && exportRecord.storageKey) {
			downloadUrl = await getPresignedUrl(exportRecord.storageKey);
		}

		return { status: exportRecord.status, downloadUrl };
	}

	async listExports(userId: string, pagination: Pagination): Promise<PaginatedResult<Exports>> {
		return this.exportsRepository.findAllByUser(userId, pagination);
	}

	async downloadExport(id: string, userId: string): Promise<{ url: string; expiresAt: string }> {
		const exportRecord = await this.exportsRepository.findById(id, userId);
		if (!exportRecord) throw new NotFoundError('Export');

		if (exportRecord.status !== 'completed' || !exportRecord.storageKey) {
			throw new BadRequestError('Export ainda não foi concluído.');
		}

		const expiresInSeconds = 900;
		const url = await getPresignedUrl(exportRecord.storageKey, expiresInSeconds);
		const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

		return { url, expiresAt };
	}

	async generateShareLink(
		id: string,
		userId: string,
		expiresInDays: number,
	): Promise<{ shareUrl: string; shareToken: string; expiresAt: string }> {
		const exportRecord = await this.exportsRepository.findById(id, userId);
		if (!exportRecord) throw new NotFoundError('Export');

		if (exportRecord.status !== 'completed') {
			throw new BadRequestError('Export precisa estar concluído para compartilhar.');
		}

		const shareToken = randomUUID();
		const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

		await this.exportsRepository.setShareToken(id, shareToken, expiresAt);

		const shareUrl = `${env.FRONTEND_URL}/share/${shareToken}`;

		return {
			shareUrl,
			shareToken,
			expiresAt: expiresAt.toISOString(),
		};
	}

	async getPublicExport(
		shareToken: string,
	): Promise<{ downloadUrl: string; format: Exports['format'] }> {
		const exportRecord = await this.exportsRepository.findByShareToken(shareToken);
		if (!exportRecord) throw new NotFoundError('Link de compartilhamento inválido ou expirado');

		if (!exportRecord.storageKey) {
			throw new BadRequestError('Export não possui arquivo gerado.');
		}

		const downloadUrl = await getPresignedUrl(exportRecord.storageKey);

		return { downloadUrl, format: exportRecord.format };
	}
}
