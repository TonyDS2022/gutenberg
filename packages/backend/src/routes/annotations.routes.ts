import { Router } from 'express';
import { annotationsController } from '../controllers/annotations.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/annotations - Get all annotations or filter by bookId
router.get('/', annotationsController.getAnnotations.bind(annotationsController));

// POST /api/annotations - Create new annotation
router.post('/', annotationsController.createAnnotation.bind(annotationsController));

// GET /api/annotations/:id - Get specific annotation
router.get('/:id', annotationsController.getAnnotationById.bind(annotationsController));

// PUT /api/annotations/:id - Update annotation
router.put('/:id', annotationsController.updateAnnotation.bind(annotationsController));

// DELETE /api/annotations/:id - Delete annotation
router.delete('/:id', annotationsController.deleteAnnotation.bind(annotationsController));

export default router;
