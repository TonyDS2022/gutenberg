import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/stats.service';
import { AppError } from '../middleware/errorHandler';

export class StatsController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await statsService.getSummary(userId);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }

  async getTimeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const period = (req.query.period as string) || 'week';

      if (!['day', 'week', 'month', 'year'].includes(period)) {
        throw new AppError(400, 'Invalid period. Must be: day, week, month, or year');
      }

      const stats = await statsService.getTimeStats(userId, period as any);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getBookStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const stats = await statsService.getBookStats(userId, limit);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

export const statsController = new StatsController();
