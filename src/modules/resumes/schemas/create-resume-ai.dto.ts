import { z } from 'zod';

export const createResumeAiBodySchema = z.object({
	modelId: z.string().optional(),
});

export type CreateResumeAiDTO = z.infer<typeof createResumeAiBodySchema>;

export const finalizeResumeAiBodySchema = z.object({
	title: z.string().min(1).max(255).default('Meu Currículo'),
});

export type FinalizeResumeAiDTO = z.infer<typeof finalizeResumeAiBodySchema>;

export const builderWorkExperienceSchema = z.object({
	title: z.string().min(1).max(255),
	company: z.string().min(1).max(255),
	location: z.string().max(255).optional(),
	startDate: z.string().max(32).optional(),
	endDate: z.string().max(32).optional(),
	isCurrent: z.boolean().default(false),
	bullets: z.array(z.string()),
});

export const builderEducationSchema = z.object({
	degree: z.string().min(1).max(255),
	institution: z.string().min(1).max(255),
	location: z.string().max(255).optional(),
	startDate: z.string().max(32).optional(),
	endDate: z.string().max(32).optional(),
});

export const builderSkillSchema = z.object({
	category: z.string().max(128).optional(),
	items: z.array(z.string().min(1).max(128)),
});

export const builderLanguageSchema = z.object({
	language: z.string().min(1).max(128),
	proficiency: z.string().max(64).optional(),
});

export const builderCertificationSchema = z.object({
	name: z.string().min(1).max(255),
	issuer: z.string().min(1).max(255),
	issueDate: z.string().max(64).optional(),
	expirationDate: z.string().max(64).optional(),
	url: z.string().max(255).optional(),
});

export const builderProjectSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string(),
	keywords: z.array(z.string()).default([]),
	url: z.string().max(255).optional(),
});

export const builderVolunteeringSchema = z.object({
	role: z.string().min(1).max(255),
	organization: z.string().min(1).max(255),
	startDate: z.string().max(64).optional(),
	endDate: z.string().max(64).optional(),
	description: z.string().optional(),
});
