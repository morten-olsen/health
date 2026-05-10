import type { CatalogueEntry, ValidationResult } from '../catalogue/catalogue.ts';
import { fail, isSampleEntry, validateEventPayloadAgainstEntry, validateSampleValue } from '../catalogue/catalogue.ts';

import type { AnnotationItem, EventItem, SampleItem, SessionItem } from './ingest.schemas.ts';

const validateTimestamps = (start: string, end: string): ValidationResult => {
  if (Date.parse(end) < Date.parse(start)) {
    return fail('invalid_timestamp', 'end is before start');
  }
  return { ok: true };
};

const validateSample = (item: SampleItem, entry: CatalogueEntry | null): ValidationResult => {
  if (!entry) {
    return fail('unknown_metric', `metric "${item.metric}" not found in catalogue`);
  }
  if (entry.deprecated) {
    return fail('catalogue_deprecated', `metric "${entry.id}" is deprecated`);
  }
  if (!isSampleEntry(entry)) {
    return fail('invalid_value_kind', `metric "${entry.id}" is not a sample metric (kind=${entry.kind})`);
  }
  const ts = validateTimestamps(item.start, item.end);
  if (!ts.ok) {
    return ts;
  }
  return validateSampleValue(entry, item.value);
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
  return validateEventPayloadAgainstEntry(entry, item.payload);
};

const validateAnnotation = (item: AnnotationItem): ValidationResult => validateTimestamps(item.start, item.end);

export type { ValidationResult };
export { validateAnnotation, validateEvent, validateSample, validateSession };
