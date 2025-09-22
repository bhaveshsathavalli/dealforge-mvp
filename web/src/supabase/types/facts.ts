import { z } from 'zod';

// ============================================================================
// SOURCE ROW SCHEMA
// ============================================================================

export const SourceRowSchema = z.object({
  id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  metric: z.string(),
  metric_guess: z.string().nullable(),
  url: z.string().url(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  body_hash: z.string(),
  first_party: z.boolean().default(true),
  page_class_confidence: z.number().nullable(),
  http_cache: z.record(z.any()).nullable(),
  trust_tier: z.number().int().min(1).max(3).default(1),
  source_score: z.number().default(0),
  fetched_at: z.string().datetime(),
});

export type SourceRow = z.infer<typeof SourceRowSchema>;

// ============================================================================
// FACT ROW SCHEMA
// ============================================================================

export const FactRowSchema = z.object({
  id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  metric: z.string(),
  key: z.string().nullable(),
  value: z.string().nullable(),
  subject: z.string().nullable(),
  units: z.string().nullable(),
  confidence: z.number().nullable(),
  value_json: z.record(z.any()).nullable(),
  text_summary: z.string().nullable(),
  citations: z.array(z.object({
    url: z.string().url(),
    title: z.string().nullable(),
    source_id: z.string().uuid().nullable(),
  })).default([]),
  fact_score: z.number().default(0),
  first_seen_at: z.string().datetime().default(() => new Date().toISOString()),
  last_seen_at: z.string().datetime().default(() => new Date().toISOString()),
  computed_at: z.string().datetime(),
});

export type FactRow = z.infer<typeof FactRowSchema>;

// ============================================================================
// UPDATE EVENT ROW SCHEMA
// ============================================================================

export const UpdateEventRowSchema = z.object({
  id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  metric: z.string(),
  type: z.enum([
    'PRICE_CHANGE',
    'LIMIT_CHANGE', 
    'NEW_INTEGRATION',
    'INCIDENT',
    'RELEASE_NOTE',
    'SECURITY_SCOPE',
    'MARKETPLACE_UPDATE',
    'SOCIAL_POST'
  ]),
  old: z.record(z.any()).nullable(),
  new: z.record(z.any()).nullable(),
  severity: z.number().int().min(1).max(5).default(1),
  detected_at: z.string().datetime(),
  source_ids: z.array(z.string().uuid()).default([]),
});

export type UpdateEventRow = z.infer<typeof UpdateEventRowSchema>;

// ============================================================================
// RELATED SCHEMAS (for completeness)
// ============================================================================

export const VendorRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  name: z.string(),
  website: z.string().url().nullable(),
  official_site_confidence: z.number().int().default(0),
  socials: z.record(z.any()).default({}),
  created_at: z.string().datetime(),
});

export type VendorRow = z.infer<typeof VendorRowSchema>;

export const CompareRunRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  you_vendor_id: z.string().uuid(),
  comp_vendor_id: z.string().uuid(),
  version: z.number().int().default(1),
  frozen_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export type CompareRunRow = z.infer<typeof CompareRunRowSchema>;

export const CompareRowSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  metric: z.string(),
  you_text: z.string().nullable(),
  comp_text: z.string().nullable(),
  you_citations: z.array(z.object({
    url: z.string().url(),
    title: z.string().nullable(),
    source_id: z.string().uuid().nullable(),
  })).default([]),
  comp_citations: z.array(z.object({
    url: z.string().url(),
    title: z.string().nullable(),
    source_id: z.string().uuid().nullable(),
  })).default([]),
  answer_score_you: z.number().default(0),
  answer_score_comp: z.number().default(0),
  created_at: z.string().datetime(),
});

export type CompareRow = z.infer<typeof CompareRowSchema>;

export const BattlecardBulletSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  metric: z.string(),
  bullet_text: z.string(),
  confidence: z.number().default(0),
  created_at: z.string().datetime(),
});

export type BattlecardBullet = z.infer<typeof BattlecardBulletSchema>;

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

// Schema for creating new source rows (without auto-generated fields)
export const CreateSourceRowSchema = SourceRowSchema.omit({
  id: true,
  fetched_at: true,
}).partial({
  org_id: true,
  metric_guess: true,
  page_class_confidence: true,
  http_cache: true,
});

export type CreateSourceRow = z.infer<typeof CreateSourceRowSchema>;

// Schema for creating new fact rows (without auto-generated fields)
export const CreateFactRowSchema = FactRowSchema.omit({
  id: true,
  computed_at: true,
}).partial({
  org_id: true,
  subject: true,
  units: true,
  confidence: true,
  value_json: true,
  first_seen_at: true,
  last_seen_at: true,
});

export type CreateFactRow = z.infer<typeof CreateFactRowSchema>;

// Schema for creating new update event rows (without auto-generated fields)
export const CreateUpdateEventRowSchema = UpdateEventRowSchema.omit({
  id: true,
}).partial({
  org_id: true,
});

export type CreateUpdateEventRow = z.infer<typeof CreateUpdateEventRowSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateSourceRow(data: unknown): SourceRow {
  return SourceRowSchema.parse(data);
}

export function validateFactRow(data: unknown): FactRow {
  return FactRowSchema.parse(data);
}

export function validateUpdateEventRow(data: unknown): UpdateEventRow {
  return UpdateEventRowSchema.parse(data);
}

export function validateCreateSourceRow(data: unknown): CreateSourceRow {
  return CreateSourceRowSchema.parse(data);
}

export function validateCreateFactRow(data: unknown): CreateFactRow {
  return CreateFactRowSchema.parse(data);
}

export function validateCreateUpdateEventRow(data: unknown): CreateUpdateEventRow {
  return CreateUpdateEventRowSchema.parse(data);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isSourceRow(data: unknown): data is SourceRow {
  return SourceRowSchema.safeParse(data).success;
}

export function isFactRow(data: unknown): data is FactRow {
  return FactRowSchema.safeParse(data).success;
}

export function isUpdateEventRow(data: unknown): data is UpdateEventRow {
  return UpdateEventRowSchema.safeParse(data).success;
}
