export type Pagination = {
	page: number;
	limit: number;
};

export type PaginatedResult<T> = {
	data: T[];
	meta: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
		hasNext: boolean;
		hasPrevious: boolean;
	};
};

export type Plan = 'free' | 'pro' | 'enterprise';

export function buildPaginatedResult<T>(
	data: T[],
	total: number,
	pagination: Pagination,
): PaginatedResult<T> {
	const { page, limit } = pagination;
	const totalPages = Math.ceil(total / limit);
	return {
		data,
		meta: {
			total,
			page,
			limit,
			totalPages,
			hasNext: page < totalPages,
			hasPrevious: page > 1,
		},
	};
}
