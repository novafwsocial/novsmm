#!/bin/bash
#
# Production Verification Script for novsmm.shop
#
# Run this script to verify the production deployment is healthy.
# Usage: bash scripts/verify-production.sh
#

DOMAIN="https://novsmm.shop"
PASS=0
FAIL=0

echo "════════════════════════════════════════════════════════════════"
echo "  NOVSMM — Production Verification"
echo "  Domain: $DOMAIN"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── 1. TLS Certificate ──
echo "── TLS Certificate ──"
TLS_OUTPUT=$(echo | openssl s_client -connect novsmm.shop:443 -servername novsmm.shop 2>/dev/null | openssl x509 -noout -dates -issuer 2>/dev/null)
if [ -n "$TLS_OUTPUT" ]; then
  echo "✅ TLS certificate active"
  echo "   $TLS_OUTPUT" | head -2
  PASS=$((PASS + 1))
else
  echo "❌ TLS certificate check failed"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── 2. Security Headers ──
echo "── Security Headers ──"
HEADERS=$(curl -sI "$DOMAIN" 2>/dev/null)

check_header() {
  local header=$1
  local label=$2
  if echo "$HEADERS" | grep -qi "$header"; then
    echo "✅ $label: present"
    PASS=$((PASS + 1))
  else
    echo "❌ $label: MISSING"
    FAIL=$((FAIL + 1))
  fi
}

check_header "strict-transport-security" "HSTS"
check_header "content-security-policy" "CSP"
check_header "x-frame-options" "X-Frame-Options"
check_header "x-content-type-options" "X-Content-Type-Options"
check_header "referrer-policy" "Referrer-Policy"
check_header "permissions-policy" "Permissions-Policy"
check_header "cross-origin-opener-policy" "COOP"
check_header "cross-origin-resource-policy" "CORP"
echo ""

# ── 3. Exposed Files ──
echo "── Exposed Files (should all be 404) ──"
check_404() {
  local path=$1
  local code=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN$path")
  if [ "$code" = "200" ]; then
    echo "❌ $path → $code (EXPOSED!)"
    FAIL=$((FAIL + 1))
  else
    echo "✅ $path → $code (protected)"
    PASS=$((PASS + 1))
  fi
}

check_404 "/.env"
check_404 "/.git/config"
check_404 "/api/auth/debug-oauth"
check_404 "/api/internal/backup-status"
echo ""

# ── 4. API Health ──
echo "── API Health ──"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/status")
if [ "$STATUS_CODE" = "200" ]; then
  echo "✅ /api/status → 200"
  PASS=$((PASS + 1))
else
  echo "❌ /api/status → $STATUS_CODE (should be 200)"
  FAIL=$((FAIL + 1))
fi

PROVIDERS=$(curl -s "$DOMAIN/api/auth/providers" 2>/dev/null)
if echo "$PROVIDERS" | grep -q "credentials"; then
  echo "✅ /api/auth/providers → credentials present"
  PASS=$((PASS + 1))
else
  echo "❌ /api/auth/providers → no credentials found"
  FAIL=$((FAIL + 1))
fi

if echo "$PROVIDERS" | grep -q "google"; then
  echo "✅ /api/auth/providers → google configured"
  PASS=$((PASS + 1))
else
  echo "⚠️  /api/auth/providers → google NOT configured"
fi
echo ""

# ── 5. Homepage ──
echo "── Homepage ──"
HOMEPAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN")
if [ "$HOMEPAGE_CODE" = "200" ]; then
  echo "✅ Homepage → 200"
  PASS=$((PASS + 1))
else
  echo "❌ Homepage → $HOMEPAGE_CODE"
  FAIL=$((FAIL + 1))
fi

# Check for raw translation keys (should not appear)
RAW_KEYS=$(curl -s "$DOMAIN" 2>/dev/null | grep -c "landing\.hero\.\|landing\.nav\.\|landing\.footer\.")
if [ "$RAW_KEYS" -eq 0 ]; then
  echo "✅ No raw translation keys in HTML"
  PASS=$((PASS + 1))
else
  echo "❌ Found $RAW_KEYS raw translation keys in HTML"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── 6. Response Time ──
echo "── Response Time ──"
TTFB=$(curl -s -o /dev/null -w "%{time_starttransfer}" "$DOMAIN")
TTFB_MS=$(echo "$TTFB * 1000" | bc 2>/dev/null || echo "$TTFB")
if [ "$(echo "$TTFB < 1.0" | bc 2>/dev/null || echo 0)" = "1" ]; then
  echo "✅ TTFB: ${TTFB}s (< 1s)"
  PASS=$((PASS + 1))
else
  echo "⚠️  TTFB: ${TTFB}s (> 1s — may be cache miss)"
fi
echo ""

# ── Summary ──
echo "════════════════════════════════════════════════════════════════"
echo "  SUMMARY: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "⚠️  Some checks failed. Review the output above."
  exit 1
else
  echo ""
  echo "✅ All checks passed!"
  exit 0
fi
