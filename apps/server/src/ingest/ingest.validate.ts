import type { CatalogueEntry } from '../catalogue/catalogue.ts';
import type { RejectionReason } from '../database/database.types.ts';

import type { AnnotationItem, EventItem, SampleItem, SessionItem } from './ingest.schemas.ts';

type ValidationOk = { ok: true };
type ValidationFail = { ok: false; reason: RejectionReason; detail?: string };
type ValidationResult = ValidationOk | ValidationFail;

const fail = (reason: RejectionReason, detail?: string): ValidationFail => ({ ok: false, reason, detail });

const validateTimestamps = (start: string, end: string): ValidationResult => {
  if (Date.parse(end) < Date.parse(start)) {
    return fail('invalid_timestamp', 'end is before start');
  }
  return { ok: true };
};

const validateNumericValue = (value: Record<string, unknown>, entry: CatalogueEntry): ValidationResult => {
  if (typeof value['value'] !== 'number' || !Number.isFinite(value['value'])) {
    return fail('schema_mismatch', 'numeric value requires { value: number }');
  }
  if (entry.unit && typeof value['unit'] === 'string' && value['unit'] !== entry.unit) {
    return fail('schema_mismatch', `unit "${value['unit']}" does not match catalogue unit "${entry.unit}"`);
  }
  const range = (entry.shape as { range?: { min: number; max: number } }).range;
  if (range && (value['value'] < range.min || value['value'] > range.max)) {
    return fail('out_of_range', `value ${value['value']} outside [${range.min}, ${range.max}]`);
  }
  return { ok: true };
};

const validateCategoricalValue = (value: Record<string, unknown>, entry: CatalogueEntry): ValidationResult => {
  if (typeof value['value'] !== 'string') {
    return fail('schema_mismatch', 'categorical value requires { value: string }');
  }
  const allowed = (entry.shape as { values?: string[] }).values ?? [];
  if (!allowed.includes(value['value'])) {
    return fail('schema_mismatch', `value "${value['value']}" not in allowed set [${allowed.join(', ')}]`);
  }
  return { ok: true };
};

const validateGeoValue = (value: Record<string, unknown>): ValidationResult => {
  const lat = value['lat'];
  const lng = value['lng'];
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    return fail('schema_mismatch', 'geo value requires { lat: number in [-90, 90] }');
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    return fail('schema_mismatch', 'geo value requires { lng: number in [-180, 180] }');
  }
  if (value['altitude'] !== undefined && typeof value['altitude'] !== 'number') {
    return fail('schema_mismatch', 'altitude must be a number when present');
  }
  if (value['accuracy'] !== undefined && typeof value['accuracy'] !== 'number') {
    return fail('schema_mismatch', 'accuracy must be a number when present');
  }
  return { ok: true };
};

const validateCompositeValue = (value: Record<string, unknown>, entry: CatalogueEntry): ValidationResult => {
  const components = (entry.shape as { components?: Record<string, string> }).components ?? {};
  const values = value['values'];
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    return fail('schema_mismatch', 'composite value requires { values: Record<string, number> }');
  }
  const valuesObj = values as Record<string, unknown>;
  for (const componentName of Object.keys(components)) {
    const componentValue = valuesObj[componentName];
    if (typeof componentValue !== 'number' || !Number.isFinite(componentValue)) {
      return fail('schema_mismatch', `composite component "${componentName}" must be a number`);
    }
  }
  return { ok: true };
};

const validateSampleValue = (item: SampleItem, entry: CatalogueEntry): ValidationResult => {
  switch (entry.kind) {
    case 'numeric':
      return validateNumericValue(item.value, entry);
    case 'categorical':
      return validateCategoricalValue(item.value, entry);
    case 'geo':
      return validateGeoValue(item.value);
    case 'composite':
      return validateCompositeValue(item.value, entry);
    case 'session':
    case 'event':
      return fail('invalid_value_kind', `metric "${entry.id}" is not a sample metric (kind=${entry.kind})`);
  }
};

const validateSample = (item: SampleItem, entry: CatalogueEntry | null): ValidationResult => {
  if (!entry) {
    return fail('unknown_metric', `metric "${item.metric}" not found in catalogue`);
  }
  if (entry.deprecated) {
    return fail('catalogue_deprecated', `metric "${entry.id}" is deprecated`);
  }
  const ts = validateTimestamps(item.start, item.end);
  if (!ts.ok) {
    return ts;
  }
  return validateSampleValue(item, entry);
};

const validateSession = (item: SessionItem, entry: CatalogueEntry | null): ValidationResult => {
  if (!entry) {
    return fail('unknown_metric', `session_type "${item.session_type}" not found in catalogue`);
  }
  if (entry.kind !== 'session') {
    return fail('invalid_value_kind', `"${entry.id}" is not a session type (kind=${entry.kind})`);
  }
  if (entry.deprecated) {
    return fail('catalogue_deprecated', `session_type "${entry.id}" is deprecated`);
  }
  return validateTimestamps(item.start, item.end);
};

const validateEvent = (item: EventItem, entry: CatalogueEntry | null): ValidationResult => {
  if (!entry) {
    return fail('unknown_metric', `metric "${item.metric}" not found in catalogue`);
  }
  if (entry.kind !== 'event') {
    return fail('invalid_value_kind', `"${entry.id}" is not an event metric (kind=${entry.kind})`);
  }
  if (entry.deprecated) {
    return fail('catalogue_deprecated', `metric "${entry.id}" is deprecated`);
  }
  return { ok: true };
};

// Annotations are free-form context; nothing to look up in the catalogue,
// just timestamp ordering to enforce.
const validateAnnotation = (item: AnnotationItem): ValidationResult => validateTimestamps(item.start, item.end);

export type { ValidationResult };
export { validateAnnotation, validateEvent, validateSample, validateSession };
