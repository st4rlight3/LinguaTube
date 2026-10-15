# LinguaTube

Android-first English–Vietnamese learning with official YouTube playback and authorized transcripts.

**Status: testing build, not a production-complete service.** The local Android APK and frontend build have compiled. Live YouTube search, account sync and translation require service configuration. No fake production results or transcripts are included.

Try the [public web companion](https://st4rlight3.github.io/LinguaTube/) or get an Android testing APK from [Releases](https://github.com/st4rlight3/LinguaTube/releases). The web companion supports guest/local learning; online discovery, accounts and translation are not configured. Testing APKs are debug-signed, not store-ready, and CI debug signing keys can differ between builds (an update may require uninstalling, which erases local data).

## Included

- React 19, TypeScript, Vite, Tailwind; responsive mobile navigation, dark appearance and English/Vietnamese core navigation.
- Capacitor Android project targeting SDK 36, minimum Android 7, custom app icon and splash.
- Official YouTube search for videos/channels/playlists with paging, duration filter, popular education discovery, local search history, channel upload browsing and playlist navigation.
- Official iframe playback, native fullscreen landscape and Android Back handling, playback speed, seek and repeat. YouTube controls, ads and branding remain intact. Resolution is never forced or claimed.
- Permission-confirmed SRT/VTT imports, bilingual timed text, sentence seeking, repeat range, bookmarks, font size and transcript search.
- Configurable LibreTranslate-compatible translation with an atomic daily character allowance. API secrets stay on the backend.
- Dictionary lookup with available IPA/parts of speech/examples, optional Vietnamese definition translation, vocabulary collection and spaced review.
- Guest persistence on device; Supabase sign-in/registration/reset, isolated cloud records, favorites, watch history, profile and account deletion routes.
- Pytest, Vitest, Playwright and Android CI with APK artifacts and tagged prereleases.

## Development

Node 24, Python 3.12, Java 21 (24 was used successfully locally), Android SDK 36.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

Backend (from `backend/`):

```sh
python -m venv .venv
# Activate the virtual environment for your shell.
pip install -r requirements.txt
# Copy .env.example to .env and set the service values.
alembic upgrade head
uvicorn app:app --host 127.0.0.1 --port 8000
pytest -q
```

Android:

```sh
npm run android:sync
cd android
./gradlew assembleDebug
```

On Windows use `gradlew.bat`. Set `ANDROID_HOME` to the SDK and `JAVA_HOME` to the JDK. The generated APK is `android/app/build/outputs/apk/debug/app-debug.apk`.

## Live services

Set frontend `VITE_API_URL`, `VITE_SUPABASE_URL`, and the browser-safe `VITE_SUPABASE_ANON_KEY` before building. Never put service-role, translation or YouTube keys in a `VITE_*` variable. Guest testing builds can set an HTTPS backend URL in Profile; a compiled URL takes precedence.

Backend settings are documented in `backend/.env.example`. Production uses PostgreSQL, Supabase asymmetric signing keys (ES256/RS256), an HTTPS frontend, and an explicit CORS allowlist including `https://com.st4rlight3.linguatube` for Android. Account deletion requires the server-only Supabase service role. The app does not scrape YouTube captions or extract streams.

See [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md), [TEST_REPORT.md](TEST_REPORT.md), and [TASKS.md](TASKS.md) for verified status and outstanding work.
