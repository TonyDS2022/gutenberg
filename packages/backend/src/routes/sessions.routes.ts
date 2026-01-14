import { Router } from 'express';
import { sessionsController } from '../controllers/sessions.controller';
import { authenticate } from '../middleware/auth';
import { sessionLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Apply lenient rate limiting for session tracking
router.use(sessionLimiter);

// POST /api/sessions - Start new reading session
router.post('/', sessionsController.startSession.bind(sessionsController));

// GET /api/sessions - Get user's reading sessions
router.get('/', sessionsController.getUserSessions.bind(sessionsController));

// GET /api/sessions/active/:bookId - Get active session for a book
router.get('/active/:bookId', sessionsController.getActiveSession.bind(sessionsController));

// PUT /api/sessions/:id/end - End reading session
router.put('/:id/end', sessionsController.endSession.bind(sessionsController));

// PUT /api/sessions/:id/progress - Update session progress
router.put('/:id/progress', sessionsController.updateProgress.bind(sessionsController));

export default router;
