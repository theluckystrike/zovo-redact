# Zovo Redact design QA

Required capture command:

```sh
HEADLESS=1 node 7-design/capture.mjs /Users/mike/zovo-work/zovo-redact-v2/dist_chrome --slug zovo-redact-v2
```

The command was run from the local pipeline mirror with Chrome for Testing 152.0.7977.64. Six iterative rounds were inspected at original resolution in both light and dark mode.

## Iteration record

| Round      | Finding                                                                                     | Result                                                  |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| r1         | Popup pricing/footer below the initial fold; options shell left-aligned                     | Failed; layout corrected                                |
| r2         | Fold and alignment fixed; dark gold CTA text did not render reliably in the captured pixels | Failed; explicit CTA text styling added                 |
| r3         | CTA paint remained unreliable under emulated dark mode                                      | Failed; dark-specific gold surface and white text added |
| r4         | Popup and options are complete, centered, legible, and consistent in both schemes           | Passed                                                  |
| r5-final   | Final formatted/built source reproduced the passing light/dark pixels                       | Passed; accepted baseline                               |
| r6-release | Release bytes after the privacy-edge audit reproduced the passing pixels                    | Passed; accepted release                                |

## Final critique

- Hierarchy: **9.5/10** — one privacy outcome hero, one primary upgrade action, and clearly subordinate settings.
- Composition: **9.4/10** — 8px-derived spacing, restrained cards, centered options shell, and no popup overflow.
- Typography: **9.3/10** — three practical type scales with clear labels and compact supporting copy.
- Color and contrast: **9.4/10** — purple is reserved for protection/actions; gold is reserved for Pro; dark CTA paint is explicit and readable.
- Product distinctiveness: **9.6/10** — bespoke shield/redaction artwork and the `zr2-console-*` visual namespace make the extension recognizably different from the fleet.
- Accessibility: **9.3/10** — visible focus rings, semantic tabs, labelled switches and selects, reduced-motion handling, and usable light/dark schemes.

**Final score: 9.4/10 — PASS.**

Accepted artifacts:

- `7-design/shots/zovo-redact-v2/r6-release/popup.light.png`
- `7-design/shots/zovo-redact-v2/r6-release/popup.dark.png`
- `7-design/shots/zovo-redact-v2/r6-release/options.light.png`
- `7-design/shots/zovo-redact-v2/r6-release/options.dark.png`
