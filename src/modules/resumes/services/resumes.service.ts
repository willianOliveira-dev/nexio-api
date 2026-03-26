import crypto from 'node:crypto';
import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { getBoss, RESUME_ANALYZE_JOB } from '@/lib/queue/pg-boss.client.js';
import { deleteFromR2, getPresignedUrl, uploadToR2 } from '@/lib/r2/r2.client.js';
import type { UsersRepository } from '@/modules/users/repositories/users.repository.js';
import { NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import {
	FileTooLargeError,
	InvalidFileTypeError,
	InvalidStatusForReanalysisError,
	ResumeLimitReachedError,
} from '../errors/resumes.errors.js';
import type {
	ResumeScores,
	Resumes,
	ResumesRepository,
	ResumeVersions,
} from '../repositories/resumes.repository.js';
import {
	allowedMimeTypes,
	MAX_FILE_SIZE_BYTES,
	PLAN_RESUME_LIMIT_FREE,
	PRESIGNED_URL_EXPIRY_SECONDS,
} from '../schemas/resumes.enums.js';

export type ResumeWithScore = Resumes & { score: ResumeScores | null };

export class ResumesService {
	constructor(
		private readonly resumesRepository: ResumesRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async uploadResume(userId: string, file: File): Promise<Resumes> {
		if (!(allowedMimeTypes as readonly string[]).includes(file.type)) {
			throw new InvalidFileTypeError();
		}
		if (file.size > MAX_FILE_SIZE_BYTES) {
			throw new FileTooLargeError();
		}

		const resumeCount = await this.resumesRepository.countByUser(userId);
		if (resumeCount >= PLAN_RESUME_LIMIT_FREE) {
			throw new ResumeLimitReachedError();
		}

		const creditsRemaining = await this.usersRepository.getCreditsRemaining(userId);
		if (creditsRemaining <= 0) throw new PaymentRequiredError('Créditos de IA esgotados');
		await this.usersRepository.incrementCreditsUsed(userId);

		const buffer = Buffer.from(await file.arrayBuffer());
		const rawText = await this.parseRawText(buffer, file.type);

		const ext = path.extname(file.name).toLowerCase();
		const storageKey = `uploads/${userId}/${crypto.randomUUID()}${ext}`;
		await uploadToR2(storageKey, buffer, file.type);

		const resume = await this.resumesRepository.create({
			userId,
			fileName: file.name,
			storageKey,
			mimeType: file.type,
			sizeBytes: file.size,
			rawText,
			status: 'processing',
		});

		const boss = await getBoss();
		await boss.send(RESUME_ANALYZE_JOB, { resumeId: resume.id, userId });

		return resume;
	}

	async getResume(id: string, userId: string): Promise<ResumeWithScore> {
		const resume = await this.resumesRepository.findById(id, userId);
		if (!resume) throw new NotFoundError('Resume');
		const score = await this.resumesRepository.findLatestScore(id);
		return { ...resume, score };
	}

	async listResumes(
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<ResumeWithScore>> {
		const result = await this.resumesRepository.findAllByUser(userId, pagination);
		const data: ResumeWithScore[] = await Promise.all(
			result.data.map(async (resume) => {
				const score = await this.resumesRepository.findLatestScore(resume.id);
				return { ...resume, score };
			}),
		);
		return { ...result, data };
	}

	async deleteResume(id: string, userId: string): Promise<void> {
		const resume = await this.resumesRepository.findById(id, userId);
		if (!resume) throw new NotFoundError('Resume');
		await deleteFromR2(resume.storageKey);
		await this.resumesRepository.delete(id, userId);
	}

	async reAnalyze(id: string, userId: string): Promise<void> {
		const resume = await this.resumesRepository.findById(id, userId);
		if (!resume) throw new NotFoundError('Resume');

		if (resume.status !== 'analyzed' && resume.status !== 'failed') {
			throw new InvalidStatusForReanalysisError();
		}

		const creditsRemaining = await this.usersRepository.getCreditsRemaining(userId);
		if (creditsRemaining <= 0) throw new PaymentRequiredError('Créditos de IA esgotados');
		await this.usersRepository.incrementCreditsUsed(userId);

		await this.resumesRepository.updateStatus(id, 'processing');

		const boss = await getBoss();
		await boss.send(RESUME_ANALYZE_JOB, { resumeId: id, userId });
	}

	async getScore(resumeId: string, userId: string): Promise<ResumeScores> {
		const resume = await this.resumesRepository.findById(resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');
		const score = await this.resumesRepository.findLatestScore(resumeId);
		if (!score) throw new NotFoundError('Score');
		return score;
	}

	async getDownloadUrl(id: string, userId: string): Promise<{ url: string; expiresAt: string }> {
		const resume = await this.resumesRepository.findById(id, userId);
		if (!resume) throw new NotFoundError('Resume');
		const url = await getPresignedUrl(resume.storageKey, PRESIGNED_URL_EXPIRY_SECONDS);
		const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();
		return { url, expiresAt };
	}

	async getVersions(
		resumeId: string,
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<ResumeVersions>> {
		const resume = await this.resumesRepository.findById(resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');
		return this.resumesRepository.findVersionsByResumeId(resumeId, pagination);
	}

	async getVersion(resumeId: string, versionId: string, userId: string): Promise<ResumeVersions> {
		const resume = await this.resumesRepository.findById(resumeId, userId);
		if (!resume) throw new NotFoundError('Resume');
		const version = await this.resumesRepository.findVersionById(versionId, resumeId);
		if (!version) throw new NotFoundError('Versão do resume');
		return version;
	}

	private async parseRawText(buffer: Buffer, mimeType: string): Promise<string> {
		if (mimeType === 'application/pdf') {
			const parser = new PDFParse(buffer);
			const result = await parser.getText();
			return result.text;
		}
		if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
			const result = await mammoth.extractRawText({ buffer });
			return result.value;
		}
		return buffer.toString('utf-8');
	}
}
