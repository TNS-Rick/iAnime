#!/bin/bash

set -e

TEST_OUTPUT="/tmp/final_consistency_test.log"
> "$TEST_OUTPUT"

log() {
  echo "$1" | tee -a "$TEST_OUTPUT"
}

log "=== FINAL CONSISTENCY & JWT TEST ==="
log ""

# Register user
log "1️⃣ Registering test user..."
TIMESTAMP=$(date +%s%N)
USER_EMAIL="consistency${TIMESTAMP}@test.com"
USER_NAME="constest${TIMESTAMP}"

REG=$(curl -s -X POST "http://localhost:5000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"username\":\"$USER_NAME\",\"password\":\"password123\"}")

USER_ID=$(echo "$REG" | jq -r '.user.id')
TOKEN=$(echo "$REG" | jq -r '.token')

log "   User created: ID=$USER_ID, Email=$USER_EMAIL"
log "   Token obtained: $(echo "$TOKEN" | cut -c1-40)..."
log ""

# Get community
log "2️⃣ Getting test community..."
COMMS=$(curl -s "http://localhost:5000/api/v1/communities?limit=1")
COMM_ID=$(echo "$COMMS" | jq -r '.communities[0].id')
MEMBER_COUNT_BEFORE=$(echo "$COMMS" | jq '.communities[0].members | length')

log "   Community ID: $COMM_ID"
log "   Members before: $MEMBER_COUNT_BEFORE"
log ""

# Join with JWT
log "3️⃣ User joining community WITH JWT token..."
JOIN=$(curl -s -X POST "http://localhost:5000/api/v1/communities/$COMM_ID/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN") 

JOIN_MSG=$(echo "$JOIN" | jq -r '.message // .error')
log "   Response: $JOIN_MSG"

if [[ "$JOIN_MSG" == *"entrato"* ]] || [[ "$JOIN_MSG" == *"già"* ]]; then
  log "   ✅ JWT VALIDATION PASSED - Join succeeded"
else
  log "   ❌ JWT VALIDATION FAILED - Join failed: $JOIN_MSG"
fi
log ""

# Verify in DB
log "4️⃣ Verifying membership in database..."
DB_RESULT=$(sudo mysql -u root ianime -N -e "SELECT members FROM communities WHERE id=$COMM_ID LIMIT 1;")
if echo "$DB_RESULT" | grep -q "$USER_ID"; then
  log "   ✅ Database confirmed: User $USER_ID is member"
  log ""
  log "=== ALL TESTS PASSED ==="
  log "✅ JWT validation working"
  log "✅ Data persisted to database"
  log "✅ Membership consistent"
else
  log "   ❌ Database query: User NOT found in community"
  log "   DB members: $DB_RESULT"
fi
