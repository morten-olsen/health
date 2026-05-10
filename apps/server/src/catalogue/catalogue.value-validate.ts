import type { RejectionReason } from '../database/database.types.ts';

import type { CategoricalConfig, CompositeConfig, NumericConfig, Range } from './catalogue.schemas.ts';

type ValidationOk = { ok: true };
type ValidationFail = { ok: false; reason: RejectionReason; detail?: string };
type ValidationResult = ValidationOk | ValidationFail;

const fail = (reason: RejectionReason, detail?: string): ValidationFail => ({ ok: false, reason, detail });

const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

const inRange = (n: number, range: Range | undefined): boolean =>
  range === undefined || (n >= range.min && n <= range.max);

const validateNumeric = (value: unknown, config: NumericConfig): ValidationResult => {
  if (!isFiniteNumber(value)) {
    return fail('schema_mismatch', `numeric value must be a finite number (got ${typeof value})`);
  }
  if (!inRange(value, config.range)) {
    return fail('out_of_range', `value ${value} outside [${config.range?.min}, ${config.range?.max}]`);
  }
  return { ok: true };
};

const validateCategorical = (value: unknown, config: CategoricalConfig): ValidationResult => {
  if (typeof value !== 'string') {
    return fail('schema_mismatch', `categorical value must be a string (got ${typeof value})`);
  }
  if (!config.values.includes(value)) {
    return fail('schema_mismatch', `value "${value}" not in allowed set [${config.values.join(', ')}]`);
  }
  return { ok: true };
};

const isLatLng = (n: unknown, max: number): n is number => isFiniteNumber(n) && n >= -max && n <= max;

const validateGeo = (value: unknown): ValidationResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('schema_mismatch', 'geo value must be an object');
  }
  const v = value as Record<string, unknown>;
  if (!isLatLng(v['lat'], 90)) {
    return fail('out_of_range', `lat must be a finite number in [-90, 90] (got ${String(v['lat'])})`);
  }
  if (!isLatLng(v['lng'], 180)) {
    return fail('out_of_range', `lng must be a finite number in [-180, 180] (got ${String(v['lng'])})`);
  }
  if (v['altitude'] !== undefined && !isFiniteNumber(v['altitude'])) {
    return fail('schema_mismatch', 'altitude must be a finite number when present');
  }
  if (v['accuracy'] !== undefined && !isFiniteNumber(v['accuracy'])) {
    return fail('schema_mismatch', 'accuracy must be a finite number when present');
  }
  return { ok: true };
};

const validateComposite = (value: unknown, config: CompositeConfig): ValidationResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('schema_mismatch', 'composite value must be an object of components');
  }
  const v = value as Record<string, unknown>;
  for (const [name, component] of Object.entries(config.components)) {
    const componentValue = v[name];
    if (!isFiniteNumber(componentValue)) {
      return fail('missing_field', `composite component "${name}" must be a finite number`);
    }
    if (!inRange(componentValue, component.range)) {
      return fail(
        'out_of_range',
        `component "${name}" value ${componentValue} outside [${component.range?.min}, ${component.range?.max}]`,
      );
    }
  }
  return { ok: true };
};

export type { ValidationResult };
export { fail, validateCategorical, validateComposite, validateGeo, validateNumeric };
