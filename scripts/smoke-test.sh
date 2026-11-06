#!/usr/bin/env bash
# Nilami Production Smoke Test
# Usage: ./scripts/smoke-test.sh [API_BASE_URL]
set -euo pipefail

API_URL="${1:-http://localhost:4000/api}"
echo "=================================================="
echo "Starting Nilami Production Smoke Test against: $API_URL"
echo "=================================================="

# 1. Health check
echo -n "1. Checking platform health... "
HEALTH=$(curl -s -f "$API_URL/health")
echo "$HEALTH" | grep -q '"ok":true'
echo "OK"

# 2. Unique test run identifier
RUN_ID=$(date +%s)
SELLER_EMAIL="seller_${RUN_ID}@nilami.smoke"
BUYER_EMAIL="buyer_${RUN_ID}@nilami.smoke"
PASSWORD="TestPassword123!"

echo "2. Registering Seller ($SELLER_EMAIL)..."
SELLER_REG=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Seller\",\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"seller\"}")

echo "3. Logging in as Seller..."
SELLER_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASSWORD\"}")
SELLER_TOKEN=$(echo "$SELLER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$SELLER_TOKEN" ]; then
  echo "Failed to get seller access token!"
  exit 1
fi
echo "Seller Authenticated: OK"

echo "4. Registering & Authenticating Buyer ($BUYER_EMAIL)..."
curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Buyer\",\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null

BUYER_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASSWORD\"}")
BUYER_TOKEN=$(echo "$BUYER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Buyer Authenticated: OK"

echo "5. Testing Public Browse & Search..."
AUCTIONS_LIST=$(curl -s "$API_URL/auctions?limit=5")
echo "$AUCTIONS_LIST" | grep -q '"items"'
echo "Browse Endpoint: OK"

echo "6. Testing Platform Analytics Endpoint..."
TRENDING=$(curl -s "$API_URL/analytics/trending")
echo "$TRENDING" | grep -q '"trending"'
echo "Analytics Endpoint: OK"

echo "=================================================="
echo "Nilami Smoke Test Succeeded! All core systems verified."
echo "=================================================="

