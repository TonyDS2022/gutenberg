export interface ReadingSession {
  id: string;
  userId: string;
  bookId: number;
  startTime: Date | string;
  endTime?: Date | string | null;
  durationMs?: number | null;
  startPosition: number;
  endPosition?: number | null;
  charactersRead: number;
  pagesRead: number;
  completed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReadingSessionCreateInput {
  bookId: number;
  startPosition: number;
}

export interface ReadingSessionUpdateInput {
  endPosition?: number;
  charactersRead?: number;
  pagesRead?: number;
  completed?: boolean;
}

export interface ReadingSessionWithBook extends ReadingSession {
  book: {
    id: number;
    title: string;
    authors: any;
  };
}

export interface ReadingStats {
  totalReadingTimeMs: number;
  totalBooksRead: number;
  totalBooksCompleted: number;
  totalPagesRead: number;
  averageSessionDurationMs: number;
  readingStreak: number; // consecutive days with reading
  booksCompletedThisMonth: number;
  readingTimeThisWeek: number;
  readingTimeThisMonth: number;
  recentSessions: ReadingSessionWithBook[];
}

export interface ReadingStatsQuery {
  period?: 'week' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}
