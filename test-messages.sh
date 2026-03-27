#!/bin/bash

echo "=== Message Persistence & Real-Time Test ==="
echo ""

# Get existing user for testing
curl -s -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tuni@gmail.com","password":"password123"}' > /tmp/login.json

USER_ID=$(jq -r '.user.id' /tmp/login.json)
TOKEN=$(jq -r '.token' /tmp/login.json)

echo "1️⃣ Logged in as user ID: $USER_ID"
echo "   Token: $(echo $TOKEN | cut -c1-40)..."
echo ""

# Get first channel
CHANNELS=$(curl -s "/api/v1/channels" 2>/dev/null || echo '{"channels":[]}')
CHANNEL_ID=$(curl -s "http://localhost:5000/api/v1/communities" | jq -r '.communities[0].channelGroups[0] // 1')

echo "2️⃣ Using channel/first channel group ID: $CHANNEL_ID"
echo ""

# Step 1: Check initial message count in database
echo "3️⃣ Initial database state..."
INITIAL_COUNT=$(sudo mysql -u root ianime -N -e "SELECT COUNT(*) FROM messages LIMIT 1;")
echo "   Messages in DB: $INITIAL_COUNT"
echo ""

# Step 2: Try to send a message
echo "4️⃣ Sending test message via HTTP..."
MSG_CONTENT="Test message from API $(date +%s%N)"

SEND_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/v1/channels/1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"content\":\"$MSG_CONTENT\"}")

echo "   Response: $SEND_RESPONSE"
MSG_ID=$(echo "$SEND_RESPONSE" | jq -r '.message.id // empty')
echo "   Message ID: $MSG_ID"
echo ""

# Step 3: Check if persisted to database
echo "5️⃣ Checking database..."
if [ ! -z "$MSG_ID" ]; then
  DB_MSG=$(sudo mysql -u root ianime -N -e "SELECT COUNT(*) FROM messages WHERE id=$MSG_ID;")
  if [ "$DB_MSG" -eq 1 ]; then
    echo "   ✅ Message persisted to database (ID: $MSG_ID)"
  else
    echo "   ❌ Message NOT in database"
  fi
else
  echo "   ❌ No message ID in response"
fi

# Step 4: Check total count
FINAL_COUNT=$(sudo mysql -u root ianime -N -e "SELECT COUNT(*) FROM messages;")
echo "   Total messages now: $FINAL_COUNT"
echo ""

# Step 5: Try fetching messages for channel
echo "6️⃣ Fetching messages from channel 1..."
FETCH=$(curl -s "http://localhost:5000/api/v1/channels/1/messages?limit=1" \
  -H "Authorization: Bearer $TOKEN")

FETCH_COUNT=$(echo "$FETCH" | jq '.messages | length')
echo "   Messages returned: $FETCH_COUNT"
echo ""

echo "=== Summary ==="
if [ ! -z "$MSG_ID" ] && [ "$DB_MSG" -eq 1 ]; then
  echo "✅ Message creation works - saved to DB"
else
  echo "❌ Message creation failed"
fi

if [ "$FETCH_COUNT" -ge 1 ]; then
  echo "✅ Message fetching works"
else
  echo "❌ Message fetching might have issues"
fi
