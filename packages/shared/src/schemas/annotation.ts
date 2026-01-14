import { z } from 'zod';

export const annotationCreateSchema = z.object({
  bookId: z.number().int().positive(),
  selectedText: z.string().min(1, 'Selected text is required').max(5000),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  startNode: z.string().optional(),
  endNode: z.string().optional(),
  context: z.string().max(1000).optional(),
  note: z.string().max(10000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#ffeb3b'),
  tags: z.array(z.string()).default([]),
  chapter: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
});

export const annotationUpdateSchema = z.object({
  note: z.string().max(10000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  tags: z.array(z.string()).optional(),
});

export type AnnotationCreateInput = z.infer<typeof annotationCreateSchema>;
export type AnnotationUpdateInput = z.infer<typeof annotationUpdateSchema>;
