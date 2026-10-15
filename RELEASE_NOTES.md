# v0.1.0-alpha.1 — Android testing build

Android 7+ testing APK, debug-signed. Not a production-ready or Play Store release.

Includes the mobile learning interface, local vocabulary/review, authorized offline SRT/VTT import, official YouTube player integration and backend adapters. Automated tests passed (8 frontend, 13 backend, 15 browser), and the Android build passed locally and on GitHub Actions. Provider/player tests use mocks; a successful build does not demonstrate real playback.

Public frontend: https://st4rlight3.github.io/LinguaTube/

## Known limits

- YouTube discovery, Supabase accounts/cloud sync and translation require configured services; they are not live in this release.
- No physical Android playback, rotation, Back/resume or actual playback-resolution check has been completed.
- Full interface localization remains incomplete; core navigation/home support English and Vietnamese.
- Licensed CEFR data, creator-caption OAuth and speech-to-text are not provided.
- Debug keys may change between CI runs. Installing a different build can require uninstalling the prior app, which removes its local records. Do not rely on this alpha as the only copy of learning data.

Use only transcripts you have rights to import. The app does not download video, extract streams, scrape captions, force resolution or remove YouTube controls/branding.
