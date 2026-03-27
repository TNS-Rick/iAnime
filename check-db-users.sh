#!/bin/bash

echo "=== Checking users in database ==="
sudo mysql -u root ianime -e "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "=== Last 5 users created ==="
sudo mysql -u root ianime -e "SELECT id, email, username, createdAt FROM users ORDER BY createdAt DESC LIMIT 5;"

echo ""
echo "=== Testing registration ==="

# Create a test user
TEST_EMAIL="regression_test_$(date +%s)@test.com"
TEST_USER="regtest_$(date +%s)"
TEST_PASS="password123"

echo "Registering user: $TEST_USER ($TEST_EMAIL)"

RESPONSE=$(curl -s -X POST "http://localhost:5000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

echo "API Response:"
echo "$RESPONSE"

echo ""
echo "=== Checking if user was saved to database ==="
sudo mysql -u root ianime -e "SELECT id, email, username, createdAt FROM users WHERE email='$TEST_EMAIL';"
