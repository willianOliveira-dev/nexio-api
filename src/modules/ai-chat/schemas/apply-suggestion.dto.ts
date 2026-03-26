import { z } from 'zod';

export const suggestionSchema = z.object({
	section: z.string().min(1),
	original: z.string().optional(),
	suggested: z.string().min(1),
});

export const applySuggestionBodySchema = z.object({
	messageId: z.string().uuid(),
	suggestion: suggestionSchema,
});

export type ApplySuggestionDTO = z.infer<typeof applySuggestionBodySchema>;
export type SuggestionDTO = z.infer<typeof suggestionSchema>;
