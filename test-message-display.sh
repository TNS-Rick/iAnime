#!/bin/bash

echo "=== Testing Message Display Issue ==="
echo ""

TOKEN=$(jq -r '.token' /tmp/login.txt)
USER_ID=$(jq -r '.user.id' /tmp/login.txt)
USERNAME=$(jq -r '.user.username' /tmp/login.txt)

echo "User: $USERNAME (ID: $USER_ID)"
echo "Token: $(echo $TOKEN | cut -c1-40)..."
echo ""

# 1. Get current message count
echo "1️⃣ Initial message count in channel 1..."
INITIAL=$(curl -s "http://localhost:5000/api/v1/channels/1/messages?limit=100" \
  -H "Authorization: Bearer $TOKEN" | jq '.messages | length')
echo "   Count: $INITIAL"
echo ""

# 2. Send a message
echo "2️⃣ Sending test message..."
TEST_CONTENT="Test at $(date +%s%N)"
SEND_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/v1/channels/1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"content\":\"$TEST_CONTENT\"}")

echo "   Response:"
echo "$SEND_RESPONSE" | jq .
echo ""

# Extract message data from response
MSG_ID=$(echo "$SEND_RESPONSE" | jq -r '.message.id // empty')
MSG_AUTHOR=$(echo "$SEND_RESPONSE" | jq -r '.message.authorId // empty')
MSG_CONTENT=$(echo "$SEND_RESPONSE" | jq -r '.message.content // empty')

echo "3️⃣ Response analysis:"
echo "   Message ID: $MSG_ID"
echo "   Author ID in response: $MSG_AUTHOR"
echo "   Content: $MSG_CONTENT"
echo ""

# 3. Fetch messages again
echo "4️⃣ Fetching all messages after send..."
FETCH_RESPONSE=$(curl -s "http://localhost:5000/api/v1/channels/1/messages?limit=100" \
  -H "Authorization: Bearer $TOKEN")

FINAL_COUNT=$(echo "$FETCH_RESPONSE" | jq '.messages | length')
echo "   New count: $FINAL_COUNT"
echo "   Difference: $((FINAL_COUNT - INITIAL))"
echo ""

# 4. Find the message we just sent
echo "5️⃣ Searching for our sent message in responses..."
FOUND=$(echo "$FETCH_RESPONSE" | jq ".messages[] | select(.id == $MSG_ID)")
if [ ! -z "$FOUND" ]; then
  echo "   ✅ Message found in fetch response:"
  echo "$FOUND" | jq .
else
  echo "   ❌ Message NOT found in fetch"
fi
echo ""

# 5. Check database directly
echo "6️⃣ Checking database for message..."
DB_CHECK=$(sudo mysql -u root ianime -N -e "SELECT id, authorId, content FROM messages WHERE id=$MSG_ID;")
if [ ! -z "$DB_CHECK" ]; then
  echo "   ✅ Message in database:"
  echo "   $DB_CHECK"
else
  echo "   ❌ Message NOT in database"
fi
