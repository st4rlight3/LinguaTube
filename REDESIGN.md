# Video platform redesign — 0.2.0 work in progress

The root experience is now video discovery, with Home, Shorts, Subscriptions, You and Search navigation. Home loads official public discovery rather than an education dashboard. No catalog fixtures are bundled with the application.

Search supports video/channel/playlist results, recent-query suggestions (not a YouTube autocomplete endpoint), duration and ordering. Video search batches videos.list for authoritative duration and view count, and filters items explicitly marked not embeddable. Channel pages show official metadata, upload playlists and public playlists. LinguaTube follows are device-local channel IDs, not YouTube account subscriptions.

The watch screen keeps the official iframe controls and native Android fullscreen implementation. A synchronized English/Vietnamese caption area sits below the player; the transcript has language modes, size controls, follow-current-sentence scrolling, seeking, repeat and dictionary lookup. Users can pair authorized English and Vietnamese SRT/VTT files with matching timestamps (0.5-second tolerance), independently of a translation provider.

## Verification and release gate

- Production frontend build passed.
- 24 browser cases passed across desktop/Android-size/iPhone-size Chromium; providers and iframe are mocked only in tests.
- 15 backend tests passed, including metadata enrichment, embedding restrictions and public channel playlists.
- Existing 8 unit tests passed before the latest presentation adjustments.
- Android version code is 2, version name 0.2.0; new APK build and real-service verification are still required.
- Google Cloud UI currently fails to fetch project data. A project-creation attempt is not evidence that the project exists, and no YouTube key has been obtained.
- Render free service preparation is in progress; account sync remains unconfigured.

Do not tag a finished redesign release or claim the backend issue resolved before the real HTTPS service, official search and actual video playback have been verified. Physical Android tests remain a separate gate.

## Supported-feature limits

- There is no verified Shorts discovery feed. Short-video search uses standard official playback and does not label results as Shorts.
- Subscription sync with YouTube is not connected; it requires separately authorized Google OAuth.
- More-to-watch results use title search, not YouTube personalized recommendations.
- The official player controls quality. No quality-forcing API or observed 1080p/1440p claim is provided.
- Authorized transcripts are not universally available. Paired subtitles do not overlay or modify YouTube's native fullscreen UI; the companion panel is outside the iframe.
- Full interface localization is still incomplete.
