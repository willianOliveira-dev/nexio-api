import { relations } from 'drizzle-orm';
import { aiActions } from './schemas/ai-actions.schema.js';
import { account, session } from './schemas/auth-schema.js';
import { chatSessions, messages } from './schemas/chat.schema.js';
import { coverLetters } from './schemas/cover-letters.schema.js';
import { educations } from './schemas/educations.schema.js';
import { exports } from './schemas/exports.schema.js';
import { jobMatches } from './schemas/job-matches.schema.js';
import { languages } from './schemas/languages.schema.js';
import { resumeScores } from './schemas/resume-scores.schema.js';
import { resumeVersions } from './schemas/resume-versions.schema.js';
import { resumes } from './schemas/resumes.schema.js';
import { skills } from './schemas/skills.schema.js';
import { usageLimits } from './schemas/usage-schema.js';
import { user } from './schemas/user.schema.js';
import { userProfiles } from './schemas/user-profiles.schema.js';
import { workExperiences } from './schemas/work-experiences.schema.js';

export const usersRelations = relations(user, ({ one, many }) => ({
	session: many(session),
	account: many(account),
	profile: one(userProfiles, {
		fields: [user.id],
		references: [userProfiles.userId],
	}),
	usageLimit: one(usageLimits, {
		fields: [user.id],
		references: [usageLimits.userId],
	}),
	resumes: many(resumes),
	jobMatches: many(jobMatches),
	chatSessions: many(chatSessions),
	exports: many(exports),
	aiActions: many(aiActions),
	coverLetters: many(coverLetters),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	user: one(user, { fields: [userProfiles.userId], references: [user.id] }),
}));

export const usageLimitsRelations = relations(usageLimits, ({ one }) => ({
	user: one(user, { fields: [usageLimits.userId], references: [user.id] }),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
	user: one(user, { fields: [resumes.userId], references: [user.id] }),
	score: one(resumeScores, {
		fields: [resumes.id],
		references: [resumeScores.resumeId],
	}),
	workExperiences: many(workExperiences),
	educations: many(educations),
	skills: many(skills),
	languages: many(languages),
	versions: many(resumeVersions),
	jobMatches: many(jobMatches),
	chatSessions: many(chatSessions),
	exports: many(exports),
	coverLetters: many(coverLetters),
	aiActions: many(aiActions),
}));

export const workExperiencesRelations = relations(workExperiences, ({ one }) => ({
	resume: one(resumes, {
		fields: [workExperiences.resumeId],
		references: [resumes.id],
	}),
}));

export const educationsRelations = relations(educations, ({ one }) => ({
	resume: one(resumes, {
		fields: [educations.resumeId],
		references: [resumes.id],
	}),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
	resume: one(resumes, {
		fields: [skills.resumeId],
		references: [resumes.id],
	}),
}));

export const languagesRelations = relations(languages, ({ one }) => ({
	resume: one(resumes, {
		fields: [languages.resumeId],
		references: [resumes.id],
	}),
}));

export const resumeScoresRelations = relations(resumeScores, ({ one }) => ({
	resume: one(resumes, {
		fields: [resumeScores.resumeId],
		references: [resumes.id],
	}),
	resumeVersion: one(resumeVersions, {
		fields: [resumeScores.resumeVersionId],
		references: [resumeVersions.id],
	}),
}));

export const resumeVersionsRelations = relations(resumeVersions, ({ one, many }) => ({
	originalResume: one(resumes, {
		fields: [resumeVersions.originalResumeId],
		references: [resumes.id],
	}),
	jobMatch: one(jobMatches, {
		fields: [resumeVersions.jobMatchId],
		references: [jobMatches.id],
	}),
	exports: many(exports),

	score: one(resumeScores, {
		fields: [resumeVersions.id],
		references: [resumeScores.resumeVersionId],
	}),
}));

export const jobMatchesRelations = relations(jobMatches, ({ one, many }) => ({
	user: one(user, { fields: [jobMatches.userId], references: [user.id] }),
	resume: one(resumes, {
		fields: [jobMatches.resumeId],
		references: [resumes.id],
	}),
	resumeVersions: many(resumeVersions),
	coverLetters: many(coverLetters),
}));

export const coverLettersRelations = relations(coverLetters, ({ one, many }) => ({
	user: one(user, {
		fields: [coverLetters.userId],
		references: [user.id],
	}),
	baseResume: one(resumes, {
		fields: [coverLetters.baseResumeId],
		references: [resumes.id],
	}),
	jobMatch: one(jobMatches, {
		fields: [coverLetters.jobMatchId],
		references: [jobMatches.id],
	}),
	exports: many(exports),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
	user: one(user, {
		fields: [chatSessions.userId],
		references: [user.id],
	}),
	resume: one(resumes, {
		fields: [chatSessions.resumeId],
		references: [resumes.id],
	}),
	messages: many(messages),
	aiActions: many(aiActions),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	session: one(chatSessions, {
		fields: [messages.sessionId],
		references: [chatSessions.id],
	}),
}));

export const aiActionsRelations = relations(aiActions, ({ one }) => ({
	user: one(user, { fields: [aiActions.userId], references: [user.id] }),
	session: one(chatSessions, {
		fields: [aiActions.sessionId],
		references: [chatSessions.id],
	}),
	resume: one(resumes, {
		fields: [aiActions.resumeId],
		references: [resumes.id],
	}),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
	user: one(user, { fields: [exports.userId], references: [user.id] }),
	resume: one(resumes, {
		fields: [exports.resumeId],
		references: [resumes.id],
	}),
	resumeVersion: one(resumeVersions, {
		fields: [exports.resumeVersionId],
		references: [resumeVersions.id],
	}),
	coverLetter: one(coverLetters, {
		fields: [exports.coverLetterId],
		references: [coverLetters.id],
	}),
}));
