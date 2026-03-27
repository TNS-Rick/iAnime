# Edge Case Testing Results & Issues Found

## Summary: 42/52 tests passed, 10 issues identified

### 🔴 CRITICAL Issues (Need Fixes)

1. **Block non-existent user** (Status: 200 instead of 404)
   - API silently succeeds when blocking user that doesn't exist
   - Location: `server/api/communityEndpointsV2.js` - POST /v1/users/:id/block
   - Fix: Verify user exists before blocking

2. **Block same user twice** (Status: 200 instead of 400)
   - API allows blocking an already-blocked user
   - Location: `server/api/communityEndpointsV2.js` - POST /v1/users/:id/block
   - Fix: Check if user already blocked

3. **Unblock non-existent user** (Status: 200 instead of 404)
   - API silently succeeds when unblocking non-existent user
   - Location: `server/api/communityEndpointsV2.js` - DELETE /v1/users/:id/block
   - Fix: Verify user exists before unblocking

4. **Get messages from non-existent channel** (Status: 200 instead of 404)
   - API returns empty array instead of error for invalid channel
   - Location: `server/api/communityEndpointsV2.js` - GET /v1/channels/:id/messages
   - Fix: Validate channel exists first

5. **Update profile with invalid theme** (Status: 500 error)
   - Crashes instead of validating theme value
   - Location: `server/api/communityEndpointsV2.js` - PUT /v1/auth/profile
   - Fix: Validate theme is one of: dark, light, auto

6. **Invalid password length validation** (Status: 200 for short password)
   - Accepts password shorter than 8 characters
   - Location: `server/api/authEndpoints.js` - POST /v1/auth/change-password
   - Fix: Validate newPassword.length >= 8

### ⚠️ MEDIUM Issues (Should Improve)

7. **Block/Unblock user data validation**
   - Should verify userId is a number not string
   - May silently fail on type mismatch

8. **Search without token** (Status: 200, returns public results)
   - Might be intentional for public search, verify requirements

9. **Missing Content-Type header** (Status: 201, accepts registration)
   - API accepts request without Content-Type header
   - Should require Content-Type: application/json

### ℹ️ LOW Priority (Working as Designed)

10. **Search with single character** 
    - Correctly rejects queries < 2 characters (validation working)

---

## Test Coverage Summary

### Pass Rate by Category
- ✅ Authentication: 7/7 (100%)
- ✅ Communities: 7/7 (100%)
- ⚠️ Messages: 5/6 (83%) - 1 validation issue
- ✅ Friendships: 8/8 (100%)
- ❌ User Blocking: 3/6 (50%) - 3 validation issues
- ⚠️ User Search: 4/5 (80%) - token/validation questions
- ⚠️ Settings: 5/8 (63%) - 3 validation issues
- ✅ Type/Format: 5/6 (83%)

### Critical Endpoints Needing Fixes
1. `POST /v1/users/:id/block` - Add existence + duplicate check
2. `DELETE /v1/users/:id/block` - Add existence check
3. `GET /v1/channels/:id/messages` - Add channel existence check
4. `PUT /v1/auth/profile` - Add theme validation
5. `POST /v1/auth/change-password` - Add password length validation

### Next Steps
1. Fix blocking endpoints with proper validation
2. Fix message fetch with channel verification
3. Fix settings validation
4. Add input validation helpers to prevent repeating issues
