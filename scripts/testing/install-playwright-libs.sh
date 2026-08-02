#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
dependency_dir="$project_dir/.playwright-deps"
download_dir="$(mktemp -d)"
trap 'rm -rf "$download_dir"' EXIT

mkdir -p "$dependency_dir"
(
  cd "$download_dir"
  apt-get download libnspr4 libnss3
  for package in ./*.deb; do
    dpkg-deb -x "$package" "$dependency_dir"
  done
)

echo "Dependencias locales de Chromium preparadas en .playwright-deps."
