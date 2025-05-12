// netlify/functions/orders.js

/**
 * Netlify serverless function to proxy requests to TripleWhale API
 */
export async function handler(event, context) {
  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed', method: event.httpMethod })
    };
  }

  try {
    // Parse request body
    let payload;
    try {
      console.log('Received body:', event.body);
      payload = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          rawBody: event.body
        })
      };
    }

    // Log the received payload
    console.log('Parsed payload:', JSON.stringify(payload));

    // Get API key from environment variables
    // This should match the API key you've verified works: e860ed38-27b3-49f8-b855-e8a63a75e625
    const apiKey = process.env.TRIPLEWHALE_API_KEY;
    
    // Log the API key length to verify it exists (don't log the actual key for security)
    console.log('API key length:', apiKey ? apiKey.length : 'not set');
    
    if (!apiKey) {
      console.error('TRIPLEWHALE_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key configuration error' })
      };
    }

    // Make API request to TripleWhale using the exact format that works for you
    const triplewhaleUrl = 'https://api.triplewhale.com/api/v2/data-in/orders';
    
    // Use the same headers and options that work in your direct API call
    const options = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    };
    
    console.log('Calling TripleWhale API with options:', {
      url: triplewhaleUrl,
      method: options.method,
      headers: { ...options.headers, 'x-api-key': '[REDACTED]' },
      bodyLength: options.body.length
    });
    
    try {
      const response = await fetch(triplewhaleUrl, options);
      
      // Get status code
      const status = response.status;
      console.log('TripleWhale API responded with status:', status);
      
      // Try to get response as text first (more reliable)
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Try to parse as JSON if possible
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (jsonError) {
        console.warn('Non-JSON response from TripleWhale:', responseText);
        responseData = { raw: responseText };
      }
      
      // Return response to client
      return {
        statusCode: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triplewhale_response: responseData,
          success: status >= 200 && status < 300
        })
      };
    } catch (fetchError) {
      console.error('Error calling TripleWhale API:', fetchError);
      return {
        statusCode: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Error communicating with TripleWhale API',
          message: fetchError.message
        })
      };
    }
  } catch (err) {
    console.error('Unhandled error in orders function:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: err.message
      })
    };
  }
}
