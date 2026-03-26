import { z } from 'zod';

export const shareExportBodySchema = z.object({
	expiresInDays: z.coerce.number().int().min(1).max(90).default(7),
});

export type ShareExportDTO = z.infer<typeof shareExportBodySchema>;
