# Changes from upstream

Base: Nagi-ovo/voyager commit `2e6e1d49` on 2026-09-01.

- Repositioned the product around pre-send privacy protection instead of prompt
  libraries, conversation organization, or usage analytics.
- Added local detection and redaction for PII, payment-card candidates, private
  keys, credentials, common API keys, tokens, and IP addresses.
- Added a paste guard for large clipboard payloads and credential-shaped text.
- Added per-provider fresh-chat timers backed by MV3 alarms.
- Added a category-only local audit trail and JSON export.
- Added a server-verified licence path that shape-checks keys and grants only on
  `valid: true`; the Supabase publishable key is mandatory at build.
- Replaced the extension popup/options surface, CSS/DOM/storage namespace, icons,
  manifest permissions, content entry, and background entry for product and fleet
  differentiation.
- Retired tests that only asserted removed upstream popup sections, broad optional
  host permissions, page-world observers, changelog assets, or hosted badge copy;
  the remaining upstream suite and dedicated privacy tests continue to run.
- Retained the upstream GPL-3.0 licence, notices, build foundation, React/Vite
  structure, and proven composer insertion utility.
