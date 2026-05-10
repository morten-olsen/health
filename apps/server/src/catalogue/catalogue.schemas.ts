import { z } from 'zod/v4';

const catalogueKindSchema = z.enum(['numeric', 'categorical', 'geo', 'composite', 'session', 'event']);

const catalogueNamespaceSchema = z.enum(['canonical', 'custom']);

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

const rangeSchema = z
  .object({ min: z.number(), max: z.number() })
  .refine((r) => r.min < r.max, { message: 'range.min must be less than range.max' });

const numericConfigSchema = z.object({
  unit: z.string().min(1),
  range: rangeSchema.optional(),
});

const categoricalConfigSchema = z.object({
  values: z.array(z.string().min(1)).min(1),
});

const geoConfigSchema = z.object({}).strict();

const compositeComponentSchema = z.object({
  unit: z.string().min(1),
  range: rangeSchema.optional(),
});

const compositeConfigSchema = z.object({
  components: z.record(z.string().min(1), compositeComponentSchema),
});

const sessionConfigSchema = z.object({}).strict();

// Ajv meta-validates the JSON Schema; Zod just enforces "is an object".
const eventConfigSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
});

type Range = z.infer<typeof rangeSchema>;
type NumericConfig = z.infer<typeof numericConfigSchema>;
type CategoricalConfig = z.infer<typeof categoricalConfigSchema>;
type GeoConfig = z.infer<typeof geoConfigSchema>;
type CompositeComponent = z.infer<typeof compositeComponentSchema>;
type CompositeConfig = z.infer<typeof compositeConfigSchema>;
type SessionConfig = z.infer<typeof sessionConfigSchema>;
type EventConfig = z.infer<typeof eventConfigSchema>;

const createCustomEntrySchema = z.discriminatedUnion('kind', [
  z.object({
    id: customIdSchema,
    kind: z.literal('numeric'),
    description: z.string().optional(),
    config: numericConfigSchema,
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('categorical'),
    description: z.string().optional(),
    config: categoricalConfigSchema,
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('geo'),
    description: z.string().optional(),
    config: geoConfigSchema.default({}),
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('composite'),
    description: z.string().optional(),
    config: compositeConfigSchema,
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('session'),
    description: z.string().optional(),
    config: sessionConfigSchema.default({}),
  }),
  z.object({
    id: customIdSchema,
    kind: z.literal('event'),
    description: z.string().optional(),
    config: eventConfigSchema,
  }),
]);

const createAliasInputSchema = z.object({
  alias: aliasSchema,
  canonical_id: z.string().min(1),
});

const baseEntryFieldsSchema = z.object({
  id: z.string(),
  namespace: catalogueNamespaceSchema,
  version: z.number().int(),
  description: z.string().nullable(),
  deprecated: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const catalogueEntryResponseSchema = z.discriminatedUnion('kind', [
  baseEntryFieldsSchema.extend({ kind: z.literal('numeric'), config: numericConfigSchema }),
  baseEntryFieldsSchema.extend({ kind: z.literal('categorical'), config: categoricalConfigSchema }),
  baseEntryFieldsSchema.extend({ kind: z.literal('geo'), config: geoConfigSchema }),
  baseEntryFieldsSchema.extend({ kind: z.literal('composite'), config: compositeConfigSchema }),
  baseEntryFieldsSchema.extend({ kind: z.literal('session'), config: sessionConfigSchema }),
  baseEntryFieldsSchema.extend({ kind: z.literal('event'), config: eventConfigSchema }),
]);

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

export type {
  CatalogueAliasResponse,
  CatalogueEntryResponse,
  CategoricalConfig,
  CompositeComponent,
  CompositeConfig,
  CreateAliasInput,
  CreateCustomEntryInput,
  EventConfig,
  GeoConfig,
  NumericConfig,
  Range,
  SessionConfig,
};
export {
  catalogueAliasResponseSchema,
  catalogueEntryResponseSchema,
  catalogueKindSchema,
  catalogueNamespaceSchema,
  createAliasInputSchema,
  createCustomEntrySchema,
};
