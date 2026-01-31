# Troubleshooting API Connection Issues

## Issue: Frontend not connecting to API server

If the API works via curl but not from the frontend, follow these steps:

### Step 1: Verify Environment Variable

1. **Check `.env.local` file**:
   ```bash
   cat .env.local
   ```
   
   Should show:
   ```
   VITE_API_BASE_URL=http://139.84.210.248:8080/api
   ```

2. **Restart your dev server** (IMPORTANT):
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```
   
   Vite only reads environment variables at startup, so you MUST restart after changing `.env.local`.

### Step 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these logs:
   - `API Request Debug:` - Shows what URL is being used
   - `🌐 API Request:` - Shows the full request details
   - Any error messages

4. **Check API Configuration**:
   In the browser console, type:
   ```javascript
   window.checkApiConfig()
   ```
   
   This will show:
   - Environment variable value
   - Runtime config value
   - Resolved URL being used

### Step 3: Common Issues

#### Issue: Still using localhost
**Solution**: 
- Make sure `.env.local` has the correct URL
- **Restart the dev server** (this is critical!)
- Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

#### Issue: CORS Error
**Error message**: `CORS Error: The API server at ... is not allowing requests from this origin`

**Solution**: 
- The backend needs to allow requests from `http://localhost:3001`
- Update backend CORS configuration to include:
  ```javascript
  origin: ['http://localhost:3001', 'http://localhost:3000']
  ```

#### Issue: Network Error / Cannot connect
**Error message**: `Cannot connect to API server at ...`

**Solution**:
- Verify the API server is running: `curl http://139.84.210.248:8080/api/auth/login`
- Check if the IP address is accessible from your network
- Verify firewall settings

#### Issue: 404 Not Found
**Error message**: `404 Not Found`

**Solution**:
- Check the URL in console - should be `http://139.84.210.248:8080/api/auth/login`
- Verify the endpoint path is correct
- Check if the API server is running the correct version

### Step 4: Debug Information

When reporting issues, include:
1. Browser console logs (especially `API Request Debug:`)
2. Network tab in DevTools (check the actual request URL)
3. Output of `window.checkApiConfig()` in console
4. Contents of `.env.local` (without sensitive data)

### Quick Test

Test the API directly from browser console:
```javascript
fetch('http://139.84.210.248:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailId: '24*7autonation@gmail.com', password: 'password123' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

If this works but the app doesn't, it's likely a CORS issue or the environment variable isn't being read correctly.

