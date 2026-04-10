import { DashboardRepository } from '../repositories/dashboard.repository.js';
import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
	private readonly service: DashboardService;

	constructor() {
		this.service = new DashboardService(new DashboardRepository());
	}

	getSummary(userId: string) {
		return this.service.getSummary(userId);
	}
}
