import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
import app as module

@pytest.fixture
def client(monkeypatch):
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    module.Base.metadata.create_all(engine)
    monkeypatch.setattr(module, 'engine', engine)
    module.youtube_cache.clear()
    def database():
        with Session(engine) as session:
            yield session
    module.app.dependency_overrides[module.db] = database
    module.limiter.enabled = False
    monkeypatch.setattr(module.settings, 'youtube_api_key', '')
    monkeypatch.setattr(module.settings, 'translation_url', '')
    with TestClient(module.app) as c:
        yield c
    module.app.dependency_overrides.clear()
    module.limiter.enabled = True

def identity(name):
    module.app.dependency_overrides[module.user] = lambda: name

def test_health_and_unconfigured_service(client):
    assert client.get('/health').json()['status'] == 'ok'
    assert client.get('/youtube/search?q=English').status_code == 503
    assert client.get('/config').json()['youtube'] is False

def test_authentication_required(client):
    assert client.get('/records/vocabulary').status_code == 401
    assert client.put('/records/favorite', json={'key':'video', 'payload':{}}).status_code == 401


def test_publisher_bilingual_transcript_and_missing_source(client):
    result = client.get('/transcripts/ZcRpbBTTu6k').json()
    assert result['available'] is True
    assert result['sourceUrl'] == 'https://svs.gsfc.nasa.gov/10157/'
    assert len(result['segments']) == 32
    assert all(s['en'] and s['vi'] and s['end'] > s['start'] for s in result['segments'])
    assert result['segments'][4]['start'] == 33.25
    missing = client.get('/transcripts/abcdefghijk').json()
    assert missing['available'] is False
    assert missing['status'] == 'source_not_authorized'
    assert 'does not mean' in missing['reason']
    assert client.get('/config').json()['transcriptCoverage']['universal'] is False
    assert client.get('/transcripts/invalid').status_code == 422


def test_bilingual_feed_uses_live_metadata_not_bundled_video_cards(client, monkeypatch):
    monkeypatch.setattr(module.settings, 'youtube_api_key', 'test-not-a-real-key')
    async def provider(url, **kwargs):
        assert url.endswith('/videos')
        assert kwargs['params']['id'] == 'ZcRpbBTTu6k'
        return {'items': [{'id': 'ZcRpbBTTu6k', 'snippet': {'title': 'Live provider title'}, 'status': {'embeddable': True}}]}
    monkeypatch.setattr(module, 'external_json', provider)
    result = client.get('/youtube/bilingual').json()['items'][0]
    assert result['snippet']['title'] == 'Live provider title'
    assert result['bilingualAvailable'] is True

def test_owner_isolation_and_updates(client):
    identity('alice')
    assert client.put('/records/vocabulary', json={'key':'hello','payload':{'meaning':'xin chào'}}).status_code == 200
    identity('bob')
    assert client.get('/records/vocabulary').json() == []
    assert client.delete('/records/vocabulary/hello').status_code == 204
    identity('alice')
    assert client.get('/records/vocabulary').json()[0]['payload']['meaning'] == 'xin chào'
    client.put('/records/vocabulary', json={'key':'hello','payload':{'meaning':'updated'}})
    assert len(client.get('/records/vocabulary').json()) == 1
    client.delete('/records/vocabulary/hello')
    assert client.get('/records/vocabulary').json() == []

def test_srt_and_vtt_parse(client):
    for content in ['1\n00:00:01,000 --> 00:00:03,500\nHello <i>world</i>!\n', 'WEBVTT\n\ncue\n00:01.000 --> 00:03.500 align:start\nHello world!\n']:
        result = client.post('/transcripts/parse',json={'content':content,'rights_confirmed':True})
        assert result.status_code == 200
        segment=result.json()['segments'][0]
        assert segment == {'id':'0','start':1.0,'end':3.5,'en':'Hello world!','vi':''}

def test_transcript_requires_rights_and_valid_times(client):
    assert client.post('/transcripts/parse',json={'content':'text','rights_confirmed':False}).status_code == 422
    assert client.post('/transcripts/parse',json={'content':'00:05 --> 00:02\nbad','rights_confirmed':True}).status_code == 422
    assert client.post('/transcripts/parse',json={'content':'nothing','rights_confirmed':True}).status_code == 422

def test_real_search_contract_with_mock_provider(client,monkeypatch):
    monkeypatch.setattr(module.settings,'youtube_api_key','test-not-a-real-key')
    calls=[]
    async def provider(url,**kwargs):
        calls.append((url,kwargs))
        return {'items':[], 'nextPageToken':'next'}
    monkeypatch.setattr(module,'external_json',provider)
    result=client.get('/youtube/search?q=English&duration=short&page=abc')
    assert result.status_code == 200
    assert calls[0][0] == 'https://www.googleapis.com/youtube/v3/search'
    assert calls[0][1]['params']['videoEmbeddable'] == 'true'
    assert calls[0][1]['params']['pageToken'] == 'abc'
    assert 'test-not-a-real-key' not in result.text


def test_video_search_enriches_only_authoritative_embeddable_results(client, monkeypatch):
    monkeypatch.setattr(module.settings, 'youtube_api_key', 'test-not-a-real-key')
    async def provider(url, **kwargs):
        if url.endswith('/search'):
            return {'items': [{'id': {'videoId': 'abcdefghijk'}, 'snippet': {'title': 'Provider title'}},
                              {'id': {'videoId': 'lmnopqrstuv'}, 'snippet': {'title': 'Blocked'}}], 'nextPageToken': 'next'}
        assert kwargs['params']['id'] == 'abcdefghijk,lmnopqrstuv'
        return {'items': [{'id': 'abcdefghijk', 'statistics': {'viewCount': '123'}, 'contentDetails': {'duration': 'PT5M'}, 'status': {'embeddable': True}},
                          {'id': 'lmnopqrstuv', 'status': {'embeddable': False}}]}
    monkeypatch.setattr(module, 'external_json', provider)
    result = client.get('/youtube/search?q=English').json()
    assert result['nextPageToken'] == 'next'
    assert len(result['items']) == 1
    assert result['items'][0]['statistics']['viewCount'] == '123'
    assert result['items'][0]['contentDetails']['duration'] == 'PT5M'


def test_channel_playlist_contract(client, monkeypatch):
    monkeypatch.setattr(module.settings, 'youtube_api_key', 'test-not-a-real-key')
    async def provider(url, **kwargs):
        assert url.endswith('/playlists')
        assert kwargs['params']['channelId'] == 'UCabcdefghijklmnopqrstuv'
        return {'items': [{'id': 'PLabcdefghijklmnopqrstuv', 'snippet': {'title': 'Playlist'}}]}
    monkeypatch.setattr(module, 'external_json', provider)
    result = client.get('/youtube/channels/UCabcdefghijklmnopqrstuv/playlists').json()
    assert result['items'][0]['id']['playlistId'] == 'PLabcdefghijklmnopqrstuv'
    assert client.get('/youtube/channels/invalid/playlists').status_code == 422

def test_translation_budget_and_batch_contract(client,monkeypatch):
    identity('alice')
    monkeypatch.setattr(module.settings,'translation_url','https://translate.example.test')
    monkeypatch.setattr(module.settings,'translation_daily_char_limit',5)
    async def provider(url,**kwargs):
        assert kwargs['body']['q']==['hello']
        return {'translatedText':['xin chào']}
    monkeypatch.setattr(module,'external_json',provider)
    data={'texts':['hello'],'source':'en','target':'vi'}
    assert client.post('/translate',json=data).json()['texts']==['xin chào']
    assert client.post('/translate',json=data).status_code==429

def test_invalid_payloads(client):
    identity('alice')
    assert client.post('/translate',json={'texts':['a'*6001]}).status_code == 422
    assert client.put('/records/vocabulary',json={'key':'../other','payload':{}}).status_code==422
    assert client.get('/youtube/channels/invalid').status_code==422
    assert client.get('/dictionary/%3Cscript%3E').status_code==422

def test_token_rejected_when_auth_unconfigured(client,monkeypatch):
    monkeypatch.setattr(module.settings,'supabase_url','')
    assert client.get('/records/history',headers={'Authorization':'Bearer forged'}).status_code==503

def test_oversized_body_rejected_before_parsing(client):
    assert client.post('/transcripts/parse', content=b'x'*1_000_001).status_code == 413

def test_youtube_cache_and_global_quota(client, monkeypatch):
    monkeypatch.setattr(module.settings, 'youtube_api_key', 'test-key')
    monkeypatch.setattr(module.settings, 'youtube_daily_quota_limit', 100)
    calls=[]
    async def provider(url, **kwargs):
        calls.append(url)
        return {'items': []}
    monkeypatch.setattr(module, 'external_json', provider)
    assert client.get('/youtube/search?q=hello').status_code == 200
    assert client.get('/youtube/search?q=hello').status_code == 200
    assert len(calls) == 1
    assert client.get('/youtube/search?q=world').status_code == 429

def test_expired_youtube_metadata_removed(client):
    identity('alice')
    client.put('/records/favorite', json={'key':'video','payload':{'id':'video','title':'Old title','thumbnail':'old.jpg','cachedAt':1}})
    result=client.get('/records/favorite').json()[0]['payload']
    assert result['id']=='video'
    assert result['title']=='Saved YouTube video'
    assert result['thumbnail']==''

def test_signed_jwt_validation(client,monkeypatch):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from types import SimpleNamespace
    import jwt
    import time
    key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
    monkeypatch.setattr(module.settings,'supabase_url','https://auth.example.test')
    monkeypatch.setattr(module,'jwks_client',lambda url: SimpleNamespace(get_signing_key_from_jwt=lambda token:SimpleNamespace(key=key.public_key())))
    claims={'sub':'alice','aud':'authenticated','iss':'https://auth.example.test/auth/v1','exp':int(time.time())+60}
    token=jwt.encode(claims,key,algorithm='RS256')
    assert client.get('/records/history',headers={'Authorization':'Bearer '+token}).status_code==200
    for changed in [{'exp':1},{'aud':'another-service'},{'iss':'https://attacker.invalid'}]:
        invalid=jwt.encode({**claims,**changed},key,algorithm='RS256')
        assert client.get('/records/history',headers={'Authorization':'Bearer '+invalid}).status_code==401
