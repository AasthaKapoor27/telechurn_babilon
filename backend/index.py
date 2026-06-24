# Vercel ASGI entry point
# The @vercel/python runtime looks for `app` in this file.
from main import app  # noqa: F401 — re-exported for Vercel

__all__ = ["app"]
