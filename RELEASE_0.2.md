# v0.2.0-alpha.1 — video platform and bilingual captions

Android 7+ testing build, version code 2. Debug-signed; not a Play Store release.

Home is now a real video feed. Search, channel uploads, public playlists, saved videos and history use the new video-first navigation. Official YouTube search is configured on the HTTPS backend. No catalog video fixtures ship in production.

Bilingual subtitles are the defining feature: choose **EN + VI** on Home, open a supported video and its authorized publisher captions load automatically in English and Vietnamese. Sentence seeking, current-cue highlighting, repeat, word lookup/IPA, language modes and subtitle size are supported. The initial automatic catalog contains **one** publisher-captioned video, Voices of MAVEN. Vietnamese is a credited LinguaTube AI-assisted translation. Other videos require an authorized source or user import; YouTube's built-in CC does not imply permission to obtain a companion transcript.

Verified: production build; 9 unit, 17 backend and 27 viewport browser cases; native Android API 36 emulator search and actual official video playback. Final automatic-caption/live-playback verification must be recorded before publishing this note with an APK.

Limits: actual 1080p/1440p resolution and physical-device behavior are not yet measured; quality is controlled by YouTube. No verified Shorts feed, YouTube subscription OAuth sync, cloud accounts or live translation provider. Related videos use title search. Free backend can sleep and currently stores only disposable request budgets in ephemeral SQLite; guest learning records remain local. Native YouTube fullscreen does not include the companion transcript panel.

Different CI debug signing keys can require uninstalling an older testing build, which removes local records. Export important guest data and verify the file before uninstalling.
