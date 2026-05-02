"""
Body-size cap for the AI service.

The default Starlette/FastAPI behaviour is to read the entire request body
into memory before invoking the route — a single misbehaving caller could
OOM the worker by streaming a multi-GB payload at us. Cap it at the ASGI
layer so oversized requests are rejected before any handler sees them.

We default to 1 MiB; the audit payload (page_content + lighthouse + metadata)
in practice runs tens to low-hundreds of KB, so 1 MiB is comfortable headroom.
Override via AI_SERVICE_BODY_LIMIT_BYTES if a future workload needs more.
"""

from __future__ import annotations

import os
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


def _resolve_limit() -> int:
    raw = os.getenv("AI_SERVICE_BODY_LIMIT_BYTES")
    if raw:
        try:
            n = int(raw)
            if n > 0:
                return n
        except ValueError:
            logger.warning("Invalid AI_SERVICE_BODY_LIMIT_BYTES=%r, falling back to default", raw)
    return 1 * 1024 * 1024  # 1 MiB


BODY_LIMIT_BYTES = _resolve_limit()


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Reject requests whose declared Content-Length exceeds the cap. We don't
    try to enforce a streaming limit here — the gateway is the only client
    and it always sets Content-Length, so the header check is sufficient.
    A chunked/no-Content-Length payload from an unknown caller would bypass
    this cap; tracked separately if/when we expose ai-service publicly.
    """

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                size = int(cl)
            except ValueError:
                return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
            if size > BODY_LIMIT_BYTES:
                logger.warning(
                    "Rejected oversized request: %d bytes > limit %d",
                    size,
                    BODY_LIMIT_BYTES,
                )
                return JSONResponse({"detail": "Payload too large"}, status_code=413)
        return await call_next(request)
