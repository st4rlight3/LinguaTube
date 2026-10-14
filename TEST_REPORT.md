# Test report — 2026-10-14

## Verified locally

| Check | Result | Scope |
|---|---|---|
| TypeScript / Vite production build | Passed | Actual build |
| Vitest | 5 passed | Cue timing and review scheduling |
| Pytest | 9 passed | SQLite persistence, isolation, parsing, validation, provider contracts |
| Playwright | 12 passed | Desktop, Pixel 7-size and iPhone 13-size Chromium layouts |
| Alembic upgrade | Passed | Local SQLite, not live PostgreSQL |
| Android assembleDebug | Passed | SDK 36, Java 24, Gradle 8.14.3 |
| npm audit | No known vulnerabilities | Installed dependency tree |
| pip-audit | No known vulnerabilities | Installed upgraded environment |
| Initial Git push | Verified | Local and remote SHA matched |

External YouTube and translation calls in automated tests use deterministic mocks. Mocked player behavior is not evidence that YouTube media plays. iPhone viewport tests use Chromium and are not Safari device certification.

## Pending verification

- APK signature/package inspection after final rebuild.
- GitHub Actions and tagged release execution.
- Live PostgreSQL migrations, Supabase login/reset/delete, and cross-device sync.
- Live YouTube Data API search, channel and playlist browsing with a configured key.
- Physical Android installation, launch, actual embedded video playback, quality menu availability, fullscreen, rotation, system Back and background/resume.
- Authorized transcript timing against a real playing video and live translation billing limits.
- Public HTTPS frontend/backend health and security configuration.

No Android device was attached at the time of the check. Actual playback resolution (360p through 4K) is unverified. The application imposes no resolution cap and never extracts streams.

## Real-device checklist

Install the final testing APK on a modern Android phone; connect to the configured HTTPS backend; search in-app; open known 1080p and 1440p source videos; inspect the official quality menu if offered; record the difference between source resolution and actual observed playback. Enter/exit fullscreen and rotate; press Back; background and resume; import an authorized transcript; verify seek/highlight/repeat and word saving. Test Wi-Fi and mobile data. Record device model, Android/WebView versions and any error codes without inferring an unobservable resolution.
