export type ExportCoverLetterData = {
	title: string;
	content: string;
};

type CoverLetterLabels = {
	coverLetter: string;
};

const COVER_LETTER_LABELS: Record<'pt' | 'en', CoverLetterLabels> = {
	pt: {
		coverLetter: 'Carta de Apresentação',
	},
	en: {
		coverLetter: 'Cover Letter',
	},
};

export function getCoverLetterLabels(language: 'pt' | 'en'): CoverLetterLabels {
	return COVER_LETTER_LABELS[language];
}
