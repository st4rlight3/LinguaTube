# Delivery gates

- [x] P0 React mobile shell and Android lifecycle/fullscreen implementation
- [x] P0 Official YouTube discovery API, channels and playlists implemented
- [x] P0 Android debug APK compiled and signature/package verified
- [x] P1 Authorized offline SRT/VTT parsing, timed transcript UI and translation adapter
- [x] P1 Vocabulary review, bookmarks, watch history and resume position
- [x] P1 Supabase auth and owner-scoped SQL persistence implemented and unit-tested
- [x] P2 Responsive PWA and English/Vietnamese core navigation
- [x] Pytest, Vitest, Playwright and dependency/secret checks
- [x] Repository created under st4rlight3; source pushed and remote SHA verified
- [x] Repository made public after source and author-metadata checks
- [x] Verify corrected GitHub Actions Android build
- [x] Verify tag-release automation
- [x] Verify public HTTPS web companion deployment
- [ ] Provision backend/database/auth and configure YouTube/translation credentials securely
- [ ] Live YouTube search, player, account and translation integration verification
- [ ] Physical Android installation/playback/fullscreen/back/resume/quality validation
- [ ] Finish full interface localization (navigation/home are bilingual; some learning/settings text remains English)
- [ ] Optional licensed CEFR data, creator-caption authorization and authorized speech-to-text provider

v0.1.0-alpha.1 is published with its APK: tagged Actions test, Android and release jobs all passed. Public HTTPS frontend and guest save/review/export flows passed. Next: complete localization, provision live services with securely supplied credentials, then test physical Android. Do not mark the product production-complete while these gates remain open.
