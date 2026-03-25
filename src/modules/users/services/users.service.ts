import type { z } from '@hono/zod-openapi';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { UserProfiles } from '@/lib/db/schemas/user-profiles.schema.js';
import { NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import type { getMeResponseSchema, profileResponseSchema } from '../schemas/responses.schema.js';
import type { UpdateProfileDTO } from '../schemas/update-profile.dto.js';

dayjs.extend(utc);

type GetMeResult = z.infer<typeof getMeResponseSchema>;
type ProfileResult = z.infer<typeof profileResponseSchema>;

type GetCreditsResult = {
	used: number;
	limit: number;
	remaining: number;
	resetAt: string;
};

export class UsersService {
	constructor(private readonly usersRepository: UsersRepository) {}

	async getMe(userId: string): Promise<GetMeResult> {
		const user = await this.usersRepository.findById(userId);
		if (!user) throw new NotFoundError('Usuário');

		const profile = await this.usersRepository.findProfileByUserId(userId);
		if (!profile) throw new NotFoundError('Perfil do usuário');

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				createdAt: user.createdAt.toISOString(),
			},
			profile: this.mapProfile(profile),
		};
	}

	async updateProfile(userId: string, data: UpdateProfileDTO): Promise<ProfileResult> {
		const profile = await this.usersRepository.upsertProfile(userId, data);
		return this.mapProfile(profile);
	}

	async getCredits(userId: string): Promise<GetCreditsResult> {
		const profile = await this.usersRepository.findProfileByUserId(userId);
		if (!profile) throw new NotFoundError('Perfil do usuário');

		const resetAt = dayjs.utc().add(1, 'month').startOf('month').toISOString();

		return {
			used: profile.aiCreditsUsed,
			limit: profile.aiCreditsLimit,
			remaining: profile.aiCreditsLimit - profile.aiCreditsUsed,
			resetAt,
		};
	}

	async checkAndConsumeCredit(userId: string): Promise<void> {
		const remaining = await this.usersRepository.getCreditsRemaining(userId);
		if (remaining <= 0) {
			throw new PaymentRequiredError('Créditos de IA esgotados');
		}
		await this.usersRepository.incrementCreditsUsed(userId);
	}

	private mapProfile(profile: UserProfiles): ProfileResult {
		return {
			currentRole: profile.currentRole,
			targetRole: profile.targetRole,
			experienceLevel: profile.experienceLevel,
			industry: profile.industry,
			skills: profile.skills,
			socialLinks: profile.socialLinks,
			preferredLanguage: profile.preferredLanguage,
			workModel: profile.workModel,
			willingToRelocate: profile.willingToRelocate,
			writingTone: profile.writingTone,
			careerGoals: profile.careerGoals,
			aiCreditsUsed: profile.aiCreditsUsed,
			aiCreditsLimit: profile.aiCreditsLimit,
		};
	}
}
