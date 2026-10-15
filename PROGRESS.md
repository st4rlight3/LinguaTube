# Progress

2026-10-14: Android-first app and FastAPI backend implemented. Frontend production build passed. Native Android debug build passed with native fullscreen/landscape handling, custom icon and splash, SDK 36 target, Android 7+ minimum. Five frontend unit tests, nine backend tests, and twelve browser tests passed. SQLite migration passed. NPM and installed Python dependency audits report no known vulnerabilities after updates.

Private repository created through authenticated GitHub browser as st4rlight3. Initial commit 5bddc59 was pushed using existing Git Credential Manager; remote SHA verified. Additional GitHub CLI authorization was cancelled because it was unnecessary.

No Android device attached. No YouTube API key, Supabase project, production database or translation credentials available in the task environment. Do not claim live search, live auth, provider translation, physical-device playback or actual HD/QHD resolution were verified.

2026-10-15: APK v2 signature, package ID, version 0.1.0, min SDK 24 and target SDK 36 verified. Source is public. The first remote test job passed, but Android setup failed because the setup action requested the retired `tools` SDK package; corrected to explicitly install platform-tools, API 36 and build-tools 36. Added offline transcript parsing, partial translation checkpoints, watch resume, app-ID WebView origin, PNG PWA icons, bounded request ingestion, shared daily YouTube quota reservation and five-minute response cache. Cached video metadata expires after 30 days. Latest local results: 8 frontend unit tests, 13 backend tests (including actual RSA JWT verification), 15 browser tests. FastAPI live local health probe returned OK; online capabilities remain unconfigured.

2026-10-15 release checkpoint: corrected main CI passed. Tagged run 38686459277 passed tests, Android packaging and release publication. v0.1.0-alpha.1 is a public prerelease with app-debug.apk. GitHub Pages is live; actual browser checks verified home rendering, mobile layout, guest vocabulary persistence/review and JSON export content. Vietnamese quick-start instructions added. No paid services provisioned.

Next: finish remaining localization; configure live credentials and hosting via secure provider settings, rebuild production APK, and run the device checklist. Never infer device playback quality from an APK build or mocked player.
