import { Request, Response, NextFunction } from 'express';
import { annotationService, CreateAnnotationDto, UpdateAnnotationDto } from '../services/annotation.service';
import { AppError } from '../middleware/errorHandler';

export class AnnotationsController {
  async createAnnotation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data: CreateAnnotationDto = req.body;

      // Validate required fields
      if (!data.bookId || !data.selectedText || data.startOffset === undefined || data.endOffset === undefined) {
        throw new AppError(400, 'Missing required fields: bookId, selectedText, startOffset, endOffset');
      }

      const annotation = await annotationService.createAnnotation(userId, data);

      res.status(201).json(annotation);
    } catch (error) {
      next(error);
    }
  }

  async getAnnotations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { bookId } = req.query;

      if (bookId) {
        // Get annotations for specific book
        const annotations = await annotationService.getAnnotationsByBook(
          userId,
          parseInt(bookId as string)
        );
        res.json(annotations);
      } else {
        // Get all annotations for user
        const annotations = await annotationService.getAllAnnotations(userId);
        res.json(annotations);
      }
    } catch (error) {
      next(error);
    }
  }

  async getAnnotationById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const annotation = await annotationService.getAnnotationById(userId, id);
      res.json(annotation);
    } catch (error) {
      next(error);
    }
  }

  async updateAnnotation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data: UpdateAnnotationDto = req.body;

      const annotation = await annotationService.updateAnnotation(userId, id, data);
      res.json(annotation);
    } catch (error) {
      next(error);
    }
  }

  async deleteAnnotation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await annotationService.deleteAnnotation(userId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const annotationsController = new AnnotationsController();
