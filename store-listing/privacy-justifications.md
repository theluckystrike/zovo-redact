# Privacy and permission justifications

## Single purpose

Zovo Redact detects and redacts secrets and personal data in supported AI chat
composers before submission, warns on risky pastes, opens a fresh chat after a
user-set timer, and records category-only audit metadata locally.

## `storage`

Stores user protection toggles, per-provider timer settings, a server-verified
licence cache, pending timer metadata, and the local category-only audit trail.
Prompt text and detected values are not stored.

## `alarms`

Runs the user-configured fresh-chat timer even when the extension popup is closed
and periodically refreshes an already verified licence.

## Host access

Access to Gemini, Google AI Studio, ChatGPT, Claude, and Grok is required to read
and update the visible prompt composer, intercept the local paste/send gesture,
show the privacy decision panel, and open a fresh chat when its timer expires.

Access to `zgubxqomnbmxgbdhvwja.supabase.co` is used only when a user enters an
optional licence key and for periodic re-verification of that key. The request
contains the licence key and product identifier, not prompt or audit data.

## Remote code

No remote code is loaded or executed. All detection and UI code ships inside the
MV3 package. The licence endpoint returns data only.

## Data use declarations

- Personally identifiable information: not collected; locally detected values
  are not stored or transmitted by the extension.
- Authentication information: an optional licence key is transmitted to the
  licence verification endpoint solely to unlock paid controls.
- Website content: prompt text is processed ephemerally on-device and is not
  collected.
- User activity: category-only audit metadata stays in local extension storage
  until the user exports or clears it.

Privacy policy URL: https://zovo.one/privacy-policy
