import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import type { CoverLetters } from '@/lib/db/schemas/cover-letters.schema.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import { buildPaginatedResult } from '@/shared/types/pagination.type.js';

export type NewCoverLetter = typeof schema.coverLetters.$inferInsert;

export class CoverLettersRepository {
	async create(data: NewCoverLetter): Promise<CoverLetters> {
		const [coverLetter] = await db.insert(schema.coverLetters).values(data).returning();
		if (!coverLetter) throw new Error('Falha ao criar a cover letter.');
		return coverLetter;
	}

	async findById(id: string, userId: string): Promise<CoverLetters | null> {
		const [coverLetter] = await db
			.select()
			.from(schema.coverLetters)
			.where(and(eq(schema.coverLetters.id, id), eq(schema.coverLetters.userId, userId)));
		return coverLetter ?? null;
	}

	async findAllByUser(
		userId: string,
		pagination: Pagination,
	): Promise<PaginatedResult<CoverLetters>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.coverLetters)
				.where(eq(schema.coverLetters.userId, userId))
				.orderBy(desc(schema.coverLetters.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ value: count() })
				.from(schema.coverLetters)
				.where(eq(schema.coverLetters.userId, userId)),
		]);

		const total = countRow?.value ?? 0;
		return buildPaginatedResult(rows, total, pagination);
	}

	async update(
		id: string,
		userId: string,
		data: Partial<Pick<CoverLetters, 'title' | 'content'>>,
	): Promise<CoverLetters> {
		const [updated] = await db
			.update(schema.coverLetters)
			.set(data)
			.where(and(eq(schema.coverLetters.id, id), eq(schema.coverLetters.userId, userId)))
			.returning();
		if (!updated) throw new Error('Falha ao atualizar a cover letter.');
		return updated;
	}

	async delete(id: string, userId: string): Promise<void> {
		await db
			.delete(schema.coverLetters)
			.where(and(eq(schema.coverLetters.id, id), eq(schema.coverLetters.userId, userId)));
	}
}

export type { CoverLetters };
