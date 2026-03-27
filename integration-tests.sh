#!/bin/bash

# iAnime Integration Tests
# Tests all major features: Auth, Community, Friends, Settings

BASE_URL="http://localhost:5000/api"
echo "🧪 Starting iAnime Integration Tests..."
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for tests
run_test() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5
  local token=${6:-""}
  
  echo -n "Testing: $test_name... "
  
  local cmd="curl -s -w '\n%{http_code}' -X $method"
  cmd="$cmd '$BASE_URL$endpoint'"
  
  if [ ! -z "$token" ]; then
    cmd="$cmd -H 'Authorization: Bearer $token'"
  fi
  
  if [ ! -z "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  
  local response=$(eval $cmd)
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((TESTS_PASSED++))
    echo "$body"
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $http_code)"
    ((TESTS_FAILED++))
    echo "Response: $body"
  fi
  echo ""
}

# ==================== HEALTH CHECK ====================
echo -e "${YELLOW}=== HEALTH CHECK ===${NC}"
run_test "Server Health" "GET" "/health" "" "200"

# ==================== AUTHENTICATION ====================
echo -e "${YELLOW}=== AUTHENTICATION ===${NC}"

# Register Test User 1
USER1_DATA='{"email":"testuser1@test.com","username":"testuser1","password":"password123"}'
USER1_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "$USER1_DATA")
USER1_TOKEN=$(echo "$USER1_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$USER1_RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)

echo "Testing: Register User 1... "
if [ ! -z "$USER1_TOKEN" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  echo "  Token: ${USER1_TOKEN:0:20}..."
  echo "  User ID: $USER_ID"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "Response: $USER1_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Register Test User 2
USER2_DATA='{"email":"testuser2@test.com","username":"testuser2","password":"password123"}'
USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "$USER2_DATA")
USER2_TOKEN=$(echo "$USER2_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER2_ID=$(echo "$USER2_RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)

echo "Testing: Register User 2... "
if [ ! -z "$USER2_TOKEN" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  echo "  Token: ${USER2_TOKEN:0:20}..."
  echo "  User ID: $USER2_ID"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# ==================== COMMUNITIES ====================
echo -e "${YELLOW}=== COMMUNITIES ===${NC}"

# Get existing communities
run_test "Get Communities (No Auth)" "GET" "/v1/communities" "" "200"

# Get communities with auth
echo -n "Testing: Get Communities (With Auth)... "
COMM_RESPONSE=$(curl -s -X GET "$BASE_URL/v1/communities" \
  -H "Authorization: Bearer $USER1_TOKEN")
if echo "$COMM_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Join Community
COMMUNITY_ID=1
echo -n "Testing: User 1 Join Community... "
JOIN_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/communities/$COMMUNITY_ID/join" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json")
if echo "$JOIN_RESPONSE" | grep -qi "entrato\|già membro"; then
  echo -e "${GREEN}✅ PASS${NC}"
  echo "  Response: $(echo $JOIN_RESPONSE | cut -c1-50)..."
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $JOIN_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# ==================== CHANNELS & MESSAGES ====================
echo -e "${YELLOW}=== CHANNELS & MESSAGES ===${NC}"

# Find first channel in community 1 (should be General)
CHANNEL_ID=1

# Get channel messages
echo -n "Testing: Get Channel Messages... "
MSG_RESPONSE=$(curl -s -X GET "$BASE_URL/v1/channels/$CHANNEL_ID/messages" \
  -H "Authorization: Bearer $USER1_TOKEN")
if echo "$MSG_RESPONSE" | grep -q '\['; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $MSG_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Send message to channel
MSG_DATA='{"content":"Test message from integration tests"}'
echo -n "Testing: Send Message to Channel... "
SEND_MSG=$(curl -s -X POST "$BASE_URL/v1/channels/$CHANNEL_ID/messages" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$MSG_DATA")
if echo "$SEND_MSG" | grep -qi "success\|content"; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $SEND_MSG"
  ((TESTS_FAILED++))
fi
echo ""

# ==================== FRIENDSHIPS ====================
echo -e "${YELLOW}=== FRIENDSHIPS ===${NC}"

# Send friend request
FRIEND_DATA="{\"recipientId\":$USER2_ID}"
echo -n "Testing: Send Friend Request... "
FRIEND_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/friendships" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$FRIEND_DATA")
FRIENDSHIP_ID=$(echo "$FRIEND_RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)
if [ ! -z "$FRIENDSHIP_ID" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  echo "  Friendship ID: $FRIENDSHIP_ID"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $FRIEND_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Get friendships
echo -n "Testing: Get Friend Requests... "
GET_FRIENDS=$(curl -s -X GET "$BASE_URL/v1/friendships" \
  -H "Authorization: Bearer $USER2_TOKEN")
if echo "$GET_FRIENDS" | grep -q '\['; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Accept friend request
if [ ! -z "$FRIENDSHIP_ID" ]; then
  echo -n "Testing: Accept Friend Request... "
  ACCEPT_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/friendships/$FRIENDSHIP_ID/accept" \
    -H "Authorization: Bearer $USER2_TOKEN")
  if echo "$ACCEPT_RESPONSE" | grep -qi "success\|accettata"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Response: $ACCEPT_RESPONSE"
    ((TESTS_FAILED++))
  fi
  echo ""
fi

# ==================== USER BLOCKING ====================
echo -e "${YELLOW}=== USER BLOCKING ===${NC}"

# Block user
echo -n "Testing: Block User... "
BLOCK_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/users/$USER2_ID/block" \
  -H "Authorization: Bearer $USER1_TOKEN")
if echo "$BLOCK_RESPONSE" | grep -qi "success\|bloccato"; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $BLOCK_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Get blocked users
echo -n "Testing: Get Blocked Users... "
BLOCKED=$(curl -s -X GET "$BASE_URL/v1/users/blocked/list" \
  -H "Authorization: Bearer $USER1_TOKEN")
if echo "$BLOCKED" | grep -q '\['; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((TESTS_FAILED++))
fi
echo ""

# Unblock user
echo -n "Testing: Unblock User... "
UNBLOCK_RESPONSE=$(curl -s -X DELETE "$BASE_URL/v1/users/$USER2_ID/block" \
  -H "Authorization: Bearer $USER1_TOKEN")
if echo "$UNBLOCK_RESPONSE" | grep -qi "success\|sbloccato"; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $UNBLOCK_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# ==================== USER SEARCH ====================
echo -e "${YELLOW}=== USER SEARCH ===${NC}"

# Search users
echo -n "Testing: Search Users... "
SEARCH=$(curl -s -X GET "$BASE_URL/v1/users/search?query=test" \
  -H "Authorization: Bearer $USER1_TOKEN")
if echo "$SEARCH" | grep -q '\['; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $SEARCH"
  ((TESTS_FAILED++))
fi
echo ""

# ==================== SETTINGS ====================
echo -e "${YELLOW}=== SETTINGS ===${NC}"

# Update profile
PROFILE_DATA='{"theme":"light","displayMode":"light"}'
echo -n "Testing: Update Profile Settings... "
PROFILE=$(curl -s -X PUT "$BASE_URL/v1/auth/profile" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PROFILE_DATA")
if echo "$PROFILE" | grep -qi "success\|updated"; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "  Response: $PROFILE"
  ((TESTS_FAILED++))
fi
echo ""

# ==================== TEST SUMMARY ====================
echo -e "${YELLOW}=== TEST SUMMARY ===${NC}"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
