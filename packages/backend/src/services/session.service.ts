import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';
import type { ReadingSession } from '@gutenberg-reader/shared';

export interface StartSessionDto {
  bookId: number;
  startPosition: number;
}

export interface EndSessionDto {
  endPosition: number;
  charactersRead?: number;
  pagesRead?: number;
  completed?: boolean;
}

export class SessionService {
  async startSession(userId: string, data: StartSessionDto): Promise<ReadingSession> {
    try {
      // Check if book exists
      const book = await prisma.book.findUnique({
        where: { id: data.bookId },
      });

      if (!book) {
        throw new AppError(404, 'Book not found');
      }

      // Check if there's an active session for this book
      const activeSession = await prisma.readingSession.findFirst({
        where: {
          userId,
          bookId: data.bookId,
          endTime: null,
        },
      });

      if (activeSession) {
        // Return existing active session
        return this.formatSession(activeSession);
      }

      // Create new session
      const session = await prisma.readingSession.create({
        data: {
          userId,
          bookId: data.bookId,
          startPosition: data.startPosition,
          startTime: new Date(),
        },
      });

      return this.formatSession(session);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error starting session:', error);
      throw new AppError(500, 'Failed to start reading session');
    }
  }

  async endSession(userId: string, sessionId: string, data: EndSessionDto): Promise<ReadingSession> {
    try {
      // Verify session belongs to user
      const session = await prisma.readingSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      // If session is already ended, return it (idempotent)
      if (session.endTime) {
        return this.formatSession(session);
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - session.startTime.getTime();

      // Calculate characters read if not provided
      const charactersRead = data.charactersRead ?? Math.max(0, data.endPosition - session.startPosition);

      const updatedSession = await prisma.readingSession.update({
        where: { id: sessionId },
        data: {
          endTime,
          endPosition: data.endPosition,
          durationMs,
          charactersRead,
          pagesRead: data.pagesRead ?? 0,
          completed: data.completed ?? false,
        },
      });

      return this.formatSession(updatedSession);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error ending session:', error);
      throw new AppError(500, 'Failed to end reading session');
    }
  }

  async updateSessionProgress(userId: string, sessionId: string, currentPosition: number): Promise<ReadingSession> {
    try {
      const session = await prisma.readingSession.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      // Don't update progress for ended sessions
      if (session.endTime) {
        return this.formatSession(session);
      }

      const charactersRead = Math.max(0, currentPosition - session.startPosition);

      const updatedSession = await prisma.readingSession.update({
        where: { id: sessionId },
        data: {
          endPosition: currentPosition,
          charactersRead,
        },
      });

      return this.formatSession(updatedSession);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating session progress:', error);
      throw new AppError(500, 'Failed to update session progress');
    }
  }

  async getActiveSession(userId: string, bookId: number): Promise<ReadingSession | null> {
    try {
      const session = await prisma.readingSession.findFirst({
        where: {
          userId,
          bookId,
          endTime: null,
        },
      });

      return session ? this.formatSession(session) : null;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  async getUserSessions(userId: string, limit: number = 50): Promise<ReadingSession[]> {
    try {
      const sessions = await prisma.readingSession.findMany({
        where: { userId },
        include: {
          book: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        take: limit,
      });

      return sessions.map((session) => this.formatSession(session));
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw new AppError(500, 'Failed to fetch reading sessions');
    }
  }

  private formatSession(session: any): ReadingSession {
    return {
      id: session.id,
      userId: session.userId,
      bookId: session.bookId,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      startPosition: session.startPosition,
      endPosition: session.endPosition,
      charactersRead: session.charactersRead,
      pagesRead: session.pagesRead,
      completed: session.completed,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      book: session.book,
    };
  }
}

export const sessionService = new SessionService();
