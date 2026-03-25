import { z } from 'zod';
import { experienceLevels, preferredLanguages, workModels, writingTones } from './users.enums.js';

export const updateProfileSchema = z
	.object({
		currentRole: z.string().max(255).optional(),
		targetRole: z.string().max(255).optional(),
		experienceLevel: z.enum(experienceLevels).optional(),
		industry: z.string().max(255).optional(),
		preferredLanguage: z.enum(preferredLanguages).optional(),
		workModel: z.enum(workModels).optional(),
		willingToRelocate: z.boolean().optional(),
		writingTone: z.enum(writingTones).optional(),
		careerGoals: z.string().max(2000).optional(),
		skills: z.array(z.string().max(100)).max(50).optional(),
		socialLinks: z
			.array(
				z.object({
					plataform: z.string().max(50),
					url: z.string().url(),
				}),
			)
			.max(10)
			.optional(),
	})
	.strict();

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
