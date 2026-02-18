import { z } from "zod";

export const REQUIRED_FIELDS = ["date", "type", "value", "unit"] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const recordRowSchema = z.object({
  date: z.string(),
  type: z.string(),
  value: z.number(),
  unit: z.string(),
  site: z.string().optional(),
  operator: z.string().optional(),
  notes: z.string().optional(),
  record_id: z.string().optional(),
});

export type RecordRow = z.infer<typeof recordRowSchema>;
