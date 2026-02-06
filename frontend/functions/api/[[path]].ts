// Cloudflare Pages Function to proxy API requests to Render backend
// This handles all requests to /api/*

const BACKEND_URL = 'https://fitness-backend-latest-2.onrender.com';

export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);

  // Construct the backend URL
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  // Forward the request to the backend
  // CRITICAL: Use request.body directly to preserve binary data (e.g., image uploads)
  // Using request.text() would corrupt multipart/form-data by treating binary as UTF-8
  const modifiedRequest = new Request(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
  });

  try {
    // Make the request to the backend
    const response = await fetch(modifiedRequest);

    // Create a new response with CORS headers
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });

    // Add CORS headers
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return modifiedResponse;
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to proxy request to backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
