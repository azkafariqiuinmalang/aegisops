"""Vercel entrypoint for the AEGISOPS FastAPI application.

Vercel detects the ``app`` instance below and runs the ASGI application as a
single function. The dashboard mounted at ``/dashboard`` is promoted to the CDN
build output automatically, so the public URL mirrors a local run.

The Vercel filesystem is read-only except ``/tmp``, therefore the SQLite store
lives there and is seeded on every cold start with clearly labelled simulation
data. Writes do not survive an instance restart; the bundle is a demo, not a
durable deployment.
"""

import os

os.environ.setdefault('AEGISOPS_DB_PATH', '/tmp/aegisops.sqlite3')
os.environ.setdefault('AEGISOPS_SEED_DEMO', '1')

from aegisops.main import app  # noqa: E402

__all__ = ['app']
