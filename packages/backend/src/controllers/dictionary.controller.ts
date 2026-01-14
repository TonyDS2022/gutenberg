import { Request, Response, NextFunction } from 'express';
import { dictionaryService } from '../services/dictionary';
import { AppError } from '../middleware/errorHandler';

export class DictionaryController {
  async lookup(req: Request, res: Response, next: NextFunction) {
    try {
      const { word } = req.params;
      const { provider } = req.query;

      if (!word || word.trim().length === 0) {
        throw new AppError(400, 'Word parameter is required');
      }

      const result = await dictionaryService.lookup(
        word,
        provider as string | undefined
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const providers = dictionaryService.getAvailableProviders();
      const isConfigured = dictionaryService.isConfigured();

      res.json({
        providers,
        isConfigured,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dictionaryController = new DictionaryController();
