import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import type { JobMatches, NewJobMatch } from '@/lib/db/schemas/index.schema.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import { buildPaginatedResult } from '@/shared/types/pagination.type.js';

export class JobMatchesRepository {
	async create(data: NewJobMatch): Promise<JobMatches> {
		const [match] = await db.insert(schema.jobMatches).values(data).returning();
		if (!match) throw new Error('Falha ao criar o job match.');
		return match;
	}

	async findById(id: string, userId: string): Promise<JobMatches | null> {
		const [match] = await db
			.select()
			.from(schema.jobMatches)
			.where(and(eq(schema.jobMatches.id, id), eq(schema.jobMatches.userId, userId)));
		return match ?? null;
	}

	async findAllByUser(
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<JobMatches>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.jobMatches)
				.where(eq(schema.jobMatches.userId, userId))
				.orderBy(desc(schema.jobMatches.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ value: count() })
				.from(schema.jobMatches)
				.where(eq(schema.jobMatches.userId, userId)),
		]);

		const total = countRow?.value ?? 0;
		return buildPaginatedResult(rows, total, pagination);
	}

	async findAllByResume(resumeId: string, userId: string): Promise<JobMatches[]> {
		return db
			.select()
			.from(schema.jobMatches)
			.where(and(eq(schema.jobMatches.resumeId, resumeId), eq(schema.jobMatches.userId, userId)))
			.orderBy(desc(schema.jobMatches.createdAt));
	}

	async delete(id: string, userId: string): Promise<void> {
		await db
			.delete(schema.jobMatches)
			.where(and(eq(schema.jobMatches.id, id), eq(schema.jobMatches.userId, userId)));
	}
}

export type { JobMatches };
