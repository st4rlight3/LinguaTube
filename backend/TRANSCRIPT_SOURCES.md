# Publisher caption catalog

`transcript_catalog.json` contains timed English captions published by NASA Scientific Visualization Studio and a separate LinguaTube Vietnamese translation. It does not contain scraped YouTube captions, video streams or soundtrack files.

Initial entry: Voices of MAVEN, official YouTube ID `ZcRpbBTTu6k`, linked by https://svs.gsfc.nasa.gov/10157/. Caption file: https://svs.gsfc.nasa.gov/vis/a010000/a010100/a010157/G2013-054_MAVEN_Voice.en_US.vtt . Timing and English text preserve the publisher file, with empty caption intervals omitted.

NASA permits educational/informational use of its content under https://www.nasa.gov/nasa-brand-center/images-and-media/ subject to attribution, third-party exceptions and no implied endorsement. The English caption file has no separately marked third-party copyright notice. Only the caption text is redistributed; all media playback stays with YouTube. No NASA trademarks are used as app branding.

Vietnamese translation is AI-assisted LinguaTube content, not NASA-reviewed or NASA-endorsed. Source and translation credit appear in the watch screen. Additional catalog entries must have an identified publisher source, usage basis, official video match, accurate timing and a Vietnamese translation before receiving an EN+VI badge. This is a limited initial catalog, not universal availability.

## Coverage blocker, not a missing API key

The requested product should resolve captions for each opened video, not funnel viewers into this sample. Automatic coverage has **not** been achieved. YouTube Data API [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download) requires the authenticated user to have permission to edit that video. An API key or the presence of public YouTube CC does not grant that permission. Missing source responses explicitly mean LinguaTube has no authorized source; they do not assert that YouTube has no captions. Provider/network errors are separate and retryable.

After explicit user consent to Gemini terms/free-tier data use and confirmation of adult age, Google's documented [YouTube URL input](https://ai.google.dev/gemini-api/docs/video-understanding) was tested privately. The API was enabled without billing. Flash Lite returned timed EN–VI output for **We Are NASA**, a video absent from the publisher catalog. This establishes generation from an eligible URL, not complete or accurate subtitles: short archival quotes were omitted. The temporary Gemini key was revoked after the experiment. See [the trial result](../docs/GEMINI_TRIAL.md).

The standalone `ai_transcripts.py` adapter has no public HTTP route, no configured production key, no frontend switch and no automatic approval. It requires rights/provenance and validates generated output; successful generations are always `needs_review`. This is not a blanket copyright license or universal coverage. The [Gemini additional terms](https://ai.google.dev/gemini-api/terms) and [Google API content rights requirements](https://developers.google.com/terms#section_5_content) still apply. Free-tier inputs/outputs may improve Google products; age/region/quota restrictions require a product decision before public integration. No billing or public AI feature has been enabled.
