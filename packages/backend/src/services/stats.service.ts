import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';

export interface StatsSummary {
  totalReadingTimeMs: number;
  totalBooksRead: number;
  totalBooksCompleted: number;
  averageSessionLengthMs: number;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
}

export interface TimeStats {
  period: 'day' | 'week' | 'month' | 'year';
  data: Array<{
    date: string;
    readingTimeMs: number;
    sessionsCount: number;
  }>;
}

export interface BookStats {
  bookId: number;
  title: string;
  authors: any[];
  totalTimeMs: number;
  sessionsCount: number;
  completed: boolean;
  lastReadAt: Date;
}

export class StatsService {
  async getSummary(userId: string): Promise<StatsSummary> {
    try {
      // Get all completed sessions
      const sessions = await prisma.readingSession.findMany({
        where: {
          userId,
          endTime: { not: null },
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      // Calculate total reading time
      const totalReadingTimeMs = sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);

      // Count unique books read
      const uniqueBooks = new Set(sessions.map((s) => s.bookId));
      const totalBooksRead = uniqueBooks.size;

      // Count completed books
      const completedBooks = new Set(
        sessions.filter((s) => s.completed).map((s) => s.bookId)
      );
      const totalBooksCompleted = completedBooks.size;

      // Calculate average session length
      const averageSessionLengthMs = sessions.length > 0
        ? Math.round(totalReadingTimeMs / sessions.length)
        : 0;

      // Calculate reading streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(sessions);

      return {
        totalReadingTimeMs,
        totalBooksRead,
        totalBooksCompleted,
        averageSessionLengthMs,
        totalSessions: sessions.length,
        currentStreak,
        longestStreak,
      };
    } catch (error) {
      console.error('Error getting stats summary:', error);
      throw new AppError(500, 'Failed to fetch statistics summary');
    }
  }

  async getTimeStats(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<TimeStats> {
    try {
      const now = new Date();
      let startDate: Date;
      let groupByFormat: string;

      // Determine date range based on period
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
          groupByFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
          groupByFormat = '%Y-%m-%d';
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
          groupByFormat = '%Y-%m-%d';
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Last 365 days
          groupByFormat = '%Y-%m';
          break;
      }

      // Fetch sessions in the period
      const sessions = await prisma.readingSession.findMany({
        where: {
          userId,
          startTime: { gte: startDate },
          endTime: { not: null },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Group by date
      const grouped = new Map<string, { readingTimeMs: number; sessionsCount: number }>();

      sessions.forEach((session) => {
        const date = this.formatDate(session.startTime, period);
        const existing = grouped.get(date) || { readingTimeMs: 0, sessionsCount: 0 };

        grouped.set(date, {
          readingTimeMs: existing.readingTimeMs + (session.durationMs || 0),
          sessionsCount: existing.sessionsCount + 1,
        });
      });

      // Convert to array
      const data = Array.from(grouped.entries()).map(([date, stats]) => ({
        date,
        readingTimeMs: stats.readingTimeMs,
        sessionsCount: stats.sessionsCount,
      }));

      return { period, data };
    } catch (error) {
      console.error('Error getting time stats:', error);
      throw new AppError(500, 'Failed to fetch time statistics');
    }
  }

  async getBookStats(userId: string, limit: number = 10): Promise<BookStats[]> {
    try {
      const sessions = await prisma.readingSession.findMany({
        where: {
          userId,
          endTime: { not: null },
        },
        include: {
          book: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      // Group by book
      const bookMap = new Map<number, {
        book: any;
        totalTimeMs: number;
        sessionsCount: number;
        completed: boolean;
        lastReadAt: Date;
      }>();

      sessions.forEach((session) => {
        const existing = bookMap.get(session.bookId);

        if (existing) {
          existing.totalTimeMs += session.durationMs || 0;
          existing.sessionsCount += 1;
          existing.completed = existing.completed || session.completed;
          existing.lastReadAt = session.startTime > existing.lastReadAt
            ? session.startTime
            : existing.lastReadAt;
        } else {
          bookMap.set(session.bookId, {
            book: session.book,
            totalTimeMs: session.durationMs || 0,
            sessionsCount: 1,
            completed: session.completed,
            lastReadAt: session.startTime,
          });
        }
      });

      // Convert to array and sort by total time
      const bookStats = Array.from(bookMap.values())
        .sort((a, b) => b.totalTimeMs - a.totalTimeMs)
        .slice(0, limit)
        .map((stats) => ({
          bookId: stats.book.id,
          title: stats.book.title,
          authors: stats.book.authors,
          totalTimeMs: stats.totalTimeMs,
          sessionsCount: stats.sessionsCount,
          completed: stats.completed,
          lastReadAt: stats.lastReadAt,
        }));

      return bookStats;
    } catch (error) {
      console.error('Error getting book stats:', error);
      throw new AppError(500, 'Failed to fetch book statistics');
    }
  }

  private calculateStreaks(sessions: any[]): { currentStreak: number; longestStreak: number } {
    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Group sessions by date
    const dateSet = new Set<string>();
    sessions.forEach((session) => {
      const date = session.startTime.toISOString().split('T')[0];
      dateSet.add(date);
    });

    const dates = Array.from(dateSet).sort().reverse();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      let currentDate = new Date(dates[0]);

      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        if (dates[i] === prevDateStr) {
          currentStreak++;
          currentDate = prevDate;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i - 1]);
      const prevDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      if (dates[i] === prevDateStr) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  }

  private formatDate(date: Date, period: 'day' | 'week' | 'month' | 'year'): string {
    const d = new Date(date);

    switch (period) {
      case 'day':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      case 'week':
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      case 'year':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
}

export const statsService = new StatsService();
