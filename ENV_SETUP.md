# Environment Variables Setup

## Important: API Base URL Configuration

Your API base URL should be set in `.env.local` as:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

**Note**: Include `/api` in the base URL if your backend API routes are prefixed with `/api`.

## How It Works

The code constructs the full URL as:
- Base URL: `http://localhost:8080/api` (from `VITE_API_BASE_URL`)
- Endpoint: `/role-permissions/role/{roleId}`
- Final URL: `http://localhost:8080/api/role-permissions/role/{roleId}` ✅

## Example `.env.local` File

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api

# Firebase (temporary - will be removed)
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## After Updating `.env.local`

1. **Restart your dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Verify in browser console**:
   - After login, check the console for: `API Request: { url: 'http://localhost:8080/api/role-permissions/role/...' }`
   - The URL should include `/api` in the path

## Troubleshooting

If the API still doesn't work:
1. Check browser console for the exact URL being called
2. Verify the URL matches your backend endpoint
3. Check for CORS errors
4. Verify your backend is running on port 8080

