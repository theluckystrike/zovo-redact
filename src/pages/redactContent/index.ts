import { findChatInput, insertTextIntoChatInput } from '@/pages/content/chatInput';
import { detectSensitiveText, redactSensitiveText, uniqueCategories } from '@/redact/detector';
import { REDACT_MESSAGE, type RedactRuntimeMessage } from '@/redact/messages';
import { loadSettings } from '@/redact/storage';
import type { AuditEntry, DetectionFinding, ProviderId, RedactSettings } from '@/redact/types';

import './redactGuard.css';

const LARGE_PASTE_THRESHOLD = 4_000;

const SEND_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[data-testid="composer-submit-button"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Submit" i]',
  'button[type="submit"]',
  'button.send-button',
].join(',');

let settings: RedactSettings | null = null;
let bypassUntil = 0;
let recentPasteWarning = false;
let activeDialog: HTMLElement | null = null;

function providerFromHost(hostname = location.hostname): ProviderId {
  if (hostname.includes('chatgpt.com')) return 'chatgpt';
  if (hostname.includes('claude.ai')) return 'claude';
  if (hostname.includes('grok.com')) return 'grok';
  return 'gemini';
}

function composerText(composer: HTMLElement): string {
  return composer instanceof HTMLTextAreaElement
    ? composer.value
    : (composer.innerText ?? composer.textContent ?? '');
}

function replaceComposerText(composer: HTMLElement, text: string): boolean {
  composer.focus();
  if (composer instanceof HTMLTextAreaElement) {
    composer.setSelectionRange(0, composer.value.length);
  } else {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  return insertTextIntoChatInput(text, composer);
}

function isComposerTarget(target: EventTarget | null, composer: HTMLElement): boolean {
  return target === composer || (target instanceof Node && composer.contains(target));
}

function associatedSendButton(composer: HTMLElement): HTMLElement | null {
  const containers = ['form', '[data-testid*="composer" i]', 'rich-textarea', '.text-input-field'];
  for (const selector of containers) {
    const container = composer.closest(selector);
    const button = container?.querySelector<HTMLElement>(SEND_SELECTORS);
    if (button) return button;
  }
  return document.querySelector<HTMLElement>(SEND_SELECTORS);
}

function createAudit(
  provider: ProviderId,
  findings: readonly DetectionFinding[],
  redacted: boolean,
): AuditEntry {
  const detectedCategories = uniqueCategories(findings);
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    provider,
    action: 'sent',
    detectedCategories,
    sentCategories: redacted ? [] : detectedCategories,
    redacted,
    pasteWarning: recentPasteWarning,
  };
}

function recordSend(findings: readonly DetectionFinding[], redacted: boolean): void {
  const provider = providerFromHost();
  const timer = settings?.timers[provider] ?? 0;
  if (findings.length > 0 || recentPasteWarning) {
    void chrome.runtime.sendMessage<RedactRuntimeMessage>({
      type: REDACT_MESSAGE.audit,
      entry: createAudit(provider, findings, redacted),
    });
  }
  if (timer > 0) {
    void chrome.runtime.sendMessage<RedactRuntimeMessage>({
      type: REDACT_MESSAGE.schedule,
      provider,
      delayMinutes: timer,
    });
  }
  recentPasteWarning = false;
}

function dismissDialog(): void {
  activeDialog?.remove();
  activeDialog = null;
}

function button(
  label: string,
  className: string,
  action: () => void,
  once = true,
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  element.addEventListener('click', action, { once });
  return element;
}

function showDecision(options: {
  eyebrow: string;
  title: string;
  body: string;
  findings: readonly DetectionFinding[];
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}): void {
  dismissDialog();
  const backdrop = document.createElement('div');
  backdrop.className = 'zr2-guard-backdrop';
  backdrop.setAttribute('role', 'presentation');

  const dialog = document.createElement('section');
  dialog.className = 'zr2-guard-dialog';
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'zr2-guard-title');

  const eyebrow = document.createElement('div');
  eyebrow.className = 'zr2-guard-eyebrow';
  eyebrow.textContent = options.eyebrow;

  const title = document.createElement('h2');
  title.id = 'zr2-guard-title';
  title.textContent = options.title;

  const body = document.createElement('p');
  body.textContent = options.body;

  const categories = document.createElement('div');
  categories.className = 'zr2-guard-categories';
  for (const category of uniqueCategories(options.findings)) {
    const pill = document.createElement('span');
    pill.textContent = category.replace('-', ' ');
    categories.appendChild(pill);
  }

  const actions = document.createElement('div');
  actions.className = 'zr2-guard-actions';
  actions.append(
    button(options.primaryLabel, 'zr2-guard-primary', () => {
      dismissDialog();
      options.onPrimary();
    }),
    button(options.secondaryLabel, 'zr2-guard-secondary', () => {
      dismissDialog();
      options.onSecondary();
    }),
    button('Cancel', 'zr2-guard-cancel', dismissDialog),
  );

  dialog.append(eyebrow, title, body, categories, actions);
  backdrop.appendChild(dialog);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) dismissDialog();
  });
  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismissDialog();
  });
  document.body.appendChild(backdrop);
  activeDialog = backdrop;
  dialog.querySelector<HTMLButtonElement>('button')?.focus();
}

function resumeSend(composer: HTMLElement): void {
  bypassUntil = Date.now() + 1_000;
  const send = associatedSendButton(composer);
  if (send) {
    send.click();
    return;
  }
  composer.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );
}

function interceptSend(event: Event, composer: HTMLElement): void {
  if (!settings?.guardEnabled) return;
  const text = composerText(composer).trim();
  if (!text) return;
  const findings = detectSensitiveText(text);
  if (Date.now() < bypassUntil) {
    bypassUntil = 0;
    return;
  }
  if (findings.length === 0) {
    recordSend([], false);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  showDecision({
    eyebrow: 'Pre-send privacy check',
    title: `${findings.length} sensitive ${findings.length === 1 ? 'item' : 'items'} found`,
    body: 'Values stay on this device. Only category names are added to your local audit log.',
    findings,
    primaryLabel: 'Redact & send',
    onPrimary: () => {
      replaceComposerText(composer, redactSensitiveText(text, findings));
      recordSend(findings, true);
      window.setTimeout(() => resumeSend(composer), 0);
    },
    secondaryLabel: 'Send once',
    onSecondary: () => {
      recordSend(findings, false);
      resumeSend(composer);
    },
  });
}

function handleClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target.closest(SEND_SELECTORS) : null;
  if (!target) return;
  const composer = findChatInput({ requireVisible: false });
  if (composer) interceptSend(event, composer);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  const composer = findChatInput({ requireVisible: false });
  if (composer && isComposerTarget(event.target, composer)) interceptSend(event, composer);
}

function handlePaste(event: ClipboardEvent): void {
  if (!settings?.pasteGuardEnabled) return;
  const composer = findChatInput({ requireVisible: false });
  if (!composer || !isComposerTarget(event.target, composer)) return;
  const text = event.clipboardData?.getData('text/plain') ?? '';
  const findings = detectSensitiveText(text);
  if (text.length < LARGE_PASTE_THRESHOLD && findings.length === 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showDecision({
    eyebrow: 'Paste guard',
    title: findings.length ? 'Credential-shaped text detected' : 'Large clipboard paste',
    body: `${text.length.toLocaleString()} characters are about to enter this chat. Review before pasting.`,
    findings,
    primaryLabel: findings.length ? 'Redact & paste' : 'Paste safely',
    onPrimary: () => {
      recentPasteWarning = true;
      insertTextIntoChatInput(redactSensitiveText(text, findings), composer);
    },
    secondaryLabel: 'Paste anyway',
    onSecondary: () => {
      recentPasteWarning = true;
      insertTextIntoChatInput(text, composer);
    },
  });
}

function mountScanControl(): void {
  if (document.querySelector('.zr2-guard-scan')) return;
  const control = button(
    'Scan draft',
    'zr2-guard-scan',
    () => {
      const composer = findChatInput({ requireVisible: false });
      if (!composer) return;
      const text = composerText(composer);
      const findings = detectSensitiveText(text);
      if (findings.length === 0) {
        control.textContent = 'Draft looks clean';
        window.setTimeout(() => (control.textContent = 'Scan draft'), 1_800);
        return;
      }
      showDecision({
        eyebrow: 'Local draft scan',
        title: `${findings.length} sensitive ${findings.length === 1 ? 'item' : 'items'} found`,
        body: 'Redaction replaces values in the composer without sending anything.',
        findings,
        primaryLabel: 'Redact draft',
        onPrimary: () => replaceComposerText(composer, redactSensitiveText(text, findings)),
        secondaryLabel: 'Keep draft',
        onSecondary: () => undefined,
      });
    },
    false,
  );
  control.setAttribute('aria-label', 'Scan the current draft for sensitive data');
  document.body.appendChild(control);
}

function newChatUrl(provider: ProviderId): string {
  const origin = location.origin;
  if (provider === 'claude') return `${origin}/new`;
  if (provider === 'gemini') return `${origin}/app`;
  const account = /^\/u\/[^/]+/.exec(location.pathname)?.[0] ?? '';
  return `${origin}${account}/`;
}

function clearConversation(provider: ProviderId): void {
  const composer = findChatInput({ requireVisible: false });
  if (composer) replaceComposerText(composer, '');
  const selectors: Record<ProviderId, string> = {
    chatgpt: 'a[data-testid="create-new-chat-button"], a[aria-label*="New chat" i]',
    claude: 'a[href="/new"], a[aria-label*="New chat" i]',
    gemini: 'a[href="/app"], a[aria-label*="New chat" i]',
    grok: 'a[href="/"], a[aria-label*="New chat" i]',
  };
  const nativeLink = document.querySelector<HTMLElement>(selectors[provider]);
  if (nativeLink) nativeLink.click();
  else location.replace(newChatUrl(provider));
}

function handleRuntimeMessage(message: RedactRuntimeMessage): true | undefined {
  if (message.type !== REDACT_MESSAGE.clear) return undefined;
  clearConversation(message.provider);
  return undefined;
}

async function start(): Promise<void> {
  settings = await loadSettings();
  if (!document.body) {
    await new Promise<void>((resolve) =>
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }),
    );
  }
  mountScanControl();
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('paste', handlePaste, true);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['zr2.settings.v1'])
      void loadSettings().then((next) => (settings = next));
  });
}

void start();
