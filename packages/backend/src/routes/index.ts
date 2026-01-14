import { Router } from 'express';
import authRoutes from './auth.routes';
import booksRoutes from './books.routes';
import bookmarksRoutes from './bookmarks.routes';
import annotationsRoutes from './annotations.routes';
import sessionsRoutes from './sessions.routes';
import statsRoutes from './stats.routes';
import dictionaryRoutes from './dictionary.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/books', booksRoutes);
router.use('/bookmarks', bookmarksRoutes);
router.use('/annotations', annotationsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/stats', statsRoutes);
router.use('/dictionary', dictionaryRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Gutenberg Reader API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
      books: {
        search: 'GET /api/books?search=',
        getById: 'GET /api/books/:id',
        getContent: 'GET /api/books/:id/content?format=text|html',
      },
      bookmarks: {
        list: 'GET /api/bookmarks',
        create: 'POST /api/bookmarks',
        getForBook: 'GET /api/bookmarks/book/:bookId',
        toggleFavorite: 'POST /api/bookmarks/book/:bookId/favorite',
        update: 'PUT /api/bookmarks/:id',
        delete: 'DELETE /api/bookmarks/:id',
      },
      annotations: {
        list: 'GET /api/annotations?bookId=',
        create: 'POST /api/annotations',
        getById: 'GET /api/annotations/:id',
        update: 'PUT /api/annotations/:id',
        delete: 'DELETE /api/annotations/:id',
      },
      sessions: {
        start: 'POST /api/sessions',
        list: 'GET /api/sessions',
        getActive: 'GET /api/sessions/active/:bookId',
        end: 'PUT /api/sessions/:id/end',
        updateProgress: 'PUT /api/sessions/:id/progress',
      },
      stats: {
        summary: 'GET /api/stats/summary',
        time: 'GET /api/stats/time?period=week',
        books: 'GET /api/stats/books?limit=10',
      },
      dictionary: {
        lookup: 'GET /api/dictionary/:word',
        providers: 'GET /api/dictionary',
      },
    },
  });
});

export default router;
