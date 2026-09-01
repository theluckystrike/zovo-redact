import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('privacy feature wiring', () => {
  it('wires the dedicated content and background entries into MV3', () => {
    const manifest = JSON.parse(readFileSync(resolve('manifest.json'), 'utf8')) as {
      manifest_version: number;
      background: { service_worker: string };
      content_scripts: Array<{ js: string[]; matches: string[] }>;
    };
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background.service_worker).toContain('redactBackground');
    expect(manifest.content_scripts[0].js).toContain('src/pages/redactContent/index.ts');
    expect(manifest.content_scripts[0].matches).toEqual(
      expect.arrayContaining(['https://chatgpt.com/*', 'https://claude.ai/*']),
    );
  });

  it('keeps new DOM and storage identifiers in the product namespace', () => {
    const content = readFileSync(resolve('src/pages/redactContent/index.ts'), 'utf8');
    const storage = readFileSync(resolve('src/redact/storage.ts'), 'utf8');
    expect(content).toContain('zr2-guard-');
    expect(storage).toContain('zr2.audit.v1');
    expect(storage).not.toContain('zovo_');
  });
});
