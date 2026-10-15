# Deployment and signing

## Current status

Source repository: https://github.com/st4rlight3/LinguaTube (public).
Public frontend: https://st4rlight3.github.io/LinguaTube/ (deployment and browser rendering verified).
Discovery backend: https://linguatube-api-w751.onrender.com . Official YouTube API search and metadata are verified live. The key is server-only, limited to YouTube Data API and Render Singapore outbound ranges. No Google Cloud billing is enabled. Render uses a free single instance that can sleep. Initial SQLite budget storage is ephemeral; persistent PostgreSQL, authentication and translation are not provisioned, and cloud accounts remain disabled. Guest records stay on device. Do not enable cloud accounts against ephemeral storage.

## Backend

The included Dockerfile serves FastAPI on `$PORT` (8000 default), applies Alembic migrations, and runs as a non-root user. For a production rollout, move migrations to the provider's single pre-deploy job before scaling to multiple replicas. Use a managed PostgreSQL database and TLS connection; do not use SQLite in multi-worker production.

Provide environment variables through hosting secrets: `DATABASE_URL`, `YOUTUBE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TRANSLATION_URL`, `TRANSLATION_API_KEY`, `CORS_ORIGINS`. `SUPABASE_SERVICE_ROLE_KEY` is used only for account deletion. Restrict the YouTube key to Data API v3 and to server egress IPs where available. Set quotas and provider billing alerts. A shared rate-limit store is necessary for multiple processes; configure `RATE_LIMIT_STORAGE_URI` with a supported Redis service and install its client.

Use `/health` for uptime probes and `/config` for non-sensitive capability discovery. Set ingress body-size limits (1 MB), request timeouts, TLS, redacted logs and trusted proxy configuration. API keys and Authorization headers must not enter logs. Access logs should follow a documented retention policy.

## Authentication

Create a Supabase tenant with email confirmation, password-reset redirects to the deployed HTTPS app, and ES256 or RS256 JWT signing. Legacy shared-secret HS256 tokens are deliberately not accepted. Enable an appropriate password policy and abuse controls. Browser anonymous/public keys are safe to compile into the client; service-role keys are never safe to compile. Backend records are not accessed directly from the Supabase browser client. If exposed through a Supabase schema, enable RLS and deny direct anonymous access.

## Frontend and Android

Build with the same production `VITE_API_URL` for web and Android. Host `dist/` on an HTTPS static host with SPA routing and an appropriate CSP. Supabase URLs and public anonymous key must also be set at build time. GitHub Actions uses repository variables with these exact names. Never add server keys to repository variables or the client build.

Native origin: `https://com.st4rlight3.linguatube`. It matches the package identifier and provides the app identity recommended by YouTube for embedded WebViews. No stream manipulation or quality forcing is performed. Keep Android System WebView updated.

## Release signing

Testing artifacts use Android debug signing. They are not Play Store releases. Release build configuration reads `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` from the process environment. Keep the keystore outside Git and back it up securely; keep passwords in Actions Secrets. For Play distribution, use Play App Signing and a dedicated upload key. Never use the debug signing identity as a production release identity.

Tagging `v*` runs tests, compiles the APK, uploads it, then creates a GitHub prerelease with the debug APK. A missing configuration still produces an honest testing build, not a fully provisioned service. Verify Actions completion and the release attachment before announcing availability. Different CI debug keys can require uninstalling an earlier testing build, which clears local guest data. Profile offers Export guest data (JSON); verify that a usable file is saved before uninstalling. Native WebView download behavior still requires device testing, and an import/restore interface is not included.

## Costs

No paid resources have been purchased. Provider free tiers and quotas must be verified at provisioning time. YouTube search consumes quota, database/auth services may have storage or inactivity limits, backend hosts may sleep, and translation may charge per character. These limits vary by provider and plan. Do not enable billing or a paid plan without explicit approval.
