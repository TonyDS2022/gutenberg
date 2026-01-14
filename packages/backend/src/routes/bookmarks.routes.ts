import { Router } from 'express';
import { bookmarksController } from '../controllers/bookmarks.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All bookmark routes require authentication
router.use(authenticate);

// Get all bookmarks for current user
router.get('/', bookmarksController.getUserBookmarks.bind(bookmarksController));

// Create or update bookmark
router.post('/', bookmarksController.createOrUpdateBookmark.bind(bookmarksController));

// Get bookmark for specific book
router.get('/book/:bookId', bookmarksController.getBookmarkForBook.bind(bookmarksController));

// Toggle favorite status for a book
router.post('/book/:bookId/favorite', bookmarksController.toggleFavorite.bind(bookmarksController));

// Update specific bookmark
router.put('/:id', bookmarksController.updateBookmark.bind(bookmarksController));

// Delete bookmark
router.delete('/:id', bookmarksController.deleteBookmark.bind(bookmarksController));

export default router;
