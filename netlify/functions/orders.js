// netlify/functions/orders.js

/**
 * Netlify serverless function to proxy requests to TripleWhale API
 * @param {Object} event - Netlify function event object
 * @param {Object} context - Netlify function context
 * @returns {Object} Response object
 */
export async function handler(event, context) {
  // Common headers for all responses
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }
  
  // Check request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse request body
    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Validate required fields
    if (!payload.order_id || !payload.customer || !payload.order_revenue) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields in payload' })
      };
    }

    // Get API key from environment variables
    const apiKey = process.env.TRIPLEWHALE_API_KEY;
    if (!apiKey) {
      console.error('TRIPLEWHALE_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'API key configuration error' })
      };
    }

    // Add request ID for logging/tracing
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`[${requestId}] Processing order: ${payload.order_id}`);

    // Make API request to TripleWhale
    const triplewhaleUrl = 'https://api.triplewhale.com/api/v2/data-in/orders';
    
    try {
      const apiRes = await fetch(triplewhaleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-request-id': requestId
        },
        body: JSON.stringify(payload)
      });

      // Read raw response text
      const text = await apiRes.text();
      
      // Parse response
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch (jsonError) {
        console.warn(`[${requestId}] Non-JSON response from TripleWhale:`, text);
        parsed = { raw: text };
      }

      console.log(`[${requestId}] TripleWhale API responded with status: ${apiRes.status}`);
      
      // Return response to client
      return {
        statusCode: apiRes.status,
        headers: corsHeaders,
        body: JSON.stringify({
          ...parsed,
          request_id: requestId
        })
      };
    } catch (fetchError) {
      console.error(`[${requestId}] Error calling TripleWhale API:`, fetchError);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Error communicating with TripleWhale API',
          message: fetchError.message,
          request_id: requestId
        })
      };
    }
  } catch (err) {
    console.error('Unhandled error in orders function:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: err.message
      })
    };
  }
}
