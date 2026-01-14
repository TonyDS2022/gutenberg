import { apiClient } from './client';
import type { Annotation } from '@gutenberg-reader/shared';

export interface CreateAnnotationData {
  bookId: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  startNode?: string;
  endNode?: string;
  context?: string;
  note?: string;
  color?: string;
  tags?: string[];
  chapter?: string;
  pageNumber?: number;
}

export interface UpdateAnnotationData {
  note?: string;
  color?: string;
  tags?: string[];
}

export const annotationsApi = {
  // Get all annotations for current user or filter by bookId
  getAll: async (bookId?: number): Promise<Annotation[]> => {
    const params = bookId ? { bookId: bookId.toString() } : {};
    const response = await apiClient.get('/annotations', { params });
    return response.data;
  },

  // Get specific annotation by ID
  getById: async (id: string): Promise<Annotation> => {
    const response = await apiClient.get(`/annotations/${id}`);
    return response.data;
  },

  // Create new annotation
  create: async (data: CreateAnnotationData): Promise<Annotation> => {
    const response = await apiClient.post('/annotations', data);
    return response.data;
  },

  // Update annotation
  update: async (id: string, data: UpdateAnnotationData): Promise<Annotation> => {
    const response = await apiClient.put(`/annotations/${id}`, data);
    return response.data;
  },

  // Delete annotation
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/annotations/${id}`);
  },

  // Get annotations for specific book
  getByBook: async (bookId: number): Promise<Annotation[]> => {
    return annotationsApi.getAll(bookId);
  },
};
