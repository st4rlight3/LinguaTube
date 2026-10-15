"""Private Gemini experiment. Deliberately not exposed through the public API.

An official video-URL input is not a blanket content license or an accuracy
guarantee. Callers must establish rights first and review generated captions.
"""
import json
import math
import re
from urllib.parse import urlparse

import httpx


class TranscriptGenerationError(ValueError):
    pass


def parse_generated_transcript(response: dict) -> list[dict]:
    """Validate untrusted model output; never manufacture missing translations/times."""
    if response.get('status') != 'completed':
        raise TranscriptGenerationError('The AI transcription did not complete.')
    content = response.get('output_text')
    if not content:
        content = ''.join(part.get('text', '') for step in response.get('steps', [])
                          if step.get('type') == 'model_output' for part in step.get('content', [])
                          if part.get('type') == 'text')
    if not isinstance(content, str) or len(content) > 500_000:
        raise TranscriptGenerationError('The AI returned an invalid transcript.')
    content = re.sub(r'^```(?:json)?\s*|\s*```$', '', content.strip())
    try:
        document = json.loads(content)
    except (ValueError, TypeError):
        raise TranscriptGenerationError('The AI did not return valid subtitle JSON.') from None
    cues = document.get('segments') if isinstance(document, dict) else None
    if not isinstance(cues, list) or not 1 <= len(cues) <= 3000:
        raise TranscriptGenerationError('The AI did not return usable timed subtitles.')
    segments = []
    previous = -1
    for cue in cues:
        if not isinstance(cue, dict):
            raise TranscriptGenerationError('The AI returned an invalid subtitle cue.')
        start, end = cue.get('start'), cue.get('end')
        if (any(type(t) not in (int, float) or not math.isfinite(t) for t in (start, end))
                or not 0 <= start < end <= 28800 or start < previous):
            raise TranscriptGenerationError('The AI returned invalid or unordered subtitle times.')
        if any(not isinstance(cue.get(lang), str) or not 1 <= len(cue[lang].strip()) <= 4000 for lang in ('en', 'vi')):
            raise TranscriptGenerationError('The AI omitted a required language or returned oversized text.')
        segments.append({'id': str(len(segments)), 'start': start, 'end': end,
                         'en': cue['en'].strip(), 'vi': cue['vi'].strip()})
        previous = start
    return segments


async def generate_bilingual(video_id: str, *, api_key: str, rights_confirmed: bool,
                             rights_url: str, client: httpx.AsyncClient,
                             model: str = 'gemini-3.5-flash-lite') -> dict:
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
        raise TranscriptGenerationError('Invalid YouTube video ID.')
    if not api_key:
        raise TranscriptGenerationError('The private Gemini trial is not configured.')
    source = urlparse(rights_url)
    if rights_confirmed is not True or source.scheme != 'https' or not source.hostname or source.username or source.password:
        raise TranscriptGenerationError('Establish permission and an HTTPS rights/provenance reference before generation.')
    if model not in {'gemini-3.5-flash-lite', 'gemini-3.8-flash'}:
        raise TranscriptGenerationError('Unsupported trial model.')
    prompt = (
        'Transcribe ALL audible English speech in this educational video and translate each cue into Vietnamese. '
        'Include archival audio, brief controller/astronaut quotes, and background speech; do not omit these. '
        'Do not summarize, complete sentences from memory, or invent speech. Exclude music-only intervals. '
        'Use short cues with actual original-video start/end times in seconds. '
        'Return JSON only: {"segments":[{"start":1.0,"end":3.0,"en":"audible English","vi":"Vietnamese"}]}. '
        'If inaccessible, return {"error":"unavailable"}, not a guessed transcript.'
    )
    try:
        result = await client.post('https://generativelanguage.googleapis.com/v1beta/interactions',
                                   headers={'x-goog-api-key': api_key}, timeout=120,
                                   json={'model': model, 'store': False,
                                         'input': [{'type': 'video', 'uri': 'https://www.youtube.com/watch?v=' + video_id},
                                                   {'type': 'text', 'text': prompt}],
                                         'generation_config': {'temperature': 0, 'max_output_tokens': 16000}})
    except httpx.HTTPError:
        raise TranscriptGenerationError('The AI transcription service could not be reached.') from None
    if result.status_code in {429, 503}:
        raise TranscriptGenerationError('The AI service is busy or its allowance is exhausted. No subtitles were substituted.')
    if result.status_code >= 400:
        raise TranscriptGenerationError(f'The AI provider rejected this request ({result.status_code}).')
    if len(result.content) > 1_000_000:
        raise TranscriptGenerationError('The AI response exceeded the trial size limit.')
    try:
        response = result.json()
        if not isinstance(response, dict):
            raise ValueError()
        segments = parse_generated_transcript(response)
    except (ValueError, TypeError, AttributeError) as error:
        if isinstance(error, TranscriptGenerationError):
            raise
        raise TranscriptGenerationError('The AI provider returned an invalid response.') from None
    return {'videoId': video_id, 'status': 'needs_review', 'experimental': True,
            'reviewRequired': True, 'source': 'Google Gemini official video-URL input',
            'rightsUrl': rights_url, 'model': model, 'segments': segments,
            'translationCredit': 'AI-generated English and Vietnamese; speech may be omitted and timings may be inaccurate. Not YouTube captions.'}
