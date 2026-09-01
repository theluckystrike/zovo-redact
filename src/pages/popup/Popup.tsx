import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { REDACT_MESSAGE } from '@/redact/messages';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  clearAudit,
  loadAudit,
  loadSettings,
  loadVerifiedLicence,
  saveSettings,
} from '@/redact/storage';
import { type AuditEntry, PROVIDERS, type ProviderId, type RedactSettings } from '@/redact/types';

type ViewId = 'guard' | 'timers' | 'audit';

interface PopupProps {
  surface?: 'popup' | 'options';
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: 'Gemini',
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  grok: 'Grok',
};

const TIMER_OPTIONS = [
  { value: 0, label: 'Off', paid: false },
  { value: 15, label: '15 minutes', paid: false },
  { value: 60, label: '1 hour', paid: true },
  { value: 480, label: '8 hours', paid: true },
  { value: 1440, label: '24 hours', paid: true },
] as const;

function openExternal(url: string): void {
  void chrome.tabs.create({ url });
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="zr2-console-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <button
        type="button"
        className="zr2-console-switch"
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
        data-on={checked ? 'true' : 'false'}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function EmptyAudit() {
  return (
    <div className="zr2-console-empty">
      <div aria-hidden="true">✓</div>
      <strong>No sensitive sends yet</strong>
      <span>Only category names appear here. Prompt text is never stored.</span>
    </div>
  );
}

export default function Popup({ surface = 'popup' }: PopupProps) {
  const [view, setView] = useState<ViewId>('guard');
  const [settings, setSettings] = useState<RedactSettings>(DEFAULT_SETTINGS);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [paid, setPaid] = useState(false);
  const [licenceKey, setLicenceKey] = useState('');
  const [licenceStatus, setLicenceStatus] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(async () => {
    const [nextSettings, nextAudit, licence] = await Promise.all([
      loadSettings(),
      loadAudit(),
      loadVerifiedLicence(),
    ]);
    setSettings(nextSettings);
    setAudit(nextAudit);
    setPaid(licence?.valid === true);
  }, []);

  useEffect(() => {
    void refresh();
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (
        areaName === 'local' &&
        (changes[STORAGE_KEYS.audit] ||
          changes[STORAGE_KEYS.settings] ||
          changes[STORAGE_KEYS.licence])
      ) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const blockedCount = useMemo(
    () => audit.filter((entry) => entry.action === 'sent' && entry.redacted).length,
    [audit],
  );

  const updateSettings = (next: RedactSettings) => {
    setSettings(next);
    void saveSettings(next);
  };

  const setTimer = (provider: ProviderId, value: number) => {
    const option = TIMER_OPTIONS.find((item) => item.value === value);
    if (option?.paid && !paid) {
      setLicenceStatus('Longer timers are included with Pro.');
      return;
    }
    updateSettings({ ...settings, timers: { ...settings.timers, [provider]: value } });
  };

  const verifyLicence = async () => {
    setLicenceStatus('Checking…');
    const result = (await chrome.runtime.sendMessage({
      type: REDACT_MESSAGE.verifyLicence,
      key: licenceKey,
    })) as { ok: boolean; error?: string };
    if (result.ok) {
      setPaid(true);
      setLicenceStatus('Licence verified. Pro controls are unlocked.');
      setLicenceKey('');
    } else {
      setLicenceStatus(result.error ?? 'Licence check failed.');
    }
  };

  const exportAudit = () => {
    const entries = paid ? audit : audit.slice(0, 20);
    const payload = {
      product: 'Zovo Redact',
      exportedAt: new Date().toISOString(),
      privacy: 'Category metadata only. No prompt text or detected values are stored.',
      entries,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `redact-audit-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const removeAudit = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearAudit();
    setConfirmClear(false);
  };

  return (
    <main className="zr2-console-shell" data-surface={surface}>
      <header className="zr2-console-header">
        <div className="zr2-console-brand">
          <img src="/icon-32.png" alt="" />
          <div>
            <strong>Zovo Redact</strong>
            <span>Pre-send privacy guard</span>
          </div>
        </div>
        <span className="zr2-console-local">Local only</span>
      </header>

      <output className="zr2-console-hero" aria-live="polite">
        <strong>{blockedCount}</strong>
        <span>risky sends redacted</span>
        <p>Secrets and personal data are checked in the composer before they leave the page.</p>
      </output>

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- WAI-ARIA requires a tablist container. */}
      <nav className="zr2-console-tabs" role="tablist" aria-label="Privacy controls">
        {(['guard', 'timers', 'audit'] as ViewId[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            className={view === item ? 'is-active' : ''}
            onClick={() => setView(item)}
          >
            {item === 'guard' ? 'Guard' : item === 'timers' ? 'Timers' : `Audit ${audit.length}`}
          </button>
        ))}
      </nav>

      <div className="zr2-console-body">
        {view === 'guard' && (
          <>
            <section className="zr2-console-card">
              <div className="zr2-console-section-label">Protection</div>
              <Toggle
                checked={settings.guardEnabled}
                label="Pre-send scan"
                description="Pause sensitive sends and offer one-click redaction."
                onChange={(guardEnabled) => updateSettings({ ...settings, guardEnabled })}
              />
              <Toggle
                checked={settings.pasteGuardEnabled}
                label="Paste guard"
                description="Warn on large pastes and credential-shaped clipboard text."
                onChange={(pasteGuardEnabled) => updateSettings({ ...settings, pasteGuardEnabled })}
              />
            </section>

            <section className="zr2-console-card zr2-console-licence">
              <div className="zr2-console-section-label">{paid ? 'Pro active' : 'Licence'}</div>
              {paid ? (
                <p>Full audit export and longer per-provider timers are unlocked.</p>
              ) : (
                <>
                  <p>
                    Free protection stays on. Pro adds the complete audit history and longer timers.
                  </p>
                  <div className="zr2-console-licence-row">
                    <input
                      value={licenceKey}
                      onChange={(event) => setLicenceKey(event.target.value)}
                      placeholder="ZOVO-XXXX-XXXX-XXXX-XXXX"
                      aria-label="Licence key"
                      spellCheck={false}
                    />
                    <button type="button" onClick={() => void verifyLicence()}>
                      Verify
                    </button>
                  </div>
                </>
              )}
              {licenceStatus && <small role="status">{licenceStatus}</small>}
            </section>
          </>
        )}

        {view === 'timers' && (
          <section className="zr2-console-card">
            <div className="zr2-console-section-label">Ephemeral tab timers</div>
            <p className="zr2-console-note">
              Opens a fresh chat after the timer. Provider-side retention rules still apply.
            </p>
            <div className="zr2-console-timer-list">
              {PROVIDERS.map((provider) => (
                <label key={provider}>
                  <span>{PROVIDER_LABELS[provider]}</span>
                  <select
                    value={settings.timers[provider]}
                    onChange={(event) => setTimer(provider, Number(event.target.value))}
                    aria-label={`${PROVIDER_LABELS[provider]} auto-clear timer`}
                  >
                    {TIMER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.paid && !paid ? ' · Pro' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        )}

        {view === 'audit' && (
          <section className="zr2-console-card">
            <div className="zr2-console-audit-head">
              <div>
                <div className="zr2-console-section-label">Local audit trail</div>
                <p>Category metadata only. Never the matching values.</p>
              </div>
              <button type="button" onClick={exportAudit} disabled={audit.length === 0}>
                Export
              </button>
            </div>
            {audit.length === 0 ? (
              <EmptyAudit />
            ) : (
              <ol className="zr2-console-audit-list">
                {audit.slice(0, surface === 'options' ? 50 : 7).map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{PROVIDER_LABELS[entry.provider]}</strong>
                      <span>{formatTimestamp(entry.at)}</span>
                    </div>
                    <p>
                      {entry.action === 'timer-cleared'
                        ? 'Fresh chat opened by timer'
                        : entry.redacted
                          ? 'Sensitive values redacted before send'
                          : entry.detectedCategories.length
                            ? 'Sensitive categories sent by user choice'
                            : 'No sensitive category detected'}
                    </p>
                    {entry.detectedCategories.length > 0 && (
                      <div className="zr2-console-pills">
                        {entry.detectedCategories.map((category) => (
                          <span key={category}>{category.replace('-', ' ')}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {audit.length > 0 && (
              <button
                type="button"
                className="zr2-console-clear"
                onClick={() => void removeAudit()}
              >
                {confirmClear ? 'Confirm clear audit' : 'Clear audit'}
              </button>
            )}
          </section>
        )}
      </div>

      {!paid && (
        <button
          type="button"
          className="zr2-console-upgrade"
          onClick={() =>
            openExternal(
              `https://zovo.one/pricing?utm_source=zovo-redact-v2&utm_medium=extension&utm_campaign=upgrade&utm_content=${surface}`,
            )
          }
        >
          <strong>Get Zovo Pro</strong>
          <span>Full history · longer timers</span>
        </button>
      )}

      <footer className="zr2-console-footer">
        <button
          type="button"
          onClick={() => openExternal('https://github.com/theluckystrike/zovo-redact')}
        >
          GPL-3.0 source
        </button>
        <span>Runs on this device</span>
      </footer>
    </main>
  );
}
