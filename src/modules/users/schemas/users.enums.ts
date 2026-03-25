export const experienceLevels = ['intern', 'junior', 'mid', 'senior', 'lead', 'executive'] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

export const preferredLanguages = ['pt', 'en'] as const;
export type PreferredLanguage = (typeof preferredLanguages)[number];

export const workModels = ['remote', 'hybrid', 'onsite', 'any'] as const;
export type WorkModel = (typeof workModels)[number];

export const writingTones = ['formal', 'modern', 'creative', 'technical'] as const;
export type WritingTone = (typeof writingTones)[number];
