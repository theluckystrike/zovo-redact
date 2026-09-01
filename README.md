# Zovo Redact

Zovo Redact is a local pre-send privacy guard for Gemini, ChatGPT, Claude, Grok,
and Google AI Studio. It scans the active composer for common secrets and
personal data, offers one-click redaction before submit, warns on risky clipboard
pastes, opens a fresh conversation after an optional timer, and keeps an
exportable category-only audit trail.

The detector runs entirely in the browser. Audit entries contain provider,
timestamp, action, and category names; prompt text and matched values are never
stored.

## Build

Requirements: Bun 1.3.12 or newer, Node 20.19+ or 22.12+, and the public
Supabase publishable key in `SUPABASE_ANON_KEY`.

```bash
bun install
SUPABASE_ANON_KEY=sb_publishable_your_public_key bun run build:chrome
```

The production unpacked extension is written to `dist_chrome/`. The build fails
before bundling when the publishable key is missing or malformed. Never use a
Supabase service-role key.

## Privacy controls

- Local regex and heuristic detection for email addresses, phone numbers,
  payment card candidates, IP addresses, private keys, credential assignments,
  common API-key shapes, GitHub tokens, and JSON web tokens.
- A capture-phase pre-send guard with **Redact & send**, **Send once**, and
  **Cancel** choices.
- Paste guard for credential-shaped strings and clipboard text of 4,000 or more
  characters.
- Per-provider timers that navigate the current tab to a fresh chat. This does
  not change the provider's own retention policy or delete provider-side history.
- A local audit log that records category metadata only and exports as JSON.

## Licensing and GPL

The optional paid controls accept only keys shaped like
`ZOVO-XXXX-XXXX-XXXX-XXXX` and grant access only after the server returns
`valid: true`. Client code does not use a tier label as proof of access.

This entire fork is GPL-3.0. You may inspect, modify, and rebuild it, including
removing or changing the optional paid controls. The paid offering is a service
and convenience layer, not a restriction on the freedoms granted by the GPL.

## Upstream and changes

This project is a modified fork of
[Nagi-ovo/voyager](https://github.com/Nagi-ovo/voyager), retained under GPL-3.0.
The original copyright, `LICENSE`, and `THIRD_PARTY_NOTICES.md` remain in the
repository. The complete modification summary is in [CHANGES.md](./CHANGES.md).

Modified source: https://github.com/theluckystrike/zovo-redact
