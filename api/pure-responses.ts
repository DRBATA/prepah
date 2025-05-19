// Improved OpenAI Responses API implementation for The Water Bar
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

export default async function handler(req: Request, res: Response) {
  // Get OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  
  try {
    // Get message from request
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }
    
    // Call OpenAI Responses API using the string input format
    // This is the simplest approach and works exactly like the playground
    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions: "You are a friendly greeter for The Water Bar. Respond with a warm greeting.",
      input: message  // Direct string input - OpenAI handles the formatting
    });
    
    // Return just the greeting text using the built-in output_text field
    return res.status(200).json({ 
      greeting: response.output_text || "Sorry, I couldn't generate a greeting."
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
