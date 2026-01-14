import { apiClient } from './client';
import type { Book, BookSearchParams, BookSearchResult, BookContent } from '@gutenberg-reader/shared';

export const booksApi = {
  search: async (params: BookSearchParams): Promise<BookSearchResult> => {
    const response = await apiClient.get<BookSearchResult>('/books', { params });
    return response.data;
  },

  getById: async (bookId: number): Promise<Book> => {
    const response = await apiClient.get<Book>(`/books/${bookId}`);
    return response.data;
  },

  getContent: async (bookId: number, format: 'text' | 'html' = 'text'): Promise<BookContent> => {
    const response = await apiClient.get<BookContent>(`/books/${bookId}/content`, {
      params: { format },
    });
    return response.data;
  },
};
