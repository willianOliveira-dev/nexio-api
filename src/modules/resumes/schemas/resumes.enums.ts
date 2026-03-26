export const resumeStatuses = ['pending', 'processing', 'analyzed', 'failed'] as const;
export type ResumeStatus = (typeof resumeStatuses)[number];

export const allowedMimeTypes = [
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain',
] as const;
export type AllowedMimeType = (typeof allowedMimeTypes)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const PLAN_RESUME_LIMIT_FREE = 3;
export const PLAN_RESUME_LIMIT_PRO = 50;
export const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 min
