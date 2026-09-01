export const PROVIDERS = ['gemini', 'chatgpt', 'claude', 'grok'] as const;

export type ProviderId = (typeof PROVIDERS)[number];

export type FindingCategory =
  | 'api-key'
  | 'credential'
  | 'email'
  | 'financial'
  | 'ip-address'
  | 'phone'
  | 'private-key'
  | 'token';

export interface DetectionFinding {
  category: FindingCategory;
  label: string;
  start: number;
  end: number;
  confidence: 'high' | 'medium';
}

export interface AuditEntry {
  id: string;
  at: number;
  provider: ProviderId;
  action: 'sent' | 'timer-cleared';
  detectedCategories: FindingCategory[];
  sentCategories: FindingCategory[];
  redacted: boolean;
  pasteWarning: boolean;
}

export interface RedactSettings {
  guardEnabled: boolean;
  pasteGuardEnabled: boolean;
  timers: Record<ProviderId, number>;
}

export interface VerifiedLicence {
  key: string;
  valid: true;
  verifiedAt: number;
}
