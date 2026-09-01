import type { VerifiedLicence } from './types';

export const LICENCE_SHAPE = /^ZOVO-(?:[A-Z0-9]{4}-){3}[A-Z0-9]{4}$/;

export function normalizeLicenceKey(value: string): string {
  return value.trim().toUpperCase();
}

export function isLicenceShape(value: string): boolean {
  return LICENCE_SHAPE.test(normalizeLicenceKey(value));
}

export function isValidLicenceResponse(value: unknown): value is { valid: true } {
  return Boolean(
    value && typeof value === 'object' && (value as { valid?: unknown }).valid === true,
  );
}

export function isVerifiedLicence(value: unknown): value is VerifiedLicence {
  if (!value || typeof value !== 'object') return false;
  const licence = value as Partial<VerifiedLicence>;
  return (
    licence.valid === true &&
    typeof licence.key === 'string' &&
    isLicenceShape(licence.key) &&
    typeof licence.verifiedAt === 'number'
  );
}
