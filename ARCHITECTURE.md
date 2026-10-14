# LinguaTube architecture

Android is the primary client: Capacitor 8 packages a touch-first React/TypeScript app with official YouTube iframe playback. Vite and Tailwind build the shared PWA. Native app events handle back navigation and background playback suspension. No extracted streams, quality overrides, or scraped captions.

FastAPI mediates YouTube Data API v3, dictionary lookups, translation and user persistence. Supabase Auth verifies identity using its JWKS; SQLAlchemy/PostgreSQL stores owner-scoped learning records and uploaded transcripts. Alembic owns schema migrations. SQLite is available for isolated development and tests only.

Credentials stay on the server. Translation has per-user daily character budgets. Transcripts come from user-uploaded SRT/VTT with a rights confirmation. No claim of arbitrary YouTube caption access. English/Vietnamese display and sentence looping use original timestamps.

Production requires configured HTTPS backend, PostgreSQL, Supabase, YouTube API key and optionally a translation provider. An unconfigured build reports missing services honestly. Android build validation and physical device playback validation are separate gates.
