import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://139.84.210.248:8080';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Log the request for debugging
  console.log('API Proxy Request:', {
    method: req.method,
    url: req.url,
    query: req.query,
    path: req.query.path,
  });

  // Get the API path from the request
  // The path comes from the catch-all route [...path]
  const path = Array.isArray(req.query.path) 
    ? req.query.path.join('/') 
    : (req.query.path as string) || '';

  // Construct the backend URL (path already includes the endpoint like "auth/login")
  const backendUrl = `${BACKEND_URL}/api/${path}`;
  
  console.log('Proxying to:', backendUrl);

  // Forward query parameters (excluding 'path' which is part of the route)
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path' && value) {
      queryParams[key] = Array.isArray(value) ? value[0] : value as string;
    }
  }
  const queryString = new URLSearchParams(queryParams).toString();
  const fullUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

  try {
    // Forward the request to the backend
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
        // Forward other headers if needed
        ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? JSON.stringify(req.body) 
        : undefined,
    });

    // Get response data
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request (CORS preflight)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Forward the response
    res.status(response.status).json(jsonData);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}
