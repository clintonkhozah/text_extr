const { z } = require('zod');

/** Priority is only allowed when the source text clearly implies it. */
const PrioritySchema = z.enum(['urgent', 'high', 'medium', 'low']).nullable();

const ExtractedTaskSchema = z.object({
  description: z.string().min(1),
  owner: z.string().nullable(),
  deadline: z.string().nullable(),
  priority: PrioritySchema,
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.string().optional(),
  unknowns: z.array(z.string()).default([]),
});

const ExtractionResultSchema = z.object({
  tasks: z.array(ExtractedTaskSchema),
  notes: z.array(z.string()).default([]),
  source: z.literal('llm').optional(),
});

const ReviewDecisionSchema = z.object({
  projectId: z.string().uuid().optional(),
  tasks: z
    .array(
      ExtractedTaskSchema.extend({
        approved: z.boolean(),
        projectId: z.string().uuid().nullable().optional(),
        status: z.enum(['incoming', 'in_progress', 'waiting', 'done']).optional(),
        editedDescription: z.string().optional(),
        editedOwner: z.string().nullable().optional(),
        editedDeadline: z.string().nullable().optional(),
        editedPriority: PrioritySchema.optional(),
      })
    )
    .min(1),
});

module.exports = {
  ExtractedTaskSchema,
  ExtractionResultSchema,
  ReviewDecisionSchema,
  PrioritySchema,
};
