# Security notes

- Server credentials are environment-only and absent from source. `.env`, keystores and local databases are ignored.
- JWT verification validates signature, issuer, audience, expiry and subject. User identity comes from the token, never from a client-provided owner field.
- Every cloud record read, write and deletion is scoped by the verified subject.
- API endpoints use fixed upstream YouTube and dictionary hosts. Translation endpoint is an administrator-controlled HTTPS URL; browsers cannot choose it.
- Translation budgets reserve characters atomically before provider calls. Failed calls consume allowance to avoid billing loops. No transcript is translated automatically.
- YouTube requests reserve a shared daily quota in SQL and reuse public responses for five minutes. Favorite/history/bookmark metadata is removed after 30 days; user-authored learning data is retained until deleted.
- SRT/VTT text strips markup and React renders it as text. Uploads require a rights confirmation and size/cue limits.
- Guest data uses device-local storage. A signed-in library is separate. Shared devices should clear app data when appropriate. Browser sessions use Supabase's normal session storage; CSP and dependency hygiene are important to protect against XSS.
- Android requires Internet only, disables cleartext traffic and system backup, and preserves YouTube playback controls. Recording is currently web-only and remains in memory, with a 60-second cap.
- CI has read-only repository access except the tag-release job, which needs contents write.

Release gates: dependency audits, secret scan, cross-user isolation tests, migration tests, live auth/API verification, real-device validation, production TLS/CORS and operational rate-limit checks. A clean dependency audit is not a penetration test.

Known operational limitations: in-memory rate limiting is single-process by default; production needs ingress limits and a shared limiter for scaling. External account deletion and local database deletion cannot be one atomic transaction; operational reconciliation is required if the database commit fails after the identity provider deletes the account. Complete UI localization and native recording are not yet implemented.

## Official integration references

- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/terms/required-minimum-functionality
- https://developers.google.com/youtube/v3/docs/search/list
- https://developers.google.com/youtube/v3/docs/captions/download
- https://capacitorjs.com/docs/android

The iframe API does not provide a supported quality-forcing mechanism. A video's advertised maximum resolution does not establish actual device playback resolution.
