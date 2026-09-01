import { isLicenceShape, isValidLicenceResponse, normalizeLicenceKey } from '@/redact/licence-core';
import { REDACT_MESSAGE, type RedactRuntimeMessage } from '@/redact/messages';
import { STORAGE_KEYS, appendAudit, loadVerifiedLicence } from '@/redact/storage';
import type { ProviderId, VerifiedLicence } from '@/redact/types';

declare const __SUPABASE_ANON_KEY__: string;

const LICENCE_URL =
  'https://zgubxqomnbmxgbdhvwja.supabase.co/functions/v1/verify-extension-license';
const PRODUCT_ID = ['zovo', 'redact', 'v2'].join('-');
const VERIFY_ALARM = 'zr2.licence.reverify';
const VERIFY_INTERVAL_MINUTES = 12 * 60;

interface EphemeralSchedule {
  tabId: number;
  provider: ProviderId;
  clearAt: number;
}

function ephemeralAlarmName(tabId: number): string {
  return `zr2.ephemeral.${tabId}`;
}

async function saveSchedule(schedule: EphemeralSchedule): Promise<void> {
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.schedules]: {} });
  const schedules = (stored[STORAGE_KEYS.schedules] ?? {}) as Record<string, EphemeralSchedule>;
  schedules[String(schedule.tabId)] = schedule;
  await chrome.storage.local.set({ [STORAGE_KEYS.schedules]: schedules });
}

async function removeSchedule(tabId: number): Promise<void> {
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.schedules]: {} });
  const schedules = (stored[STORAGE_KEYS.schedules] ?? {}) as Record<string, EphemeralSchedule>;
  delete schedules[String(tabId)];
  await chrome.storage.local.set({ [STORAGE_KEYS.schedules]: schedules });
}

async function verifyLicence(value: string): Promise<VerifiedLicence> {
  const key = normalizeLicenceKey(value);
  if (!isLicenceShape(key)) throw new Error('Use four groups of four letters or numbers.');
  const publicKey = __SUPABASE_ANON_KEY__.trim();
  if (!publicKey) throw new Error('Licence service is missing its build key.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(LICENCE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: publicKey,
        authorization: `Bearer ${publicKey}`,
      },
      body: JSON.stringify({ license_key: key, extension: PRODUCT_ID }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Licence service did not accept the request.');
    const payload: unknown = await response.json();
    if (!isValidLicenceResponse(payload)) {
      await chrome.storage.local.remove(STORAGE_KEYS.licence);
      throw new Error('That licence is not valid.');
    }
    const verified: VerifiedLicence = { key, valid: true, verifiedAt: Date.now() };
    await chrome.storage.local.set({ [STORAGE_KEYS.licence]: verified });
    return verified;
  } finally {
    clearTimeout(timer);
  }
}

async function scheduleClear(
  provider: ProviderId,
  delayMinutes: number,
  tabId: number,
): Promise<void> {
  if (!Number.isFinite(delayMinutes) || delayMinutes <= 0) return;
  const clearAt = Date.now() + delayMinutes * 60_000;
  await chrome.alarms.create(ephemeralAlarmName(tabId), { when: clearAt });
  await saveSchedule({ provider, tabId, clearAt });
}

async function handleEphemeralAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  const match = /^zr2\.ephemeral\.(\d+)$/.exec(alarm.name);
  if (!match) return;
  const tabId = Number(match[1]);
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.schedules]: {} });
  const schedules = (stored[STORAGE_KEYS.schedules] ?? {}) as Record<string, EphemeralSchedule>;
  const schedule = schedules[String(tabId)];
  if (!schedule) return;
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: REDACT_MESSAGE.clear,
      provider: schedule.provider,
    } satisfies RedactRuntimeMessage);
    await appendAudit({
      id: crypto.randomUUID(),
      at: Date.now(),
      provider: schedule.provider,
      action: 'timer-cleared',
      detectedCategories: [],
      sentCategories: [],
      redacted: false,
      pasteWarning: false,
    });
  } catch {
    // The tab may have closed. Removing the schedule still prevents stale retries.
  } finally {
    await removeSchedule(tabId);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.alarms.create(VERIFY_ALARM, { periodInMinutes: VERIFY_INTERVAL_MINUTES });
  if (details.reason === 'install') {
    void chrome.tabs.create({
      url: chrome.runtime.getURL('src/pages/options/index.html?welcome=1'),
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === VERIFY_ALARM) {
    void loadVerifiedLicence().then((licence) => {
      if (licence) void verifyLicence(licence.key).catch(() => undefined);
    });
    return;
  }
  void handleEphemeralAlarm(alarm);
});

chrome.runtime.onMessage.addListener(
  (message: RedactRuntimeMessage, sender, sendResponse): true | undefined => {
    if (message.type === REDACT_MESSAGE.audit) {
      void appendAudit(message.entry).then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message.type === REDACT_MESSAGE.schedule) {
      const tabId = sender.tab?.id;
      if (typeof tabId !== 'number') {
        sendResponse({ ok: false });
        return undefined;
      }
      void scheduleClear(message.provider, message.delayMinutes, tabId).then(() =>
        sendResponse({ ok: true }),
      );
      return true;
    }
    if (message.type === REDACT_MESSAGE.verifyLicence) {
      void verifyLicence(message.key)
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Check failed.',
          }),
        );
      return true;
    }
    return undefined;
  },
);
