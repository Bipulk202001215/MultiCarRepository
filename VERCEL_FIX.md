# Vercel Deployment Fixes

## Issues Fixed

### 1. SPA Routing (NOT_FOUND Error After Login)
**Problem**: After successful login, navigating to `/` or other routes resulted in "NOT_FOUND" error on Vercel.

**Root Cause**: The `vercel.json` rewrite rules weren't correctly configured to handle React Router (SPA) routing. Vercel was trying to find actual files for routes like `/`, `/jobs/board`, etc., instead of serving `index.html`.

**Fix**: Updated `vercel.json` with proper rewrite rules:
- Static files (with extensions) are served as-is
- All other routes (including `/`) are rewritten to `/index.html` for client-side routing
- API routes are automatically handled by Vercel's serverless functions (no rewrite needed)

**Files Changed**:
- `vercel.json` - Simplified and fixed rewrite rules

## Issues Fixed (Previous)

### 1. Request Body Parsing
**Problem**: Vercel's serverless functions may receive the request body in different formats (string, object, or Buffer), and the original code didn't handle all cases properly.

**Fix**: Added a `parseRequestBody` helper function that:
- Handles already-parsed objects
- Parses JSON strings
- Handles undefined/null bodies gracefully

### 2. CORS Preflight Handling
**Problem**: OPTIONS requests weren't handled before other processing, which could cause CORS issues.

**Fix**: Moved OPTIONS handling to the beginning of the handler with proper CORS headers.

### 3. Error Handling
**Problem**: Limited error logging made debugging difficult.

**Fix**: Added comprehensive logging for:
- Request details (method, URL, body presence)
- Forwarding details (URL, body length)
- Backend response details
- Error stack traces (in development mode)

### 4. Header Forwarding
**Problem**: Some important headers weren't being forwarded correctly.

**Fix**: Improved header forwarding to include:
- Content-Type (from request)
- Authorization
- X-Requested-With
- Response Content-Type from backend

## What to Check in Vercel

### 1. Environment Variables
Make sure `BACKEND_API_URL` is set in Vercel:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add/verify:
   - **Name**: `BACKEND_API_URL`
   - **Value**: `http://139.84.210.248:8080`
   - **Environment**: Production, Preview, Development (select all)
4. **Redeploy** after adding/updating

### 2. Serverless Function Logs
Check Vercel function logs to see what's happening:
1. Go to your deployment
2. Click on "Functions" tab
3. Click on the `api/[...path]` function
4. Check the logs for:
   - "API Proxy Request" - shows incoming request
   - "Proxying to" - shows backend URL being called
   - "Forwarding request" - shows request details
   - "Backend response" - shows response status
   - Any error messages

### 3. Network Tab in Browser
When testing on Vercel:
1. Open browser DevTools → Network tab
2. Try to login
3. Check the `/api/auth/login` request:
   - **Request URL**: Should be `https://your-app.vercel.app/api/auth/login`
   - **Request Method**: POST
   - **Request Payload**: Should show `{"emailId":"...","password":"..."}`
   - **Response**: Check status code and response body

### 4. Common Issues

#### Issue: 500 Internal Server Error
**Check**:
- Vercel function logs for error details
- `BACKEND_API_URL` environment variable is set
- Backend server is accessible from Vercel's servers (not blocked by firewall)

#### Issue: CORS Errors
**Should not happen** - The serverless function handles CORS. If you see CORS errors:
- Check that requests are going to `/api/*` (not directly to backend)
- Verify the serverless function is being called (check Vercel logs)

#### Issue: 404 Not Found on API Routes
**Problem**: Getting 404 when calling `/api/auth/login` or other API endpoints.

**Root Cause**: The catch-all rewrite rule in `vercel.json` was intercepting `/api/*` requests and rewriting them to `/index.html` before Vercel could route them to the serverless function.

**Fix**: Updated `vercel.json` to exclude `/api/*` from the catch-all rewrite:
```json
{
  "source": "/((?!api/).*)",
  "destination": "/index.html"
}
```

This ensures:
- `/api/*` routes go to serverless functions (no rewrite)
- All other routes go to `/index.html` for SPA routing

**Check**:
- The API route path is correct
- The serverless function is deployed (check Functions tab in Vercel dashboard)
- The `api/[...path].ts` file is in the repository
- The `vercel.json` rewrite rules exclude `/api/*` paths

#### Issue: Request Body is Empty
**Check**:
- Content-Type header is `application/json`
- Request body is being sent (check Network tab)
- Vercel logs show "hasBody: true"

## Testing Locally

You can test the serverless function locally using Vercel CLI:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Run the function locally
vercel dev
```

This will start a local server that mimics Vercel's environment.

## Deployment

After making changes:
1. Commit the changes
2. Push to your repository (if connected to Vercel)
3. Or deploy manually: `vercel --prod`

The serverless function will be automatically deployed with your frontend.
