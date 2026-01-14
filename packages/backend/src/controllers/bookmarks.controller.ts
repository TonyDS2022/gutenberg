import { Request, Response, NextFunction } from 'express';
import { bookmarkService } from '../services/bookmark.service';
import { bookmarkCreateSchema, bookmarkUpdateSchema } from '@gutenberg-reader/shared';

export class BookmarksController {
  async getUserBookmarks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const bookmarks = await bookmarkService.getUserBookmarks(req.user.userId);
      res.json({ bookmarks });
    } catch (error) {
      next(error);
    }
  }

  async getBookmarkForBook(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const bookId = parseInt(req.params.bookId);
      if (isNaN(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const bookmark = await bookmarkService.getBookmarkByUserAndBook(
        req.user.userId,
        bookId
      );

      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      res.json({ bookmark });
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdateBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const data = bookmarkCreateSchema.parse(req.body);
      const bookmark = await bookmarkService.createOrUpdateBookmark(
        req.user.userId,
        data
      );

      res.json({ bookmark });
    } catch (error) {
      next(error);
    }
  }

  async updateBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const bookmarkId = req.params.id;
      const data = bookmarkUpdateSchema.parse(req.body);

      const bookmark = await bookmarkService.updateBookmark(
        req.user.userId,
        bookmarkId,
        data
      );

      res.json({ bookmark });
    } catch (error) {
      next(error);
    }
  }

  async deleteBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const bookmarkId = req.params.id;
      await bookmarkService.deleteBookmark(req.user.userId, bookmarkId);

      res.json({ message: 'Bookmark deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const bookId = parseInt(req.params.bookId);
      if (isNaN(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const bookmark = await bookmarkService.toggleFavorite(
        req.user.userId,
        bookId
      );

      res.json({ bookmark });
    } catch (error) {
      next(error);
    }
  }
}

export const bookmarksController = new BookmarksController();
