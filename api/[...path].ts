import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://139.84.210.248:8080';

// Helper to parse request body
function parseRequestBody(req: VercelRequest): any {
  // If body is already an object, return it
  if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  
  // If body is a string, try to parse it
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return req.body;
    }
  }
  
  // If body is undefined or null, return undefined
  return req.body;
}

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
    hasBody: !!req.body,
    contentType: req.headers['content-type'],
  });

  // Handle OPTIONS request (CORS preflight) first
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

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
    // Prepare request body
    let requestBody: string | undefined = undefined;
    const contentType = req.headers['content-type'] || 'application/json';
    
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      const parsedBody = parseRequestBody(req);
      if (parsedBody !== undefined && parsedBody !== null) {
        // If it's already a string and looks like JSON, use it as-is
        if (typeof parsedBody === 'string' && parsedBody.trim().startsWith('{')) {
          requestBody = parsedBody;
        } else {
          // Otherwise, stringify it
          requestBody = JSON.stringify(parsedBody);
        }
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Forward other important headers
    if (req.headers['x-requested-with']) {
      headers['X-Requested-With'] = req.headers['x-requested-with'] as string;
    }

    console.log('Forwarding request:', {
      method: req.method,
      url: fullUrl,
      hasBody: !!requestBody,
      bodyLength: requestBody?.length || 0,
    });

    // Forward the request to the backend
    const response = await fetch(fullUrl, {
      method: req.method,
      headers,
      body: requestBody,
    });

    // Get response data
    const data = await response.text();
    let jsonData: any;
    try {
      jsonData = JSON.parse(data);
    } catch {
      // If not JSON, return as text
      jsonData = data;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Forward response headers that might be useful
    const contentTypeHeader = response.headers.get('content-type');
    if (contentTypeHeader) {
      res.setHeader('Content-Type', contentTypeHeader);
    }

    console.log('Backend response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: contentTypeHeader,
    });

    // Forward the response
    res.status(response.status).json(jsonData);
  } catch (error: any) {
    console.error('Proxy error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      url: fullUrl,
    });
    
    // Set CORS headers even on error
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message || 'Failed to proxy request to backend',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
