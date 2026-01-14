import { z } from 'zod';

export const bookmarkCreateSchema = z.object({
  bookId: z.number().int().positive(),
  position: z.number().int().min(0),
  positionType: z.enum(['offset', 'page']).default('offset'),
  chapter: z.string().optional(),
  totalLength: z.number().int().positive().optional(),
  progressPercent: z.number().min(0).max(100).default(0),
  isFavorite: z.boolean().default(false),
});

export const bookmarkUpdateSchema = z.object({
  position: z.number().int().min(0).optional(),
  chapter: z.string().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  isFavorite: z.boolean().optional(),
});

export type BookmarkCreateInput = z.infer<typeof bookmarkCreateSchema>;
export type BookmarkUpdateInput = z.infer<typeof bookmarkUpdateSchema>;
