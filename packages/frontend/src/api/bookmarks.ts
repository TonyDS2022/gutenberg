import { apiClient } from './client';
import type { Bookmark, BookmarkCreateInput, BookmarkUpdateInput } from '@gutenberg-reader/shared';

export const bookmarksApi = {
  // Get all bookmarks for current user
  getAll: async (): Promise<any[]> => {
    const response = await apiClient.get<{ bookmarks: any[] }>('/bookmarks');
    return response.data.bookmarks;
  },

  // Get bookmark for a specific book
  getForBook: async (bookId: number): Promise<Bookmark | null> => {
    try {
      const response = await apiClient.get<{ bookmark: Bookmark }>(
        `/bookmarks/book/${bookId}`
      );
      return response.data.bookmark;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Create or update bookmark
  createOrUpdate: async (data: BookmarkCreateInput): Promise<Bookmark> => {
    const response = await apiClient.post<{ bookmark: Bookmark }>('/bookmarks', data);
    return response.data.bookmark;
  },

  // Update existing bookmark
  update: async (bookmarkId: string, data: BookmarkUpdateInput): Promise<Bookmark> => {
    const response = await apiClient.put<{ bookmark: Bookmark }>(
      `/bookmarks/${bookmarkId}`,
      data
    );
    return response.data.bookmark;
  },

  // Delete bookmark
  delete: async (bookmarkId: string): Promise<void> => {
    await apiClient.delete(`/bookmarks/${bookmarkId}`);
  },

  // Toggle favorite status for a book
  toggleFavorite: async (bookId: number): Promise<Bookmark> => {
    const response = await apiClient.post<{ bookmark: Bookmark }>(
      `/bookmarks/book/${bookId}/favorite`
    );
    return response.data.bookmark;
  },
};
