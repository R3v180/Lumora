#!/bin/bash
# Start chat WebSocket service
cd "$(dirname "$0")"
exec bun index.ts
