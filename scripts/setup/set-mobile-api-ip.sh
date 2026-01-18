#!/usr/bin/env bash
# Detect local LAN IP and update frontend/.env.development API_BASE_URL
# This is required for mobile devices/simulators to connect to the local backend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/frontend/.env.development"

detect_ip() {
  local ip
  # Common Wi-Fi interfaces on macOS
  for iface in en0 en1; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
    if [[ -n "$ip" ]]; then echo "$ip"; return 0; fi
  done
  # Fallback: parse ifconfig for Linux
  ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1 || true)
  if [[ -n "$ip" ]]; then echo "$ip"; return 0; fi
  return 1
}

IP=$(detect_ip || true)
if [[ -z "${IP:-}" ]]; then
  echo "❌ Could not detect LAN IP. Connect to Wi‑Fi and retry." >&2
  exit 1
fi

API_URL="http://$IP:8080"
echo "🔧 Detected IP: $IP"
echo "🔗 Setting API_BASE_URL=$API_URL in $ENV_FILE"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Environment file not found: $ENV_FILE" >&2
  exit 1
fi

# Update both API_BASE_URL and EXPO_PUBLIC_API_BASE_URL
if grep -q '^API_BASE_URL=' "$ENV_FILE"; then
  sed -i '' "s#^API_BASE_URL=.*#API_BASE_URL=$API_URL#" "$ENV_FILE"
else
  echo "API_BASE_URL=$API_URL" >> "$ENV_FILE"
fi

if grep -q '^EXPO_PUBLIC_API_BASE_URL=' "$ENV_FILE"; then
  sed -i '' "s#^EXPO_PUBLIC_API_BASE_URL=.*#EXPO_PUBLIC_API_BASE_URL=$API_URL#" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_API_BASE_URL=$API_URL" >> "$ENV_FILE"
fi

echo "✅ Updated. Restart Expo for changes to take effect."
echo ""
echo "Run: cd frontend && npx expo start --clear"