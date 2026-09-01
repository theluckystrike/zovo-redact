import { isVerifiedLicence } from './licence-core';
import type { AuditEntry, RedactSettings, VerifiedLicence } from './types';

export const STORAGE_KEYS = {
  audit: 'zr2.audit.v1',
  settings: 'zr2.settings.v1',
  licence: 'zr2.licence.v1',
  schedules: 'zr2.ephemeral.v1',
} as const;

export const DEFAULT_SETTINGS: RedactSettings = {
  guardEnabled: true,
  pasteGuardEnabled: true,
  timers: { gemini: 0, chatgpt: 0, claude: 0, grok: 0 },
};

export async function loadSettings(): Promise<RedactSettings> {
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  const value = stored[STORAGE_KEYS.settings] as Partial<RedactSettings> | undefined;
  return {
    guardEnabled: value?.guardEnabled !== false,
    pasteGuardEnabled: value?.pasteGuardEnabled !== false,
    timers: { ...DEFAULT_SETTINGS.timers, ...(value?.timers ?? {}) },
  };
}

export async function saveSettings(settings: RedactSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export async function loadAudit(): Promise<AuditEntry[]> {
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.audit]: [] });
  return Array.isArray(stored[STORAGE_KEYS.audit])
    ? (stored[STORAGE_KEYS.audit] as AuditEntry[])
    : [];
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const entries = await loadAudit();
  entries.unshift(entry);
  await chrome.storage.local.set({ [STORAGE_KEYS.audit]: entries.slice(0, 500) });
}

export async function clearAudit(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.audit]: [] });
}

export async function loadVerifiedLicence(): Promise<VerifiedLicence | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.licence);
  const value: unknown = stored[STORAGE_KEYS.licence];
  return isVerifiedLicence(value) ? value : null;
}
