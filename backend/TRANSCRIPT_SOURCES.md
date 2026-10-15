# Publisher caption catalog

`transcript_catalog.json` contains timed English captions published by NASA Scientific Visualization Studio and a separate LinguaTube Vietnamese translation. It does not contain scraped YouTube captions, video streams or soundtrack files.

Initial entry: Voices of MAVEN, official YouTube ID `ZcRpbBTTu6k`, linked by https://svs.gsfc.nasa.gov/10157/. Caption file: https://svs.gsfc.nasa.gov/vis/a010000/a010100/a010157/G2013-054_MAVEN_Voice.en_US.vtt . Timing and English text preserve the publisher file, with empty caption intervals omitted.

NASA permits educational/informational use of its content under https://www.nasa.gov/nasa-brand-center/images-and-media/ subject to attribution, third-party exceptions and no implied endorsement. The English caption file has no separately marked third-party copyright notice. Only the caption text is redistributed; all media playback stays with YouTube. No NASA trademarks are used as app branding.

Vietnamese translation is AI-assisted LinguaTube content, not NASA-reviewed or NASA-endorsed. Source and translation credit appear in the watch screen. Additional catalog entries must have an identified publisher source, usage basis, official video match, accurate timing and a Vietnamese translation before receiving an EN+VI badge. This is a limited initial catalog, not universal availability.

## Coverage blocker, not a missing API key

The requested product should resolve captions for each opened video, not funnel viewers into this sample. Automatic coverage has **not** been achieved. YouTube Data API [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download) requires the authenticated user to have permission to edit that video. An API key or the presence of public YouTube CC does not grant that permission. Missing source responses explicitly mean LinguaTube has no authorized source; they do not assert that YouTube has no captions. Provider/network errors are separate and retryable.

Potential next experiment: Google's documented [Gemini YouTube URL input](https://ai.google.dev/gemini-api/docs/video-understanding) could generate timed AI transcripts for eligible public videos without client stream extraction. It is **not configured or verified**, is not a blanket copyright license, and does not establish universal availability or accurate sentence timings. Its [additional terms](https://ai.google.dev/gemini-api/terms) and [Google API content rights requirements](https://developers.google.com/terms#section_5_content) require separate review/consent. Free-tier submitted inputs/outputs may be used to improve Google products; there are age/region/quota restrictions. No Gemini service, credential, billing or public feature has been enabled on this basis.
