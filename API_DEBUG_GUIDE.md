# Debugging Role Permissions API

## The API Call

The role permissions API is called automatically after login:
- **Endpoint**: `GET {{api_base}}/role-permissions/role/{{roleId}}`
- **When**: After successful login, if `roleId` exists in login response
- **Function**: `getRolePermissions(roleId)` in `src/lib/apiClient.ts`

## Troubleshooting

### 1. Check if roleId exists in login response

Open browser console and check:
- After login, look for: `"Fetching role permissions for roleId: ..."`
- If you see: `"No roleId in login response"` → Your login API doesn't return roleId

**Solution**: Update your login API to include `roleId` in the response, OR fetch roleId from a different endpoint.

### 2. Check the API Request

Look in browser console for:
```
API Request: {
  method: 'GET',
  url: 'http://localhost:8080/role-permissions/role/{roleId}',
  ...
}
```

**Verify**:
- The URL is correct
- The roleId is not empty or undefined
- The base URL matches your API server

### 3. Common Errors

**CORS Error**:
```
Access to fetch at 'http://localhost:8080/...' has been blocked by CORS policy
```
→ Fix CORS in your backend (see CORS_SOLUTION.md)

**404 Not Found**:
```
❌ 404 Not Found: ...
```
→ Check if the endpoint path is correct: `/role-permissions/role/{roleId}`
→ Verify roleId is correct

**401 Unauthorized**:
→ Token might not be included or expired
→ Check if Authorization header is being sent

**Network Error**:
```
POST http://localhost:8080/role-permissions/role/... net::ERR_FAILED
```
→ Backend server is not running or not accessible
→ Check if API server is running on port 8080

### 4. Check Response Format

The API should return:
```json
{
  "roleId": "string",
  "roleName": "string (optional)",
  "permissions": [
    {
      "permissionId": "string",
      "permissionName": "INVENTORY_MANAGEMENT" // or other permission names
    }
  ]
}
```

If your API returns a different format, update the `RolePermissionResponse` interface in `src/lib/apiClient.ts` and the mapping code in `src/contexts/AuthContext.tsx`.

### 5. Manual Testing

Test the API directly:
```bash
curl -X GET "http://localhost:8080/role-permissions/role/YOUR_ROLE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Replace `YOUR_ROLE_ID` with an actual roleId from your system.

## Next Steps

1. Open browser console (F12)
2. Try logging in
3. Check console logs for error messages
4. Share the error message or console logs for further help

