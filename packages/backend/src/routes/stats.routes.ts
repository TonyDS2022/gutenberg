import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/stats/summary - Get overall statistics summary
router.get('/summary', statsController.getSummary.bind(statsController));

// GET /api/stats/time?period=week - Get time-based statistics
router.get('/time', statsController.getTimeStats.bind(statsController));

// GET /api/stats/books?limit=10 - Get per-book statistics
router.get('/books', statsController.getBookStats.bind(statsController));

export default router;
