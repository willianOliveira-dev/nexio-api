import { AppError, ForbiddenError, NotFoundError } from '@/shared/errors/app.error.js';

export class ResumeNotFoundError extends NotFoundError {
	constructor() {
		super('Resume');
		this.name = 'ResumeNotFoundError';
	}
}

export class InvalidFileTypeError extends AppError {
	constructor() {
		super('Tipo de arquivo não permitido. Use PDF, DOCX ou TXT.', 400, 'INVALID_FILE_TYPE');
		this.name = 'InvalidFileTypeError';
	}
}

export class FileTooLargeError extends AppError {
	constructor() {
		super('Arquivo excede o tamanho máximo de 10MB.', 400, 'FILE_TOO_LARGE');
		this.name = 'FileTooLargeError';
	}
}

export class ResumeLimitReachedError extends ForbiddenError {
	constructor() {
		super('Limite de resumes do seu plano atingido.');
		(this as AppError & { code: string }).code = 'RESUME_LIMIT_REACHED';
		this.name = 'ResumeLimitReachedError';
	}
}

export class InvalidStatusForReanalysisError extends AppError {
	constructor() {
		super(
			'O resume precisa estar em status "analyzed" ou "failed" para ser reanalisado.',
			409,
			'INVALID_STATUS_FOR_REANALYSIS',
		);
		this.name = 'InvalidStatusForReanalysisError';
	}
}
