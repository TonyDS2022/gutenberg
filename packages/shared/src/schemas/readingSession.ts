import { z } from 'zod';

export const readingSessionCreateSchema = z.object({
  bookId: z.number().int().positive(),
  startPosition: z.number().int().min(0),
});

export const readingSessionUpdateSchema = z.object({
  endPosition: z.number().int().min(0).optional(),
  charactersRead: z.number().int().min(0).optional(),
  pagesRead: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

export const readingStatsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']).default('all'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ReadingSessionCreateInput = z.infer<typeof readingSessionCreateSchema>;
export type ReadingSessionUpdateInput = z.infer<typeof readingSessionUpdateSchema>;
export type ReadingStatsQuery = z.infer<typeof readingStatsQuerySchema>;
