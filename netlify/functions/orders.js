// netlify/functions/debug.js

export async function handler(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Check for API key
  const apiKey = process.env.TRIPLEWHALE_API_KEY || 'NOT_SET';
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: "Debug function is working!",
      timestamp: new Date().toISOString(),
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
        headers: event.headers,
        queryStringParameters: event.queryStringParameters,
        body: event.body ? '(body received)' : '(no body)'
      },
      environment: {
        apiKeySet: apiKey !== 'NOT_SET',
        apiKeyLength: apiKey.length,
        nodeVersion: process.version,
        netlifyFunctionVersion: context.functionVersion
      }
    })
  };
}
