import { and, count, desc, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import type { Exports, NewExport } from '@/lib/db/schemas/exports.schema.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { PaginatedResult, Pagination } from '@/shared/types/pagination.type.js';
import { buildPaginatedResult } from '@/shared/types/pagination.type.js';

export class ExportsRepository {
	async create(data: NewExport): Promise<Exports> {
		const [row] = await db.insert(schema.exports).values(data).returning();
		if (!row) throw new Error('Falha ao criar o export.');
		return row;
	}

	async findById(id: string, userId: string): Promise<Exports | null> {
		const [row] = await db
			.select()
			.from(schema.exports)
			.where(and(eq(schema.exports.id, id), eq(schema.exports.userId, userId)));
		return row ?? null;
	}

	async findByShareToken(token: string): Promise<Exports | null> {
		const [row] = await db
			.select()
			.from(schema.exports)
			.where(
				and(eq(schema.exports.shareToken, token), gt(schema.exports.shareExpiresAt, new Date())),
			);
		return row ?? null;
	}

	async findAllByUser(userId: string, pagination: Pagination): Promise<PaginatedResult<Exports>> {
		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(schema.exports)
				.where(eq(schema.exports.userId, userId))
				.orderBy(desc(schema.exports.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ value: count() }).from(schema.exports).where(eq(schema.exports.userId, userId)),
		]);

		const total = countRow?.value ?? 0;
		return buildPaginatedResult(rows, total, pagination);
	}

	async updateStatus(
		id: string,
		status: 'pending' | 'running' | 'completed' | 'failed',
		storageKey?: string,
	): Promise<void> {
		const set: Record<string, unknown> = { status };
		if (storageKey) set.storageKey = storageKey;
		await db.update(schema.exports).set(set).where(eq(schema.exports.id, id));
	}

	async setShareToken(id: string, token: string, expiresAt: Date): Promise<void> {
		await db
			.update(schema.exports)
			.set({ shareToken: token, shareExpiresAt: expiresAt })
			.where(eq(schema.exports.id, id));
	}
}
