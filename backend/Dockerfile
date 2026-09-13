# VerifyAbroad-AI backend — container image.
#
# Render (and any Docker host) needs three things this file handles:
#   * bind on 0.0.0.0 and respect the injected $PORT,
#   * a non-root user with the app under a stable path,
#   * only the runtime dependencies (no .env, no local sqlite file, no caches).
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Wheels cover Pillow/PyMuPDF on linux/amd64; the compiler stays as a fallback
# for pinned versions on a newer base image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads /app/data \
    && useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

# Render injects PORT; 10000 is the fallback for a plain `docker run`.
ENV PORT=10000
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/ping" || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
