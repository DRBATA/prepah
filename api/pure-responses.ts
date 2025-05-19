// Improved OpenAI Responses API implementation for The Water Bar
// Using pure ES Module syntax
import OpenAI from 'openai';

// Simple type definitions to avoid dependencies
interface Request {
  body: any;
  method?: string;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
}

// Export as a named function for ESM compatibility
export default async function handler(req: Request, res: Response) {
  try {
    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Missing API key in environment variables');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Get message from request
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Missing message in request body' });
    }
    
    // Call OpenAI Responses API using the direct string input format
    // This is the simplest and most reliable approach
    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions: "You are a friendly greeter for The Water Bar. Respond with a warm greeting.",
      input: message  // Direct string input - OpenAI handles the formatting
    });
    
    // Log the response structure for debugging
    console.log('Response from OpenAI:', JSON.stringify(response, null, 2));
    
    // Return just the greeting text using the built-in output_text field
    return res.status(200).json({ 
      greeting: response.output_text || "Sorry, I couldn't generate a greeting."
    });
    
  } catch (error) {
    // Comprehensive error logging
    console.error('Error in API handler:', error);
    
    // Detailed error response
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
