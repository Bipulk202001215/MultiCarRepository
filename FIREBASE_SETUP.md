# Firebase Setup Guide

## Error: `auth/invalid-api-key`

This error occurs when Firebase environment variables are missing or incorrect. Follow these steps to fix it:

## Step 1: Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app, click **Add app** → **Web** (</> icon)
6. Copy the configuration values

## Step 2: Create `.env.local` File

Create a file named `.env.local` in the root directory of your project with the following content:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Important:** Replace all the placeholder values with your actual Firebase credentials.

## Step 3: Enable Email/Password Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Email/Password**
3. Enable the first toggle (Email/Password)
4. Click **Save**

## Step 4: Restart Your Development Server

After creating/updating `.env.local`:

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

## Example `.env.local` File

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-project-12345.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-project-12345
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-project-12345.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

## Troubleshooting

- **Make sure** the file is named exactly `.env.local` (not `.env.local.txt`)
- **Make sure** all variables start with `NEXT_PUBLIC_` (required for Next.js)
- **Restart** your dev server after creating/updating `.env.local`
- **Check** that there are no extra spaces or quotes around the values
- **Verify** your API key is correct in Firebase Console

## Security Note

The `.env.local` file is already in `.gitignore` and will not be committed to your repository. Never commit your Firebase credentials to version control.

