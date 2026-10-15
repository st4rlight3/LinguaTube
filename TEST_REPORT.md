# Test report — 2026-10-15

## 0.2.0 redesign checkpoint (latest)

Private Gemini follow-up: 14 additional adapter tests passed, bringing the current local backend suite to **31**. Two real Flash Lite requests generated EN–VI output for a second video, but omitted speech; output remains unapproved and private. See [trial findings](docs/GEMINI_TRIAL.md). The public service does not expose AI generation. The earlier GitHub [test/Android run](https://github.com/st4rlight3/LinguaTube/actions/runs/38701473037) and Pages deployment for `a55e3d8` succeeded. Render deployed `a55e3d8`; live config and the explicit missing-authorized-source response passed.

Production build, 9 frontend unit tests, 17 backend tests and 30 browser cases passed across desktop/Android-size/iPhone-size Chromium. Tests distinguish missing source permission from provider errors, verify retry and assert that the player does not cover the English subtitle line. Real HTTPS search returned official YouTube results with statistics/duration. The APK installed on an Android 16 / API 36 x86_64 emulator; actual search and official WebView playback advanced beyond 3 seconds. Automatic publisher captions loaded 32 cues without file import; seeking to 33.25s advanced real playback and displayed the matching English/Vietnamese sentence. Vietnamese-only mode and 22px text passed. This is native-emulator evidence, not physical-device or resolution verification.

Native upgrade migration verified: old PWA controller/registration/precache were removed, new APK UI loaded, and the existing guest history count remained 1. No app data reset was performed. Android bundles no longer register a PWA worker.

Fullscreen entered landscape, but the initial Back test was too weak and is withdrawn: Android System UI became unresponsive at its first-use immersive prompt. The test now requires DOM fullscreen exit and portrait restoration. Fullscreen/Back is pending a clean retest, not a reported pass.

**Product coverage remains unfulfilled:** one publisher sample only. General captions require a broader authorized source. No new prerelease is published as a completed bilingual product.

The automated anonymous desktop headless playback probe did not pass (buffering/unstarted); it is not represented as success. Native emulator playback and signed-in browser verification are separate observations.

Older 0.1.0 results below are historical and do not supersede this checkpoint.

## Verified locally

| Check | Result | Scope |
|---|---|---|
| TypeScript / Vite production build | Passed | Actual build |
| Vitest | 8 passed | Cue timing, offline SRT/VTT parsing and review scheduling |
| Pytest | 13 passed | Persistence/isolation, parsing, limits, cache/quota, RSA token signature/claims, mocked provider contracts |
| Playwright | 15 passed | Desktop, Pixel 7-size and iPhone 13-size Chromium; transcript seek/highlight and dictionary-to-vocabulary flow |
| Alembic upgrade | Passed | Local SQLite, not live PostgreSQL |
| Android assembleDebug | Passed | SDK 36, Java 24, Gradle 8.14.3 |
| APK signature/package | Passed | APK v2 signing; com.st4rlight3.linguatube, 0.1.0; min SDK 24, target 36 |
| Backend local HTTP health | Passed | Running Uvicorn returned status ok |
| npm audit | No known vulnerabilities | Installed dependency tree |
| pip-audit | No known vulnerabilities | Installed upgraded environment |
| Initial Git push | Verified | Local and remote SHA matched |

External YouTube and translation calls in automated tests use deterministic mocks. Mocked player behavior is not evidence that YouTube media plays. iPhone viewport tests use Chromium and are not Safari device certification.

Tagged release execution passed: [38686459277](https://github.com/st4rlight3/LinguaTube/actions/runs/38686459277), all test/Android/release jobs succeeded; [v0.1.0-alpha.1](https://github.com/st4rlight3/LinguaTube/releases/tag/v0.1.0-alpha.1) is published with an APK. The downloaded release APK verified with v2 signing, package com.st4rlight3.linguatube, version 0.1.0, min SDK 24 and target 36. Its SHA-256 matches GitHub's asset digest: `115bed7bfe0c29fcd60cf2de94bef675ad626d25689f75c5227ef94ba4018c1d`.

## Historical 0.1.0 pending list (see current checkpoint above)

- Live PostgreSQL migrations, Supabase login/reset/delete, and cross-device sync.
- Live YouTube Data API search, channel and playlist browsing with a configured key.
- Physical Android installation, launch, actual embedded video playback, quality menu availability, fullscreen, rotation, system Back and background/resume.
- Authorized transcript timing against a real playing video and live translation billing limits.
- Public backend health and security configuration. Public frontend HTTP 200 and mobile rendering were verified separately.

No Android device was attached at the time of the check. Actual playback resolution (360p through 4K) is unverified. The application imposes no resolution cap and never extracts streams.

First remote Actions run: test job passed; Android failed during SDK setup requesting a retired package named `tools`. The workflow now specifies supported packages explicitly. Remote rerun [38685934682](https://github.com/st4rlight3/LinguaTube/actions/runs/38685934682) passed both test and Android jobs. Pages deployment also passed. An actual HTTPS browser check of https://st4rlight3.github.io/LinguaTube/ returned HTTP 200, rendered the React home screen at 412px width without horizontal overflow, and reported no uncaught page errors. This is frontend verification only, not live-service verification.

## Real-device checklist

Public guest-flow browser check also passed: add vocabulary, reload and recover the saved word, complete a flashcard review, download the guest JSON export, and verify that the exported record contains the saved word. This exercised the actual deployed frontend without provider mocks. It does not validate Android WebView downloads.

Install the final testing APK on a modern Android phone; connect to the configured HTTPS backend; search in-app; open known 1080p and 1440p source videos; inspect the official quality menu if offered; record the difference between source resolution and actual observed playback. Enter/exit fullscreen and rotate; press Back; background and resume; import an authorized transcript; verify seek/highlight/repeat and word saving. Test Wi-Fi and mobile data. Record device model, Android/WebView versions and any error codes without inferring an unobservable resolution.
