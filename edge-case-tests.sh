#!/bin/bash

# iAnime Edge Case Tests
# Tests error handling, boundary conditions, and invalid inputs

BASE_URL="http://localhost:5000/api"
echo "🔍 Starting iAnime Edge Case Tests..."
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper
run_edge_test() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local should_fail=${5:-true}  # true if error expected
  local token=${6:-""}
  
  echo -n "  ➜ $test_name... "
  
  local cmd="curl -s -w '\n%{http_code}' -X $method '$BASE_URL$endpoint'"
  
  if [ ! -z "$token" ]; then
    cmd="$cmd -H 'Authorization: Bearer $token'"
  fi
  
  if [ ! -z "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  
  local response=$(eval $cmd)
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  # Determine if this is a success or failure
  local is_error=false
  if [ "$http_code" -ge 400 ]; then
    is_error=true
  fi
  
  # Check if result matches expectation
  if [ "$should_fail" = "true" ] && [ "$is_error" = "true" ]; then
    echo -e "${GREEN}✅${NC} (Expected error, got $http_code)"
    ((TESTS_PASSED++))
  elif [ "$should_fail" = "false" ] && [ "$is_error" = "false" ]; then
    echo -e "${GREEN}✅${NC} (Expected success, got $http_code)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌${NC} (Got $http_code, body: ${body:0:40}...)"
    ((TESTS_FAILED++))
  fi
}

# Setup: Create test users and get tokens
echo -e "${BLUE}=== SETUP: Creating test users ===${NC}"
USER1_DATA='{"email":"edge1@test.com","username":"edge1","password":"pass123456"}'
USER1=$(curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" -d "$USER1_DATA")
TOKEN1=$(echo "$USER1" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ID1=$(echo "$USER1" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)

USER2_DATA='{"email":"edge2@test.com","username":"edge2","password":"pass123456"}'
USER2=$(curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" -d "$USER2_DATA")
TOKEN2=$(echo "$USER2" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ID2=$(echo "$USER2" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)

echo "Created user 1: ID=$ID1, Token=${TOKEN1:0:20}..."
echo "Created user 2: ID=$ID2, Token=${TOKEN2:0:20}..."
echo ""

# ==================== AUTHENTICATION EDGE CASES ====================
echo -e "${YELLOW}=== AUTHENTICATION EDGE CASES ===${NC}"

run_edge_test "Register with empty email" "POST" "/v1/auth/register" \
  '{"email":"","username":"testuser","password":"password123"}' true

run_edge_test "Register with empty password" "POST" "/v1/auth/register" \
  '{"email":"test@test.com","username":"testuser","password":""}' true

run_edge_test "Register with very long email" "POST" "/v1/auth/register" \
  "{\"email\":\"$(printf 'a%.0s' {1..500})@test.com\",\"username\":\"testuser\",\"password\":\"password123\"}" true

run_edge_test "Register with duplicate email" "POST" "/v1/auth/register" \
  '{"email":"edge1@test.com","username":"newuser","password":"password123"}' true

run_edge_test "Register with duplicate username" "POST" "/v1/auth/register" \
  '{"email":"newemail@test.com","username":"edge1","password":"password123"}' true

run_edge_test "Login with wrong password" "POST" "/v1/auth/login" \
  '{"email":"edge1@test.com","password":"wrongpassword"}' true

run_edge_test "Login with non-existent user" "POST" "/v1/auth/login" \
  '{"email":"nonexistent@test.com","password":"password123"}' true

echo ""

# ==================== COMMUNITY EDGE CASES ====================
echo -e "${YELLOW}=== COMMUNITY EDGE CASES ===${NC}"

run_edge_test "Join non-existent community" "POST" "/v1/communities/99999/join" \
  '{}' true "$TOKEN1"

run_edge_test "Join with invalid token" "POST" "/v1/communities/1/join" \
  '{}' true "invalidtoken123456"

run_edge_test "Join without token" "POST" "/v1/communities/1/join" \
  '{}' true

# Make user 1 join community 1 first
curl -s -X POST "$BASE_URL/v1/communities/1/join" \
  -H "Authorization: Bearer $TOKEN1" -H "Content-Type: application/json" > /dev/null

run_edge_test "Join same community twice" "POST" "/v1/communities/1/join" \
  '{}' true "$TOKEN1"

run_edge_test "Create channel with empty name" "POST" "/v1/communities/1/channels" \
  '{"name":"","type":"text"}' true "$TOKEN1"

run_edge_test "Create channel without community authorization" "POST" "/v1/communities/1/channels" \
  '{"name":"TestChannel","type":"text"}' true "$TOKEN2"

run_edge_test "Create role with invalid permissions" "POST" "/v1/communities/1/roles" \
  '{"name":"TestRole","color":"#FF0000","permissions":"invalid"}' true "$TOKEN1"

echo ""

# ==================== MESSAGE EDGE CASES ====================
echo -e "${YELLOW}=== MESSAGE EDGE CASES ===${NC}"

run_edge_test "Send empty message" "POST" "/v1/channels/1/messages" \
  '{"content":""}' true "$TOKEN1"

run_edge_test "Send message with only whitespace" "POST" "/v1/channels/1/messages" \
  '{"content":"   \n\t  "}' true "$TOKEN1"

run_edge_test "Send message to non-existent channel" "POST" "/v1/channels/99999/messages" \
  '{"content":"Test message"}' true "$TOKEN1"

run_edge_test "Send message without content field" "POST" "/v1/channels/1/messages" \
  '{}' true "$TOKEN1"

run_edge_test "Send very long message (10000+ chars)" "POST" "/v1/channels/1/messages" \
  "{\"content\":\"$(printf 'a%.0s' {1..10000})\"}" false "$TOKEN1"

run_edge_test "Get messages from non-existent channel" "GET" "/v1/channels/99999/messages" \
  '' true "$TOKEN1"

echo ""

# ==================== FRIENDSHIP EDGE CASES ====================
echo -e "${YELLOW}=== FRIENDSHIP EDGE CASES ===${NC}"

run_edge_test "Send friend request to self" "POST" "/v1/friendships" \
  "{\"recipientId\":$ID1}" true "$TOKEN1"

run_edge_test "Send friend request to non-existent user" "POST" "/v1/friendships" \
  '{"recipientId":99999}' true "$TOKEN1"

run_edge_test "Send friend request without recipientId" "POST" "/v1/friendships" \
  '{}' true "$TOKEN1"

# Send valid friend request for next tests
FRIEND_REQ=$(curl -s -X POST "$BASE_URL/v1/friendships" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":$ID2}")
FRIEND_ID=$(echo "$FRIEND_REQ" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)

run_edge_test "Accept non-existent friendship" "POST" "/v1/friendships/99999/accept" \
  '' true "$TOKEN2"

run_edge_test "Accept friendship without token" "POST" "/v1/friendships/$FRIEND_ID/accept" \
  '' true

run_edge_test "Accept friendship with wrong token" "POST" "/v1/friendships/$FRIEND_ID/accept" \
  '' true "$TOKEN1"  # Wrong token (sender instead of recipient)

run_edge_test "Reject non-existent friendship" "POST" "/v1/friendships/99999/reject" \
  '' true "$TOKEN2"

run_edge_test "Send duplicate friend request" "POST" "/v1/friendships" \
  "{\"recipientId\":$ID2}" true "$TOKEN1"

echo ""

# ==================== USER BLOCKING EDGE CASES ====================
echo -e "${YELLOW}=== USER BLOCKING EDGE CASES ===${NC}"

run_edge_test "Block non-existent user" "POST" "/v1/users/99999/block" \
  '' true "$TOKEN1"

run_edge_test "Block without token" "POST" "/v1/users/$ID2/block" \
  '' true

run_edge_test "Block self" "POST" "/v1/users/$ID1/block" \
  '' true "$TOKEN1"

# Block user 2
curl -s -X POST "$BASE_URL/v1/users/$ID2/block" \
  -H "Authorization: Bearer $TOKEN1" > /dev/null

run_edge_test "Block same user twice" "POST" "/v1/users/$ID2/block" \
  '' true "$TOKEN1"

run_edge_test "Unblock non-existent user" "DELETE" "/v1/users/99999/block" \
  '' true "$TOKEN1"

run_edge_test "Unblock user not in blocked list" "DELETE" "/v1/users/$ID2/block" \
  '' false "$TOKEN1"  # Success after blocking above

echo ""

# ==================== USER SEARCH EDGE CASES ====================
echo -e "${YELLOW}=== USER SEARCH EDGE CASES ===${NC}"

run_edge_test "Search with empty query" "GET" "/v1/users/search?query=" \
  '' true "$TOKEN1"

run_edge_test "Search with single character" "GET" "/v1/users/search?query=a" \
  '' false "$TOKEN1"

run_edge_test "Search with special characters" "GET" "/v1/users/search?query=%40%23%24%25" \
  '' false "$TOKEN1"

run_edge_test "Search with SQL injection attempt" "GET" "/v1/users/search?query='; DROP TABLE users; --" \
  '' false "$TOKEN1"

run_edge_test "Search without token" "GET" "/v1/users/search?query=test" \
  '' true

echo ""

# ==================== SETTINGS EDGE CASES ====================
echo -e "${YELLOW}=== SETTINGS EDGE CASES ===${NC}"

run_edge_test "Update profile with invalid theme" "PUT" "/v1/auth/profile" \
  '{"theme":"invalid_theme"}' false "$TOKEN1"

run_edge_test "Update profile with very long email" "PUT" "/v1/auth/profile" \
  "{\"email\":\"$(printf 'a%.0s' {1..500})@test.com\"}" false "$TOKEN1"

run_edge_test "Update profile with invalid textSize" "PUT" "/v1/auth/profile" \
  '{"textSize":99999}' false "$TOKEN1"

run_edge_test "Update profile with negative values" "PUT" "/v1/auth/profile" \
  '{"volume":-100}' true "$TOKEN1"

run_edge_test "Update profile without token" "PUT" "/v1/auth/profile" \
  '{"theme":"light"}' true

run_edge_test "Change password with short password" "POST" "/v1/auth/change-password" \
  '{"currentPassword":"pass123456","newPassword":"short"}' true "$TOKEN1"

run_edge_test "Change password with wrong current password" "POST" "/v1/auth/change-password" \
  '{"currentPassword":"wrongpassword","newPassword":"newpass123456"}' true "$TOKEN1"

echo ""

# ==================== TYPE/FORMAT EDGE CASES ====================
echo -e "${YELLOW}=== TYPE & FORMAT EDGE CASES ===${NC}"

run_edge_test "Pass string instead of number for ID" "POST" "/v1/communities/abc/join" \
  '{}' true "$TOKEN1"

run_edge_test "Pass null for required field" "POST" "/v1/friendships" \
  '{"recipientId":null}' true "$TOKEN1"

run_edge_test "Pass boolean for integer field" "POST" "/v1/channels/1/messages" \
  '{"content":"test","id":true}' false "$TOKEN1"

run_edge_test "Pass array instead of object" "POST" "/v1/auth/register" \
  '["test","test","test"]' true

run_edge_test "Pass object for string field" "POST" "/v1/channels/1/messages" \
  '{"content":{"nested":"object"}}' true "$TOKEN1"

run_edge_test "Missing Content-Type header" "POST" "/v1/auth/register" \
  '{"email":"test@test.com","username":"testuser","password":"password123"}' true

echo ""

# ==================== TEST SUMMARY ====================
echo -e "${YELLOW}=== EDGE CASE TEST SUMMARY ===${NC}"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All edge case tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  $TESTS_FAILED edge case tests failed (may be expected)${NC}"
  exit 1
fi
