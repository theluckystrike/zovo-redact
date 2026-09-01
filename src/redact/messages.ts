import type { AuditEntry, ProviderId } from './types';

export const REDACT_MESSAGE = {
  audit: 'zr2.audit.append',
  schedule: 'zr2.ephemeral.schedule',
  clear: 'zr2.ephemeral.clear',
  verifyLicence: 'zr2.licence.verify',
} as const;

export type RedactRuntimeMessage =
  | { type: typeof REDACT_MESSAGE.audit; entry: AuditEntry }
  | { type: typeof REDACT_MESSAGE.schedule; provider: ProviderId; delayMinutes: number }
  | { type: typeof REDACT_MESSAGE.clear; provider: ProviderId }
  | { type: typeof REDACT_MESSAGE.verifyLicence; key: string };
