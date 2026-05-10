import type { ErrorObject, ValidateFunction } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsCjs from 'ajv-formats';

import type { RejectionReason } from '../database/database.types.ts';

import { fail } from './catalogue.value-validate.ts';
import type { ValidationResult } from './catalogue.value-validate.ts';

// ajv-formats is CJS — under nodenext the default import gives the whole
// module.exports; the function lives on `.default`.
const addFormats = addFormatsCjs.default;

const makeAjv = (): Ajv2020 => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv;
};

// Two instances: one for meta-validating user-submitted event schemas at
// registration, one for validating event payloads at ingest. Separation
// keeps registration-time failures from interfering with the payload-path
// compile cache.
const META_AJV = makeAjv();
const PAYLOAD_AJV = makeAjv();

const ALLOWED_FORMATS: ReadonlySet<string> = new Set([
  'date',
  'date-time',
  'time',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'uuid',
  'regex',
]);
const MAX_SCHEMA_DEPTH = 12;
const MAX_SCHEMA_BYTES = 32 * 1024;

class CatalogueSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogueSchemaError';
  }
}

const enforceSoftGuards = (schema: Record<string, unknown>): void => {
  const serialized = JSON.stringify(schema);
  if (serialized.length > MAX_SCHEMA_BYTES) {
    throw new CatalogueSchemaError(`Schema exceeds ${MAX_SCHEMA_BYTES}-byte cap (got ${serialized.length})`);
  }
  const visit = (node: unknown, depth: number): void => {
    if (depth > MAX_SCHEMA_DEPTH) {
      throw new CatalogueSchemaError(`Schema nesting deeper than ${MAX_SCHEMA_DEPTH} levels`);
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        visit(child, depth + 1);
      }
      return;
    }
    if (typeof node !== 'object' || node === null) {
      return;
    }
    const obj = node as Record<string, unknown>;
    const ref = obj['$ref'];
    if (typeof ref === 'string' && !ref.startsWith('#')) {
      throw new CatalogueSchemaError(`External $ref not allowed: "${ref}"`);
    }
    const fmt = obj['format'];
    if (typeof fmt === 'string' && !ALLOWED_FORMATS.has(fmt)) {
      throw new CatalogueSchemaError(`Disallowed format "${fmt}" — allowed: ${[...ALLOWED_FORMATS].sort().join(', ')}`);
    }
    for (const value of Object.values(obj)) {
      visit(value, depth + 1);
    }
  };
  visit(schema, 0);
};

const assertValidEventSchema = (schema: Record<string, unknown>): void => {
  enforceSoftGuards(schema);
  try {
    META_AJV.compile(schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new CatalogueSchemaError(`Invalid JSON Schema: ${message}`);
  }
};

const reasonForError = (err: ErrorObject): RejectionReason => {
  switch (err.keyword) {
    case 'minimum':
    case 'maximum':
    case 'exclusiveMinimum':
    case 'exclusiveMaximum':
      return 'out_of_range';
    case 'required':
      return 'missing_field';
    default:
      return 'schema_mismatch';
  }
};

const detailForError = (err: ErrorObject): string => {
  const path = err.instancePath || '/';
  const message = err.message ?? err.keyword;
  if (err.keyword === 'required') {
    const missing = (err.params as { missingProperty?: string }).missingProperty;
    return missing ? `${path}: missing required field "${missing}"` : `${path}: ${message}`;
  }
  return `${path}: ${message}`;
};

// Cache compiled validators so a 10k-item batch of one event metric does
// one Ajv compile, not 10k. Catalogue contract: schema is immutable for a
// given (entry.id, entry.version) — caller folds user_id into the key so
// per-user customs don't collide with canonical or each other.
const VALIDATOR_CACHE = new Map<string, ValidateFunction>();

const compileValidator = (cacheKey: string, schema: Record<string, unknown>): ValidateFunction | string => {
  const cached = VALIDATOR_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const compiled = PAYLOAD_AJV.compile(schema);
    VALIDATOR_CACHE.set(cacheKey, compiled);
    return compiled;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
};

const validateEventPayload = (cacheKey: string, schema: Record<string, unknown>, data: unknown): ValidationResult => {
  const compiled = compileValidator(cacheKey, schema);
  if (typeof compiled === 'string') {
    return fail('schema_mismatch', `schema compile failed: ${compiled}`);
  }
  if (compiled(data)) {
    return { ok: true };
  }
  const first = compiled.errors?.[0];
  if (!first) {
    return fail('schema_mismatch', 'validation failed without error detail');
  }
  return fail(reasonForError(first), detailForError(first));
};

export {
  ALLOWED_FORMATS,
  assertValidEventSchema,
  CatalogueSchemaError,
  MAX_SCHEMA_BYTES,
  MAX_SCHEMA_DEPTH,
  validateEventPayload,
};
