import { apiClient } from './client';

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

export const statsApi = {
  // Get overall statistics summary
  getSummary: async (): Promise<StatsSummary> => {
    const response = await apiClient.get('/stats/summary');
    return response.data;
  },

  // Get time-based statistics
  getTimeStats: async (period: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<TimeStats> => {
    const response = await apiClient.get('/stats/time', { params: { period } });
    return response.data;
  },

  // Get per-book statistics
  getBookStats: async (limit: number = 10): Promise<BookStats[]> => {
    const response = await apiClient.get('/stats/books', { params: { limit: limit.toString() } });
    return response.data;
  },
};
