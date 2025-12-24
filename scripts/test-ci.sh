#!/bin/bash
set -e

echo "🧪 Running Replyte CI Tests"

echo "📦 Building images..."
docker compose -f docker-compose.ci.yml build

echo "🔧 Running server tests..."
docker compose -f docker-compose.ci.yml run --rm server-test

echo "🌐 Running web tests..."
docker compose -f docker-compose.ci.yml run --rm web-test

echo "🧹 Cleaning up..."
docker compose -f docker-compose.ci.yml down -v

echo "✅ All tests passed!"