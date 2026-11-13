import json
import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import Field, ValidationError
from starlette.concurrency import run_in_threadpool

from .detection import DetectionPolicy, Finding, evaluate
from .host_health import HostHealth, health_view
from .models import Asset, Event, EventInput, Model
from .security_events import SSHFailure, TCPConnection
from .store import EventStore


MAX_EVENT_BYTES = 64 * 1024
DASHBOARD_DIR = Path(__file__).resolve().parent.parent / 'dashboard'
logger = logging.getLogger(__name__)


class DetectionRequest(Model):
    event_ids: list[UUID] = Field(min_length=1, max_length=250)
    policy: DetectionPolicy = Field(default_factory=DetectionPolicy)


async def read_event(request: Request) -> EventInput:
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_EVENT_BYTES:
            raise HTTPException(413, 'Event exceeds the 64 KiB limit')
        body.extend(chunk)
    try:
        event = EventInput.model_validate_json(body)
        json.dumps(event.model_dump(mode='json'), allow_nan=False, ensure_ascii=False).encode('utf-8')
    except ValidationError as exc:
        errors = [{'loc': error['loc'], 'type': error['type']}
                  for error in exc.errors(include_input=False, include_context=False)]
        raise HTTPException(422, errors) from None
    except (ValueError, RecursionError):
        raise HTTPException(422, 'Event contains unsupported JSON values') from None
    return event


def create_app(database_path: Path) -> FastAPI:
    store = EventStore(database_path)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await run_in_threadpool(store.initialize)
        yield

    app = FastAPI(title='AEGISOPS Ingestion', version='0.1.0', lifespan=lifespan)
    app.mount('/dashboard', StaticFiles(directory=DASHBOARD_DIR, html=True), name='dashboard')

    @app.get('/', include_in_schema=False)
    def dashboard():
        return RedirectResponse('/dashboard/')

    @app.exception_handler(sqlite3.Error)
    async def storage_error(_: Request, exc: sqlite3.Error):
        from fastapi.responses import JSONResponse

        logger.error('event_store_failure', extra={'error_type': type(exc).__name__})
        return JSONResponse(status_code=503, content={'detail': 'Event storage unavailable'})

    @app.post('/events', status_code=status.HTTP_201_CREATED, response_model=Event,
              responses={200: {'model': Event, 'description': 'Existing event'}})
    async def ingest(request: Request, response: Response) -> Event:
        event, created = await run_in_threadpool(store.save, await read_event(request))
        if not created:
            response.status_code = status.HTTP_200_OK
        return event

    @app.get('/events/{event_id}', response_model=Event)
    def get_event(event_id: UUID) -> Event:
        event = store.get(event_id)
        if event is None:
            raise HTTPException(404, 'Event not found')
        return event

    @app.post('/assets', response_model=Asset)
    def register_asset(asset: Asset) -> Asset:
        store.register_asset(asset)
        return asset

    @app.post('/security/ssh-failures', response_model=Event)
    def ingest_ssh(record: SSHFailure, simulation: bool = True) -> Event:
        return store.save(record.normalize(simulation))[0]

    @app.post('/security/tcp-connections', response_model=Event)
    def ingest_connection(record: TCPConnection, simulation: bool = True) -> Event:
        return store.save(record.normalize(simulation))[0]

    @app.post('/security/evaluate', response_model=list[Finding])
    def evaluate_events(request: DetectionRequest) -> list[Finding]:
        events = []
        for event_id in dict.fromkeys(request.event_ids):
            event = store.get(event_id)
            if event is None:
                raise HTTPException(404, 'Event not found')
            events.append(event)
        return evaluate(events, request.policy)

    @app.get('/assets/{asset_id}/health', response_model=HostHealth)
    def get_host_health(asset_id: str, simulation: bool = False) -> HostHealth:
        asset = store.get_asset(asset_id)
        if asset is None:
            raise HTTPException(404, 'Asset not found')
        return health_view(asset, store.latest_host_health(asset_id, simulation), simulation, 300)

    @app.get('/api/dashboard')
    def dashboard_snapshot(simulation: bool = True, limit: int = Query(100, ge=1, le=250)):
        events = store.recent_events(simulation, limit)
        return {
            'simulation': simulation,
            'event_limit': limit,
            'assets': [
                health_view(asset, store.latest_host_health(asset.asset_id, simulation), simulation, 300)
                for asset in store.list_assets()
            ],
            'events': events,
            'findings': evaluate(events, DetectionPolicy()),
        }

    return app


app = create_app(Path(os.environ.get('AEGISOPS_DB_PATH', 'var/aegisops.sqlite3')))
