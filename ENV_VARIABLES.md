# Environment Variables Guide

## Vite Environment Variables

In Vite, environment variables work differently than Next.js:

### Key Differences:
1. **Prefix**: Must use `VITE_` prefix (not `NEXT_PUBLIC_`)
2. **Access**: Use `import.meta.env.VITE_*` (not `process.env.NEXT_PUBLIC_*`)
3. **File**: Use `.env.local` (same as Next.js)

### Setup

1. **Create/Update `.env.local` file:**
   ```env
   # API Configuration
   VITE_API_BASE_URL=http://139.84.210.248:8080/api
   
   # Firebase (temporary - will be removed)
   VITE_FIREBASE_API_KEY=your_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

2. **Access in code:**
   ```typescript
   // ✅ Correct (Vite)
   const apiUrl = import.meta.env.VITE_API_BASE_URL;
   
   // ❌ Wrong (Next.js - won't work)
   const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
   ```

3. **Restart dev server** after changing `.env.local`

### Available Environment Variables:

- `import.meta.env.MODE` - The mode the app is running in
- `import.meta.env.DEV` - true in development
- `import.meta.env.PROD` - true in production
- `import.meta.env.VITE_*` - Your custom variables

### Migration from Next.js

If you had `.env.local` with Next.js variables, update them:
- `NEXT_PUBLIC_API_BASE_URL` → `VITE_API_BASE_URL`
- `NEXT_PUBLIC_FIREBASE_*` → `VITE_FIREBASE_*`

Note: The `VITE_` prefix is required for security - only variables with this prefix are exposed to the client.

