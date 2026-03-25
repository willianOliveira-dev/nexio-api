import { UsersRepository } from '../repositories/users.repository.js';
import type { UpdateProfileDTO } from '../schemas/update-profile.dto.js';
import { UsersService } from '../services/users.service.js';

export class UsersController {
	private readonly service: UsersService;

	constructor() {
		this.service = new UsersService(new UsersRepository());
	}

	getMe(userId: string) {
		return this.service.getMe(userId);
	}

	updateProfile(userId: string, body: UpdateProfileDTO) {
		return this.service.updateProfile(userId, body);
	}

	getCredits(userId: string) {
		return this.service.getCredits(userId);
	}
}
