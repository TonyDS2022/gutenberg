import { Router } from 'express';
import { booksController } from '../controllers/books.controller';
import { optionalAuth } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes (with optional auth for future personalization)
router.get('/', searchLimiter, optionalAuth, booksController.searchBooks.bind(booksController));
router.get('/:id', optionalAuth, booksController.getBookById.bind(booksController));
router.get('/:id/content', optionalAuth, booksController.getBookContent.bind(booksController));
router.get('/:id/assets/:filename', booksController.getBookAsset.bind(booksController));

export default router;
