import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';
import type { Annotation } from '@gutenberg-reader/shared';

export interface CreateAnnotationDto {
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

export interface UpdateAnnotationDto {
  note?: string;
  color?: string;
  tags?: string[];
}

export class AnnotationService {
  async createAnnotation(userId: string, data: CreateAnnotationDto): Promise<Annotation> {
    try {
      // Verify book exists
      const book = await prisma.book.findUnique({
        where: { id: data.bookId },
      });

      if (!book) {
        throw new AppError(404, 'Book not found');
      }

      const annotation = await prisma.annotation.create({
        data: {
          userId,
          bookId: data.bookId,
          selectedText: data.selectedText,
          startOffset: data.startOffset,
          endOffset: data.endOffset,
          startNode: data.startNode,
          endNode: data.endNode,
          context: data.context,
          note: data.note,
          color: data.color || '#ffeb3b',
          tags: data.tags || [],
          chapter: data.chapter,
          pageNumber: data.pageNumber,
        },
        include: {
          book: true,
        },
      });

      return this.formatAnnotation(annotation);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error creating annotation:', error);
      throw new AppError(500, 'Failed to create annotation');
    }
  }

  async getAnnotationsByBook(userId: string, bookId: number): Promise<Annotation[]> {
    try {
      const annotations = await prisma.annotation.findMany({
        where: {
          userId,
          bookId,
        },
        include: {
          book: true,
        },
        orderBy: {
          startOffset: 'asc',
        },
      });

      return annotations.map((annotation) => this.formatAnnotation(annotation));
    } catch (error) {
      console.error('Error fetching annotations:', error);
      throw new AppError(500, 'Failed to fetch annotations');
    }
  }

  async getAnnotationById(userId: string, annotationId: string): Promise<Annotation> {
    try {
      const annotation = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          userId,
        },
        include: {
          book: true,
        },
      });

      if (!annotation) {
        throw new AppError(404, 'Annotation not found');
      }

      return this.formatAnnotation(annotation);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error fetching annotation:', error);
      throw new AppError(500, 'Failed to fetch annotation');
    }
  }

  async updateAnnotation(
    userId: string,
    annotationId: string,
    data: UpdateAnnotationDto
  ): Promise<Annotation> {
    try {
      // Verify annotation belongs to user
      const existing = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          userId,
        },
      });

      if (!existing) {
        throw new AppError(404, 'Annotation not found');
      }

      const annotation = await prisma.annotation.update({
        where: { id: annotationId },
        data: {
          note: data.note,
          color: data.color,
          tags: data.tags,
        },
        include: {
          book: true,
        },
      });

      return this.formatAnnotation(annotation);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating annotation:', error);
      throw new AppError(500, 'Failed to update annotation');
    }
  }

  async deleteAnnotation(userId: string, annotationId: string): Promise<void> {
    try {
      const annotation = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          userId,
        },
      });

      if (!annotation) {
        throw new AppError(404, 'Annotation not found');
      }

      await prisma.annotation.delete({
        where: { id: annotationId },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting annotation:', error);
      throw new AppError(500, 'Failed to delete annotation');
    }
  }

  async getAllAnnotations(userId: string): Promise<Annotation[]> {
    try {
      const annotations = await prisma.annotation.findMany({
        where: {
          userId,
        },
        include: {
          book: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return annotations.map((annotation) => this.formatAnnotation(annotation));
    } catch (error) {
      console.error('Error fetching all annotations:', error);
      throw new AppError(500, 'Failed to fetch annotations');
    }
  }

  private formatAnnotation(annotation: any): Annotation {
    return {
      id: annotation.id,
      userId: annotation.userId,
      bookId: annotation.bookId,
      selectedText: annotation.selectedText,
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset,
      startNode: annotation.startNode,
      endNode: annotation.endNode,
      context: annotation.context,
      note: annotation.note,
      color: annotation.color,
      tags: annotation.tags,
      chapter: annotation.chapter,
      pageNumber: annotation.pageNumber,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
      book: annotation.book,
    };
  }
}

export const annotationService = new AnnotationService();
