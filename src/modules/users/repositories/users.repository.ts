import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection.js';
import * as schema from '@/lib/db/schemas/index.schema.js';
import type { User } from '@/lib/db/schemas/user.schema.js';
import type { UserProfiles } from '@/lib/db/schemas/user-profiles.schema.js';
import { getAiCreditsPerMonth } from '@/shared/config/plan-limits.js';
import type { UpdateProfileDTO } from '../schemas/update-profile.dto.js';

export class UsersRepository {
	async findById(userId: string): Promise<User | null> {
		const [user] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
		return user ?? null;
	}

	async findProfileByUserId(userId: string): Promise<UserProfiles | null> {
		const [profile] = await db
			.select()
			.from(schema.userProfiles)
			.where(eq(schema.userProfiles.userId, userId));
		return profile ?? null;
	}

	async upsertProfile(userId: string, data: UpdateProfileDTO): Promise<UserProfiles> {
		const [profile] = await db
			.insert(schema.userProfiles)
			.values({ userId, ...data })
			.onConflictDoUpdate({
				target: schema.userProfiles.userId,
				set: {
					...data,
					updatedAt: new Date(),
				},
			})
			.returning();

		if (!profile) throw new Error('Falha ao salvar o perfil do usuário.');

		return profile;
	}

	async incrementCreditsUsed(userId: string): Promise<void> {
		await db
			.update(schema.userProfiles)
			.set({ aiCreditsUsed: sql`${schema.userProfiles.aiCreditsUsed} + 1` })
			.where(eq(schema.userProfiles.userId, userId));
	}

	async getCreditsRemaining(userId: string): Promise<number> {
		const profile = await this.findProfileByUserId(userId);
		if (!profile) return 0;
		const limit = getAiCreditsPerMonth(profile.plan);
		return limit - profile.aiCreditsUsed;
	}
}
