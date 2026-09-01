# Release gate evidence

## Build and test

- Unmodified upstream Chrome build: PASS at `2e6e1d49` before fork changes.
- Production Chrome build: PASS, 41 transformed modules.
- Missing `SUPABASE_ANON_KEY`: correctly fails before Vite runs.
- Dedicated privacy tests: 9/9 PASS.
- Applicable full suite: 3,045/3,045 PASS across 303 files on Node 22.23.2.
- TypeScript: PASS.
- Prettier: PASS.
- ESLint: PASS with zero errors and no warnings in the new Zovo Redact files.
- Upstream regression-note validation: PASS, 58 entries across seven topics.

Tests whose only purpose was to assert retired upstream popup sections, broad
permissions/page-world observers, changelog assets, or hosted badge copy are
explicitly excluded in `vitest.config.ts` and documented in `CHANGES.md`.

## Runtime

Chrome for Testing 152.0.7977.64 loaded both the unmodified upstream build and
the final MV3 package. The final extension registered its service worker and
rendered its popup/options pages. Live content-script checks verified:

- scan control injection;
- email and API-key detection;
- **Redact draft** replacement;
- credential paste warning and **Redact & paste**;
- pre-send interception and **Redact & send**;
- category-only audit persistence without matched values;
- settings persistence through `chrome.storage.local`.

## Policy and divergence

Current phase-6 compliance scanner:

```text
COMPLIANCE: CLEAN — 0 violations.
```

Current standard fleet divergence scanner:

```json
{ "BLOCK": [], "WARN": [], "FIX": [], "ready": true }
```

The batch-1 Cockpit directory is lowercase and is not discovered by the
standard `Zovo-*` fleet glob. It was therefore scanned explicitly from its
public GPL source repository. The scanner compared 19 CSS/JS fingerprints and
four icons, skipped no files, found no collisions, and returned `ready: true`.

Icon SHA-256 values are distinct:

```text
Zovo Redact:      e55bafe19851b34e6a147d078ba746a58938647d17bc676114d59768db0be11b
Zovo AI Cockpit:  81d8c0fcecd0b3cb0e67a5b9796ab2496c21b6cfe67ec33ccc25503edbdd4907
```

The package uses the unique `zr2-*` asset, DOM, CSS, and storage namespaces.

## Store assets

- Five visually inspected real-UI screenshots: 1280×800 JPEG, each under 2 MB.
- Small promo tile: 440×280 JPEG.
- Marquee promo tile: 1400×560 JPEG.
- Store icon: original 128×128 PNG with alpha.
