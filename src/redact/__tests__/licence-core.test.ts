import { describe, expect, it } from 'vitest';

import {
  isLicenceShape,
  isValidLicenceResponse,
  isVerifiedLicence,
  normalizeLicenceKey,
} from '../licence-core';

describe('licence contract', () => {
  it('shape-checks four groups without any client-side entitlement shortcut', () => {
    expect(normalizeLicenceKey(' zovo-ab12-cd34-ef56-gh78 ')).toBe('ZOVO-AB12-CD34-EF56-GH78');
    expect(isLicenceShape('ZOVO-AB12-CD34-EF56-GH78')).toBe(true);
    expect(isLicenceShape('ZOVO-DEMO-KEY')).toBe(false);
  });

  it('grants only on valid true and ignores tier labels', () => {
    expect(isValidLicenceResponse({ valid: true, tier: 'free' })).toBe(true);
    expect(isValidLicenceResponse({ valid: false, tier: 'pro' })).toBe(false);
    expect(isValidLicenceResponse({ tier: 'pro' })).toBe(false);
  });

  it('accepts only a server-verified cache shape', () => {
    expect(
      isVerifiedLicence({
        key: 'ZOVO-AB12-CD34-EF56-GH78',
        valid: true,
        verifiedAt: 123,
      }),
    ).toBe(true);
    expect(
      isVerifiedLicence({
        key: 'ZOVO-AB12-CD34-EF56-GH78',
        valid: false,
        verifiedAt: 123,
      }),
    ).toBe(false);
  });
});
