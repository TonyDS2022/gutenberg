import { Request, Response, NextFunction } from 'express';
import { sessionService, StartSessionDto, EndSessionDto } from '../services/session.service';
import { AppError } from '../middleware/errorHandler';

export class SessionsController {
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data: StartSessionDto = req.body;

      if (!data.bookId || data.startPosition === undefined) {
        throw new AppError(400, 'Missing required fields: bookId, startPosition');
      }

      const session = await sessionService.startSession(userId, data);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  async endSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data: EndSessionDto = req.body;

      if (data.endPosition === undefined) {
        throw new AppError(400, 'Missing required field: endPosition');
      }

      const session = await sessionService.endSession(userId, id, data);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { currentPosition } = req.body;

      if (currentPosition === undefined) {
        throw new AppError(400, 'Missing required field: currentPosition');
      }

      const session = await sessionService.updateSessionProgress(userId, id, currentPosition);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async getActiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { bookId } = req.params;

      const session = await sessionService.getActiveSession(userId, parseInt(bookId));

      if (!session) {
        return res.status(404).json({ message: 'No active session found' });
      }

      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async getUserSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const sessions = await sessionService.getUserSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  }
}

export const sessionsController = new SessionsController();
