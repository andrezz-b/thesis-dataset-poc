#!/usr/bin/env sh
cd "$(dirname "$0")" && docker compose up -d && until curl -sf localhost:6333/readyz >/dev/null; do sleep 1; done && echo "qdrant ready"
