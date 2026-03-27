#!/bin/bash

echo "=== Testing JWT Token and Community Join Flow ==="
echo ""

# Create a test user
TEST_USER="jwttest_$(date +%s)"
TEST_EMAIL="jwttest_$(date +%s)@test.com"
TEST_PASS="testpass123"

echo "1️⃣ Registering test user: $TEST_USER"
REGISTER=$(curl -s -X POST "http://localhost:5000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

USER_ID=$(echo "$REGISTER" | jq -r '.user.id' 2>/dev/null)
TOKEN=$(echo "$REGISTER" | jq -r '.token' 2>/dev/null)

echo "✅ User ID: $USER_ID"
echo "✅ Token: ${TOKEN:0:50}..."
echo ""

# Get community ID
echo "2️⃣ Getting first community ID..."
COMMUNITIES=$(curl -s "http://localhost:5000/api/v1/communities")
COMMUNITY_ID=$(echo "$COMMUNITIES" | jq -r '.communities[0].id' 2>/dev/null)
MEMBERS_BEFORE=$(echo "$COMMUNITIES" | jq -r '.communities[0].members' 2>/dev/null)

echo "✅ Community ID: $COMMUNITY_ID"
echo "✅ Members before: $MEMBERS_BEFORE"
echo ""

# Try to join community WITH token
echo "3️⃣ Attempting to join community WITH valid JWT token..."
JOIN_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/v1/communities/$COMMUNITY_ID/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

echo "Response: $JOIN_RESPONSE"
echo ""

# Check if join was successful
JOIN_SUCCESS=$(echo "$JOIN_RESPONSE" | jq -r '.message' 2>/dev/null)
if [[ "$JOIN_SUCCESS" == *"entrato"* ]] || [[ "$JOIN_SUCCESS" == *"già membro"* ]]; then
  echo "✅ JOIN SUCCESSFUL! JWT token validation passed"
else
  echo "❌ JOIN FAILED! Error: $(echo "$JOIN_RESPONSE" | jq -r '.error' 2>/dev/null)"
fi

echo ""
echo "4️⃣ Verifying membership in database..."
sudo mysql -u root ianime -N -e "SELECT members FROM communities WHERE id=$COMMUNITY_ID LIMIT 1;" | jq .
