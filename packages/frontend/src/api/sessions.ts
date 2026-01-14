import { apiClient } from './client';
import type { ReadingSession } from '@gutenberg-reader/shared';

export interface StartSessionData {
  bookId: number;
  startPosition: number;
}

export interface EndSessionData {
  endPosition: number;
  charactersRead?: number;
  pagesRead?: number;
  completed?: boolean;
}

export const sessionsApi = {
  // Start a new reading session
  start: async (data: StartSessionData): Promise<ReadingSession> => {
    const response = await apiClient.post('/sessions', data);
    return response.data;
  },

  // End a reading session
  end: async (sessionId: string, data: EndSessionData): Promise<ReadingSession> => {
    const response = await apiClient.put(`/sessions/${sessionId}/end`, data);
    return response.data;
  },

  // Update session progress (heartbeat)
  updateProgress: async (sessionId: string, currentPosition: number): Promise<ReadingSession> => {
    const response = await apiClient.put(`/sessions/${sessionId}/progress`, { currentPosition });
    return response.data;
  },

  // Get active session for a book
  getActive: async (bookId: number): Promise<ReadingSession | null> => {
    try {
      const response = await apiClient.get(`/sessions/active/${bookId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Get all user sessions
  getAll: async (limit?: number): Promise<ReadingSession[]> => {
    const params = limit ? { limit: limit.toString() } : {};
    const response = await apiClient.get('/sessions', { params });
    return response.data;
  },
};
