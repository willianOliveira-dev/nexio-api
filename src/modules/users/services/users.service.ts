import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { User } from '@/lib/db/schemas/user.schema.js';
import type { UserProfiles } from '@/lib/db/schemas/user-profiles.schema.js';
import { NotFoundError, PaymentRequiredError } from '@/shared/errors/app.error.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import type { UpdateProfileDTO } from '../schemas/update-profile.dto.js';

dayjs.extend(utc);

type GetMeResult = { user: User; profile: UserProfiles };
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

		return { user, profile };
	}

	async updateProfile(userId: string, data: UpdateProfileDTO): Promise<UserProfiles> {
		return this.usersRepository.upsertProfile(userId, data);
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
}
