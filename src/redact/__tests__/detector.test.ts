import { describe, expect, it } from 'vitest';

import { detectSensitiveText, redactSensitiveText, uniqueCategories } from '../detector';

describe('local sensitive-data detector', () => {
  it('detects secrets and PII without sending text anywhere', () => {
    const text = 'Email mike@example.com and use sk-proj-abcdefghijklmnopqrstuvwxyz123456.';
    const findings = detectSensitiveText(text);

    expect(uniqueCategories(findings)).toEqual(['email', 'api-key']);
    expect(redactSensitiveText(text, findings)).toBe(
      'Email [REDACTED EMAIL] and use [REDACTED API KEY].',
    );
  });

  it('requires payment-card candidates to pass the Luhn check', () => {
    expect(uniqueCategories(detectSensitiveText('Card 4111 1111 1111 1111'))).toContain(
      'financial',
    );
    expect(uniqueCategories(detectSensitiveText('Counter 4111 1111 1111 1112'))).not.toContain(
      'financial',
    );
  });

  it('detects credential assignments and private keys', () => {
    const findings = detectSensitiveText(
      'password=hunter-9921\n-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
    );
    expect(uniqueCategories(findings)).toEqual(['credential', 'private-key']);
  });

  it('does not treat short ordinary numbers as phone numbers', () => {
    expect(detectSensitiveText('Version 1.8.2 finished in 4000 ms')).toEqual([]);
  });
});
