import { z } from 'zod/v4';

const catalogueKindSchema = z.enum(['numeric', 'categorical', 'geo', 'composite', 'session', 'event']);

const catalogueNamespaceSchema = z.enum(['canonical', 'custom']);

const numericShapeSchema = z.object({
  range: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .refine((r) => r.min < r.max, { message: 'range.min must be less than range.max' })
    .optional(),
});

const categoricalShapeSchema = z.object({
  values: z.array(z.string().min(1)).min(1),
});

const compositeShapeSchema = z.object({
  components: z.record(z.string().min(1), z.string().min(1)),
});

const emptyShapeSchema = z.object({}).strict();

// Custom catalogue ID must be vendor-prefixed: `<vendor>.<metric>`. This
// keeps user-registered entries cleanly namespaced apart from canonical IDs.
const customIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/,
    'Custom catalogue IDs must match <vendor>.<metric> with lowercase ASCII, digits, and underscores',
  );

const aliasSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/,
    'Aliases must match <vendor>.<name> with lowercase ASCII, digits, and underscores',
  );

const createCustomEntrySchema = z.discriminatedUnion('kind', [
  z.object({
    id: customIdSchema,
    kind: z.literal('numeric'),
    unit: z.string().min(1),
    description: z.string().optional(),
    shape: numericShapeSchema.default({}),
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('categorical'),
    description: z.string().optional(),
    shape: categoricalShapeSchema,
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('geo'),
    description: z.string().optional(),
    shape: emptyShapeSchema.default({}),
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('composite'),
    description: z.string().optional(),
    shape: compositeShapeSchema,
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('session'),
    description: z.string().optional(),
    shape: emptyShapeSchema.default({}),
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('event'),
    description: z.string().optional(),
    shape: emptyShapeSchema.default({}),
  }),
]);

const createAliasInputSchema = z.object({
  alias: aliasSchema,
  canonical_id: z.string().min(1),
});

const catalogueEntryResponseSchema = z.object({
  id: z.string(),
  kind: catalogueKindSchema,
  namespace: catalogueNamespaceSchema,
  version: z.number().int(),
  unit: z.string().nullable(),
  description: z.string().nullable(),
  shape: z.record(z.string(), z.unknown()),
  deprecated: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const catalogueAliasResponseSchema = z.object({
  alias: z.string(),
  canonical_id: z.string(),
  created_at: z.string(),
});

type CreateCustomEntryInput = z.infer<typeof createCustomEntrySchema>;
type CreateAliasInput = z.infer<typeof createAliasInputSchema>;
type CatalogueEntryResponse = z.infer<typeof catalogueEntryResponseSchema>;
type CatalogueAliasResponse = z.infer<typeof catalogueAliasResponseSchema>;

z.globalRegistry.add(catalogueEntryResponseSchema, { id: 'CatalogueEntry' });
z.globalRegistry.add(catalogueAliasResponseSchema, { id: 'CatalogueAlias' });
z.globalRegistry.add(createCustomEntrySchema, { id: 'CreateCustomEntry' });
z.globalRegistry.add(createAliasInputSchema, { id: 'CreateAlias' });

export type { CatalogueAliasResponse, CatalogueEntryResponse, CreateAliasInput, CreateCustomEntryInput };
export {
  catalogueAliasResponseSchema,
  catalogueEntryResponseSchema,
  catalogueKindSchema,
  catalogueNamespaceSchema,
  createAliasInputSchema,
  createCustomEntrySchema,
};
