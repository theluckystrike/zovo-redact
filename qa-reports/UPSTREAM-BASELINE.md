# Unmodified upstream baseline

- Source: fresh clone of `https://github.com/Nagi-ovo/voyager.git`
- Commit: `2e6e1d49` (`fix(folder): stabilize conversation identity and native deletion`)
- Baseline worktree: `/Users/mike/zovo-work/Nagi-ovo__voyager-fresh`
- Manifest: `manifest_version: 3` before any fork changes
- Install: `BUN_INSTALL_CACHE_DIR=/Users/mike/zovo-work/.bun-cache bun install`
- Build: `bun run build:chrome`
- Build result: PASS, 6,380 modules transformed, production output in
  `dist_chrome/`, Vite completed in 9.98 seconds
- Build note: Node 20.17 emitted Vite's Node-version warning; the build itself
  completed successfully. The fork documents Node 20.19+ or 22.12+.
- Runtime browser: Google Chrome for Testing 152.0.7977.64, isolated profile,
  unpacked output loaded with `--load-extension`
- Runtime extension ID: `iifacdnjakkhjjiengaffnegbndgingi`
- Runtime evidence: MV3 service worker target
  `service-worker-loader.js` registered; popup reached `readyState=complete`,
  title `Popup`, rendered 138,368 bytes of HTML, and exposed the full upstream
  settings UI beginning with its product header, storage health, cloud sync,
  context sync, and timeline controls.

The unmodified upstream therefore built and ran as an MV3 Chrome extension before
the `zovo-redact-v2` branch was created.
