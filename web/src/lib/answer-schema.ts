import { z } from 'zod';

export const Citation = z.object({
  id: z.string(),               // client-provided temp id (will remap to DB uuids)
  title: z.string().min(1),
  url: z.string().url(),
  domain: z.string().min(1),
  snippet: z.string().min(1).max(500),
  quote: z.string().min(1).max(1000),
});

export const Bullet = z.object({
  text: z.string().min(1).max(600),
  citation_ids: z.array(z.string()).min(2), // enforce 2+ chips per bullet
});

export const AnswerWithCitations = z.object({
  bullets: z.array(Bullet).min(4).max(8),
  citations: z.array(Citation).min(4),
  confidence: z.number().min(0).max(1).optional(),
  disclaimers: z.string().optional(),
});

export type TAnswer = z.infer<typeof AnswerWithCitations>;
export type TCitation = z.infer<typeof Citation>;
export type TBullet = z.infer<typeof Bullet>;
