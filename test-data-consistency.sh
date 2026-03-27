#!/bin/bash

echo "=== Testing Data Consistency Across Components ==="
echo ""

# 1. Register user
TEST_USER="consistency_$(date +%s)"
TEST_EMAIL="consistency_$(date +%s)@test.com"
TEST_PASS="testpass123"

echo "1️⃣ Registering test user: $TEST_USER"
REGISTER=$(curl -s -X POST "http://localhost:5000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

USER_ID=$(echo "$REGISTER" | jq -r '.user.id')
TOKEN=$(echo "$REGISTER" | jq -r '.token')
USER_DATA=$(echo "$REGISTER" | jq '.user')

echo "✅ User ID: $USER_ID"
echo "✅ User communities (from registration response): $(echo "$USER_DATA" | jq '.communities')"
echo ""

# 2. Get first community
echo "2️⃣ Fetching first community..."
COMM=$(curl -s "http://localhost:5000/api/v1/communities?limit=1")
COMMUNITY_ID=$(echo "$COMM" | jq -r '.communities[0].id')
COMM_MEMBERS=$(echo "$COMM" | jq -r '.communities[0].members')

echo "✅ Community ID: $COMMUNITY_ID"
echo "✅ Community members BEFORE join: $COMM_MEMBERS"
echo "✅ User $USER_ID is member? $(echo "$COMM_MEMBERS" | grep -q "$USER_ID" && echo "YES" || echo "NO")"
echo ""

# 3. User joins community
echo "3️⃣ User joining community..."
JOIN=$(curl -s -X POST "http://localhost:5000/api/v1/communities/$COMMUNITY_ID/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Response: $(echo "$JOIN" | jq '.message')"
echo ""

# 4. Verify membership in database
echo "4️⃣ Verifying membership in database..."
DB_MEMBERS=$(sudo mysql -u root ianime -N -e "SELECT members FROM communities WHERE id=$COMMUNITY_ID LIMIT 1;")
echo "✅ DB Members: $DB_MEMBERS"
echo "✅ User $USER_ID is member? $(echo "$DB_MEMBERS" | grep -q "$USER_ID" && echo "YES" || echo "NO")"
echo ""

# 5. Get user by ID to check if communities array updated
echo "5️⃣ Fetching updated user data..."
USER_API=$(curl -s "http://localhost:5000/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")
USER_COMMUNITIES=$(echo "$USER_API" | jq '.user.communities' 2>/dev/null || echo "ERROR: User endpoint might not exist")

echo "✅ User communities (from API): $USER_COMMUNITIES"
echo ""

# 6. Get updated community to verify member count
echo "6️⃣ Fetching updated community..."
COMM_UPDATED=$(curl -s "http://localhost:5000/api/v1/communities/$COMMUNITY_ID")
MEMBERS_UPDATED=$(echo "$COMM_UPDATED" | jq '.community.members')

echo "✅ Community members AFTER join: $MEMBERS_UPDATED"
echo "✅ User $USER_ID is member? $(echo "$MEMBERS_UPDATED" | grep -q "$USER_ID" && echo "✅ YES" || echo "❌ NO")"
echo ""

# 7. Final consistency check
echo "7️⃣ CONSISTENCY CHECK:"
if echo "$MEMBERS_UPDATED" | grep -q "$USER_ID"; then
  echo "✅ Database has user in community"
else
  echo "❌ Database MISSING user in community"
fi

if echo "$DB_MEMBERS" | grep -q "$USER_ID"; then
  echo "✅ Raw DB query confirms user in community"
else
  echo "❌ Raw DB query shows user NOT in community"
fi
