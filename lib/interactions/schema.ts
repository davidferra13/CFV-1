import { z } from 'zod'

export const interactionActorSchema = z
  .object({
    role: z.enum(['anonymous', 'chef', 'client', 'staff', 'partner', 'system']).optional(),
    actorId: z.string().min(1).optional(),
    tenantId: z.string().min(1).nullable().optional(),
    entityId: z.string().min(1).nullable().optional(),
  })
  .strict()

export const executeInteractionInputSchema = z
  .object({
    action_type: z.string().min(1),
    actor_id: z.string().min(1).nullable().optional(),
    target_type: z.enum(['content', 'user', 'event', 'menu', 'system']),
    target_id: z.string().min(1),
    context_type: z.enum(['event', 'menu', 'client', 'message']).nullable().optional(),
    context_id: z.string().min(1).nullable().optional(),
    state: z.enum(['pending', 'active', 'completed', 'failed', 'cancelled', 'hidden']).optional(),
    visibility: z.enum(['public', 'private', 'role', 'event', 'system']).optional(),
    permissions: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    actor: interactionActorSchema.partial().optional(),
    idempotency_key: z.string().min(1).nullable().optional(),
  })
  .strict()
