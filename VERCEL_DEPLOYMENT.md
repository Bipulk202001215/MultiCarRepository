# Vercel Deployment Guide

## API Configuration

The app uses a **Vercel serverless function** to proxy API requests to your backend. This eliminates CORS issues completely.

### How It Works

1. Frontend makes request to: `/api/auth/login`
2. Vercel serverless function (`api/[...path].ts`) intercepts it
3. Serverless function proxies to: `http://139.84.210.248:8080/api/auth/login`
4. Response is returned to frontend (same origin, no CORS!)

### Environment Variable (Optional)

You can customize the backend URL via environment variable:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `BACKEND_API_URL`
   - **Value**: `http://139.84.210.248:8080`
   - **Environment**: Production, Preview, Development (select all)
5. **Redeploy** your application

**Note**: If not set, it defaults to `http://139.84.210.248:8080`

## Current Behavior

The app automatically detects the deployment environment:
- **On Vercel**: Uses relative `/api` path → Serverless function proxies to backend
- **On VPS with Nginx**: Uses relative `/api` path → Nginx proxies to backend
- **Development**: Uses relative `/api` path → Vite proxy forwards to backend

**No CORS configuration needed!** The serverless function handles everything.

## Troubleshooting

### API calls going to Vercel domain instead of backend

**Problem**: API calls are going to `https://multi-car-repository.vercel.app/api/...` instead of your backend.

**Solution**: 
1. Set `VITE_API_BASE_URL` environment variable in Vercel
2. Redeploy the application
3. The app will detect Vercel and use the full backend URL

### CORS Errors

**Problem**: CORS errors when calling backend from Vercel.

**Solution**: Configure your backend to allow requests from your Vercel domain (see Option 2 above).

## Environment Variables in Vercel

To set environment variables:

1. **Via Dashboard**:
   - Project → Settings → Environment Variables
   - Add `VITE_API_BASE_URL` = `http://139.84.210.248:8080/api`

2. **Via CLI**:
   ```bash
   vercel env add VITE_API_BASE_URL
   # Enter: http://139.84.210.248:8080/api
   # Select: Production, Preview, Development
   ```

3. **After adding**: Redeploy your application for changes to take effect.
