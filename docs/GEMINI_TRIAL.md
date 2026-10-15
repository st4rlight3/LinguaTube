# Private bilingual-generation experiment — 2026-10-15

Public LinguaTube still has **one** automatically available publisher-captioned video. The following experiment is not public coverage and must not be marketed as a completed feature.

The user explicitly approved Gemini terms, free-tier data processing and a private experiment, confirmed age 18+, and excluded billing/public deployment. The official Google Gemini API was enabled on the existing project. Billing was verified false. No stream or restricted YouTube caption extraction was used. The temporary Gemini key was revoked after verification; the production YouTube key was not changed.

Input: official NASA video `WeA7edXsU40`, We Are NASA, linked to NASA's [publisher resource/transcript](https://science.nasa.gov/resource/we-are-nasa/), used under NASA's [educational/informational media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/), subject to its restrictions. This video is not in LinguaTube's shipped transcript catalog. Private trial output is not checked into Git or added to the public catalog.

Observed requests:

- The model listing advertised Gemini 2.5 Flash, but generation returned 404: unavailable to new users, directing clients to 3.8 Flash/Interactions.
- Gemini 3.8 Flash via the official Interactions API returned 503/high demand.
- Gemini 3.5 Flash Lite returned HTTP 200 in about 11 seconds, generating 31 EN–VI timed segments (14,852 total tokens reported). This was generated from the supplied video URL, without importing the publisher transcript.
- The separately tested adapter returned 28 segments with `status=needs_review`. Even with an explicit prompt to retain archival/background speech, three of four selected publisher-transcript phrase checks were absent. A phrase-presence check is not a word-error-rate metric or a timing certification.

Conclusion: official URL-based generation works on this eligible input, but full speech coverage and sentence timing have **not** passed. Do not silently label generated output as YouTube captions, complete transcription, or approved bilingual subtitles. Do not add it to the public catalog to inflate coverage.

`backend/ai_transcripts.py` is a standalone private-trial adapter only. It rejects invalid IDs, missing rights/provenance, unsupported models, malformed/unordered/nonfinite times and missing/oversized language text. It keeps credentials in a header, requests `store=false`, does not expose provider raw errors, does not substitute fabricated subtitles on failure, and always marks output for review. Fourteen deterministic tests cover this contract; production `app.py` does not import or expose this adapter.

Before any public integration: establish eligible-content rights and the product's age/region policy; evaluate short-window transcription and independent alignment against publisher timing on multiple videos; add authenticated/budgeted jobs, cancellation, durable bounded storage and explicit consent/source/AI labels. Paid resources or wider public AI deployment require separate authorization. Universal YouTube coverage is not established by this trial.
