#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="${CERT_DIR:-./certs}"
mkdir -p "$CERT_DIR"

# 1) Install local CA into your OS/browser trust store (one-time per machine)
mkcert -install

# 2) Issue a cert for the local hostnames you’ll use
mkcert \
  -cert-file "$CERT_DIR/dev-cert.pem" \
  -key-file  "$CERT_DIR/dev-key.pem" \
  tinyauth.localtest.me replyte.localtest.me api.localtest.me localhost 127.0.0.1 ::1
