import { Request, Response, NextFunction } from 'express';
import { gutenbergService } from '../services/gutenberg.service';

export class BooksController {
  async searchBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const searchParams = {
        search: req.query.search as string,
        author: req.query.author as string,
        title: req.query.title as string,
        languages: req.query.languages as string,
        topic: req.query.topic as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
      };

      const result = await gutenbergService.searchBooks(searchParams);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getBookById(req: Request, res: Response, next: NextFunction) {
    try {
      const bookId = parseInt(req.params.id);

      if (isNaN(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const book = await gutenbergService.getBookById(bookId);

      res.json(book);
    } catch (error) {
      next(error);
    }
  }

  async getBookContent(req: Request, res: Response, next: NextFunction) {
    try {
      const bookId = parseInt(req.params.id);
      const format = (req.query.format as 'text' | 'html') || 'text';

      if (isNaN(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const content = await gutenbergService.getBookContent(bookId, format);

      res.json(content);
    } catch (error) {
      next(error);
    }
  }
}

export const booksController = new BooksController();
