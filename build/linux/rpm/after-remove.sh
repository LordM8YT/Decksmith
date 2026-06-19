#!/bin/sh
set -eu

MARKER="# Managed by Decksmith alpha RPM"

for target in /usr/lib/udev/rules.d/60-decksmith-user.rules /etc/udev/rules.d/60-decksmith-user.rules; do
  if [ -f "$target" ] && grep -q "$MARKER" "$target"; then
    rm -f "$target"
    echo "Decksmith RPM: removed managed udev rule at $target"
  fi
done

if command -v udevadm >/dev/null 2>&1; then
  udevadm control --reload-rules || true
  udevadm trigger || true
fi
