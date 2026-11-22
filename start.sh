#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js není nainstalovaný. Stáhni ho na https://nodejs.org (verze LTS) a spusť skript znovu."
  exit 1
fi
node server.js
