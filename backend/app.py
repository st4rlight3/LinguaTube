"""LinguaTube API. External integrations fail closed when unconfigured."""
import asyncio
import hashlib
import re
import time
from datetime import datetime, timezone, timedelta
from functools import lru_cache
from typing import Literal
from uuid import uuid4

import httpx
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import JSON, DateTime, Integer, String, UniqueConstraint, create_engine, delete, select, text, update
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'sqlite:///./linguatube.db'
    supabase_url: str = ''
    supabase_service_role_key: str = ''
    youtube_api_key: str = ''
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://com.st4rlight3.linguatube']
    translation_url: str = ''
    translation_api_key: str = ''
    translation_daily_char_limit: int = 12000
    rate_limit_storage_uri: str = 'memory://'


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True,
                       connect_args={'check_same_thread': False} if settings.database_url.startswith('sqlite') else {})


class Base(DeclarativeBase):
    pass


class Record(Base):
    __tablename__ = 'records'
    __table_args__ = (UniqueConstraint('owner', 'kind', 'key'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner: Mapped[str] = mapped_column(String(128), index=True)
    kind: Mapped[str] = mapped_column(String(24))
    key: Mapped[str] = mapped_column(String(128))
    payload: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Budget(Base):
    __tablename__ = 'translation_budgets'
    key: Mapped[str] = mapped_column(String(160), primary_key=True)
    used: Mapped[int] = mapped_column(Integer, default=0)


def db():
    with Session(engine) as session:
        yield session


bearer = HTTPBearer(auto_error=False)


@lru_cache
def jwks_client(url: str):
    return jwt.PyJWKClient(url + '/auth/v1/.well-known/jwks.json', cache_keys=True)


def user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(401, 'Sign in to sync your learning data.')
    if not settings.supabase_url:
        raise HTTPException(503, 'Account service is not configured.')
    try:
        key = jwks_client(settings.supabase_url).get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(credentials.credentials, key.key, algorithms=['ES256', 'RS256'],
                            audience='authenticated', issuer=settings.supabase_url + '/auth/v1',
                            options={'require': ['exp', 'sub', 'iss', 'aud']})
        return claims['sub']
    except (jwt.PyJWTError, ValueError, OSError):
        raise HTTPException(401, 'Your session has expired. Please sign in again.') from None


limiter = Limiter(key_func=get_remote_address, storage_uri=settings.rate_limit_storage_uri)
app = FastAPI(title='LinguaTube', version='0.1.0')
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])


@app.middleware('http')
async def secure_headers(request: Request, call_next):
    # All upload payloads are JSON; reject oversized bodies even without Content-Length.
    if request.method in {'POST', 'PUT'}:
        body = await request.body()
        if len(body) > 1_000_000:
            return Response('Request is too large.', status_code=413)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/health')
def health(session: Session = Depends(db)):
    session.execute(text('SELECT 1'))
    return {'status': 'ok', 'version': '0.1.0'}


@app.get('/config')
def config():
    return {'youtube': bool(settings.youtube_api_key), 'accounts': bool(settings.supabase_url),
            'translation': bool(settings.translation_url), 'transcriptSources': ['user-uploaded-srt-vtt']}


async def external_json(url: str, *, params=None, body=None, headers=None):
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            response = await (client.post(url, json=body, headers=headers) if body is not None else client.get(url, params=params, headers=headers))
        if response.status_code >= 400:
            if response.status_code == 404:
                raise HTTPException(404, 'No result is available from this provider.')
            raise HTTPException(502, 'The provider is unavailable or its quota has been reached. Please try later.')
        return response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, 'The provider could not be reached. Please try again.') from None


async def youtube(resource: str, **params):
    if not settings.youtube_api_key:
        raise HTTPException(503, 'YouTube search is not configured. The server needs a YouTube Data API key.')
    return await external_json('https://www.googleapis.com/youtube/v3/' + resource,
                               params={**params, 'key': settings.youtube_api_key})


@app.get('/youtube/search')
@limiter.limit('10/minute')
async def search(request: Request, q: str = '', kind: Literal['video', 'channel', 'playlist'] = 'video',
                 page: str = '', duration: Literal['any', 'short', 'medium', 'long'] = 'any',
                 order: Literal['relevance', 'date', 'viewCount'] = 'relevance'):
    if not 1 <= len(q.strip()) <= 200 or len(page) > 256:
        raise HTTPException(422, 'Enter a search between 1 and 200 characters.')
    params = dict(part='snippet', q=q, type=kind, maxResults=12, order=order, safeSearch='moderate')
    if page:
        params['pageToken'] = page
    if kind == 'video':
        params.update(videoEmbeddable='true', videoDuration=duration)
    return await youtube('search', **params)


@app.get('/youtube/popular')
@limiter.limit('10/minute')
async def popular(request: Request, category: str = '27', page: str = ''):
    if category not in {'0', '10', '22', '27', '28'} or len(page) > 256:
        raise HTTPException(422, 'Unsupported category or page token.')
    return await youtube('videos', part='snippet,contentDetails,statistics', chart='mostPopular',
                         regionCode='US', videoCategoryId=category, maxResults=12, pageToken=page)


@app.get('/youtube/channels/{channel_id}')
@limiter.limit('20/minute')
async def channel(request: Request, channel_id: str):
    if not re.fullmatch(r'UC[\w-]{22}', channel_id):
        raise HTTPException(422, 'Invalid channel ID.')
    return await youtube('channels', part='snippet,contentDetails,statistics', id=channel_id)


@app.get('/youtube/playlists/{playlist_id}')
@limiter.limit('20/minute')
async def playlist(request: Request, playlist_id: str, page: str = ''):
    if not re.fullmatch(r'[\w-]{10,100}', playlist_id) or len(page) > 256:
        raise HTTPException(422, 'Invalid playlist ID.')
    return await youtube('playlistItems', part='snippet,contentDetails', playlistId=playlist_id, maxResults=20, pageToken=page)


@app.get('/dictionary/{word}')
@limiter.limit('40/minute')
async def dictionary(request: Request, word: str):
    if not re.fullmatch(r"[a-zA-Z][a-zA-Z'-]{0,49}", word):
        raise HTTPException(422, 'Select an English word.')
    return await external_json('https://api.dictionaryapi.dev/api/v2/entries/en/' + word.lower())


Kind = Literal['vocabulary', 'favorite', 'bookmark', 'history', 'profile', 'transcript', 'progress']


class RecordInput(BaseModel):
    key: str = Field(min_length=1, max_length=128, pattern=r'^[\w.:-]+$')
    payload: dict

    @field_validator('payload')
    @classmethod
    def bounded_payload(cls, v):
        import json
        if len(json.dumps(v)) > 300_000:
            raise ValueError('Record too large')
        return v


@app.get('/records/{kind}')
def list_records(kind: Kind, owner: str = Depends(user), session: Session = Depends(db)):
    records = session.scalars(select(Record).where(Record.owner == owner, Record.kind == kind).order_by(Record.updated_at.desc()).limit(1000))
    return [{'key': r.key, 'payload': r.payload, 'updatedAt': r.updated_at} for r in records]


@app.put('/records/{kind}')
def put_record(kind: Kind, data: RecordInput, owner: str = Depends(user), session: Session = Depends(db)):
    record = session.scalar(select(Record).where(Record.owner == owner, Record.kind == kind, Record.key == data.key))
    if not record:
        record = Record(owner=owner, kind=kind, key=data.key, payload=data.payload)
        session.add(record)
    record.payload = data.payload
    record.updated_at = datetime.now(timezone.utc)
    session.commit()
    return {'key': record.key, 'payload': record.payload}


@app.delete('/records/{kind}/{key}', status_code=204)
def remove_record(kind: Kind, key: str, owner: str = Depends(user), session: Session = Depends(db)):
    session.execute(delete(Record).where(Record.owner == owner, Record.kind == kind, Record.key == key))
    session.commit()


class TranscriptInput(BaseModel):
    content: str = Field(min_length=1, max_length=250_000)
    rights_confirmed: Literal[True]


def timestamp(value: str) -> float:
    parts = value.replace(',', '.').split(':')
    if len(parts) not in (2, 3):
        raise ValueError('Invalid timestamp')
    result = 0.0
    for p in parts:
        result = result * 60 + float(p)
    return result


def parse_transcript(content: str) -> list[dict]:
    content = content.lstrip('\ufeff').replace('\r\n', '\n')
    result = []
    for block in re.split(r'\n\s*\n', content):
        lines = block.strip().splitlines()
        for i, line in enumerate(lines):
            if '-->' not in line:
                continue
            try:
                start, end = line.split('-->')
                start_s, end_s = timestamp(start.strip()), timestamp(end.strip().split()[0])
                if not 0 <= start_s < end_s <= 86400:
                    raise ValueError('Invalid cue bounds')
                import html
                value = html.unescape(re.sub(r'<[^>]+>', '', ' '.join(lines[i + 1:])))
                if value.strip():
                    result.append({'id': str(len(result)), 'start': start_s, 'end': end_s, 'en': value, 'vi': ''})
            except (ValueError, IndexError):
                raise HTTPException(422, 'Invalid SRT/VTT timestamp.') from None
            break
    if not result or len(result) > 3000:
        raise HTTPException(422, 'Upload an SRT/VTT file with 1–3000 valid cues.')
    return sorted(result, key=lambda s: s['start'])


@app.post('/transcripts/parse')
@limiter.limit('20/minute')
def parse_upload(request: Request, data: TranscriptInput):
    return {'segments': parse_transcript(data.content), 'source': 'user-upload', 'authorized': True}


class TranslationInput(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=50)
    source: Literal['en', 'vi', 'auto'] = 'en'
    target: Literal['en', 'vi'] = 'vi'

    @field_validator('texts')
    @classmethod
    def validate_texts(cls, values):
        if any(not value.strip() for value in values) or sum(map(len, values)) > 6000:
            raise ValueError('Translation batch must contain 1–6000 characters')
        return values


@app.post('/translate')
@limiter.limit('10/minute')
async def translate(request: Request, data: TranslationInput, owner: str = Depends(user), session: Session = Depends(db)):
    if not settings.translation_url:
        raise HTTPException(503, 'Translation provider is not configured.')
    if not settings.translation_url.startswith('https://'):
        raise HTTPException(503, 'Translation provider must use HTTPS.')
    key = owner + ':' + datetime.now(timezone.utc).date().isoformat()
    cost = sum(map(len, data.texts))
    # Insert once, then atomically reserve budget, including concurrent workers.
    from sqlalchemy.exc import IntegrityError
    if not session.get(Budget, key):
        session.add(Budget(key=key, used=0))
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
    reserved = session.execute(update(Budget).where(Budget.key == key, Budget.used + cost <= settings.translation_daily_char_limit).values(used=Budget.used + cost))
    session.commit()
    if not reserved.rowcount:
        raise HTTPException(429, 'Daily translation character allowance reached.')
    body = {'q': data.texts, 'source': data.source, 'target': data.target, 'format': 'text'}
    if settings.translation_api_key:
        body['api_key'] = settings.translation_api_key
    # Failed attempts still count to prevent repeated provider billing on retries.
    result = await external_json(settings.translation_url.rstrip('/') + '/translate', body=body)
    translated = result.get('translatedText')
    if not isinstance(translated, list) or len(translated) != len(data.texts) or not all(isinstance(t, str) for t in translated):
        raise HTTPException(502, 'Translation provider returned an invalid batch.')
    return {'texts': translated, 'characters': cost}


@app.delete('/account', status_code=204)
async def delete_account(owner: str = Depends(user), session: Session = Depends(db)):
    if not settings.supabase_service_role_key:
        raise HTTPException(503, 'Account deletion requires server administrator configuration.')
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.delete(settings.supabase_url + '/auth/v1/admin/users/' + owner,
                                           headers={'apikey': settings.supabase_service_role_key,
                                                    'Authorization': 'Bearer ' + settings.supabase_service_role_key})
        if response.status_code >= 400:
            raise HTTPException(502, 'Account provider could not delete this account. Please retry.')
    except httpx.HTTPError:
        raise HTTPException(502, 'Account provider could not be reached.') from None
    session.execute(delete(Record).where(Record.owner == owner))
    session.execute(delete(Budget).where(Budget.key.startswith(owner + ':')))
    session.commit()
