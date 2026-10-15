import asyncio
import json

import httpx
import pytest

from ai_transcripts import generate_bilingual, parse_generated_transcript, TranscriptGenerationError


def response(cues):
    return {'status': 'completed', 'output_text': json.dumps({'segments': cues})}


def cue(**updates):
    return {'start': 1.25, 'end': 3.0, 'en': 'Hello.', 'vi': 'Xin chào.', **updates}


def test_generated_cues_are_not_automatically_approved():
    async def run():
        def provider(request):
            assert request.url == 'https://generativelanguage.googleapis.com/v1beta/interactions'
            assert request.headers['x-goog-api-key'] == 'test-credential'
            body = json.loads(request.content)
            assert body['store'] is False
            assert body['input'][0]['uri'] == 'https://www.youtube.com/watch?v=abcdefghijk'
            return httpx.Response(200, json=response([cue()]))
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            output = await generate_bilingual('abcdefghijk', api_key='test-credential', rights_confirmed=True,
                                               rights_url='https://publisher.example/license', client=client)
        assert output['status'] == 'needs_review'
        assert output['reviewRequired'] is True
        assert output['segments'][0]['start'] == 1.25
        assert 'test-credential' not in json.dumps(output)
    asyncio.run(run())


@pytest.mark.parametrize('updates', [{'start': -1}, {'end': 0}, {'start': True}, {'end': float('inf')},
                                    {'vi': ''}, {'en': None}, {'en': 'x' * 4001}])
def test_invalid_generated_cues_are_rejected(updates):
    with pytest.raises(TranscriptGenerationError):
        parse_generated_transcript(response([cue(**updates)]))


def test_unordered_or_missing_output_is_not_substituted():
    for value in [response([cue(), cue(start=0)]), response([]),
                  {'status': 'in_progress'}, {'status': 'completed', 'output_text': '{}'}]:
        with pytest.raises(TranscriptGenerationError):
            parse_generated_transcript(value)


def test_step_based_output():
    result = parse_generated_transcript({'status': 'completed', 'steps': [
        {'type': 'thought', 'content': [{'type': 'text', 'text': 'not transcript'}]},
        {'type': 'model_output', 'content': [{'type': 'text', 'text': response([cue()])['output_text']}]}]})
    assert result[0]['vi'] == 'Xin chào.'


@pytest.mark.parametrize('authorized,code', [(False, 200), (True, 429), (True, 503), (True, 403)])
def test_permission_and_provider_failures(authorized, code):
    async def run():
        calls = []
        def provider(request):
            calls.append(request)
            return httpx.Response(code, text='raw provider content must not leak')
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            with pytest.raises(TranscriptGenerationError) as error:
                await generate_bilingual('abcdefghijk', api_key='test-credential', rights_confirmed=authorized,
                                           rights_url='https://publisher.example/license', client=client)
        assert bool(calls) is authorized
        assert 'raw provider' not in str(error.value)
    asyncio.run(run())
