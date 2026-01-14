import { Router } from 'express';
import { dictionaryController } from '../controllers/dictionary.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dictionary routes require authentication
router.use(authenticate);

// GET /api/dictionary - Get available providers and status
router.get('/', dictionaryController.getProviders);

// GET /api/dictionary/:word - Lookup a word
router.get('/:word', dictionaryController.lookup);

export default router;
