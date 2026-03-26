import type { Educations } from '@/lib/db/schemas/educations.schema.js';
import type { Languages } from '@/lib/db/schemas/languages.schema.js';
import type { Skills } from '@/lib/db/schemas/skills.schema.js';
import type { WorkExperiences } from '@/lib/db/schemas/work-experiences.schema.js';

export type Certification = {
	name: string;
	issuer: string;
	issueDate?: string | null;
	expirationDate?: string | null;
	url?: string | null;
};

export type Project = {
	name: string;
	description: string;
	keywords?: string[] | null;
	url?: string | null;
};

export type Volunteering = {
	role: string;
	organization: string;
	startDate?: string | null;
	endDate?: string | null;
	description?: string | null;
};

export type ExportResumeData = {
	contact: {
		fullName: string;
		email: string;
		phone?: string;
		location?: string;
		website?: string;
	};
	professionalSummary?: string;
	workExperiences: WorkExperiences[];
	educations: Educations[];
	skills: Skills[];
	languages: Languages[];
	certifications: Certification[];
	projects: Project[];
	volunteering: Volunteering[];
};

type Labels = {
	summary: string;
	experience: string;
	education: string;
	skills: string;
	languages: string;
	certifications: string;
	projects: string;
	volunteering: string;
	present: string;
};

const LABELS: Record<'pt' | 'en', Labels> = {
	pt: {
		summary: 'Resumo Profissional',
		experience: 'Experiência Profissional',
		education: 'Formação Acadêmica',
		skills: 'Habilidades',
		languages: 'Idiomas',
		certifications: 'Certificações',
		projects: 'Projetos',
		volunteering: 'Trabalho Voluntário',
		present: 'Presente',
	},
	en: {
		summary: 'Professional Summary',
		experience: 'Work Experience',
		education: 'Education',
		skills: 'Skills',
		languages: 'Languages',
		certifications: 'Certifications',
		projects: 'Projects',
		volunteering: 'Volunteering',
		present: 'Present',
	},
};

export function getLabels(language: 'pt' | 'en'): Labels {
	return LABELS[language];
}
