// Update to pure-responses.ts to match OpenAI playground behavior
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
    
    // Call OpenAI Responses API
    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions: "You are a friendly greeter. Respond with a warm greeting.",
      input: [{
        role: "user",
        content: message
      }]
    });
    
    // Use type assertion to safely access the response structure
    // Based on the PowerShell test, we know the structure has output[0] with a content array
    const responseData = response as any;
    
    // Log the full structure to help with debugging
    console.log('Response structure:', JSON.stringify(responseData, null, 2));
    
    // Extract text from the proper path in the response
    let responseText = "Sorry, I couldn't generate a greeting.";
    
    // If the output exists and has a message with content, extract the text
    if (responseData.output && 
        responseData.output[0] && 
        responseData.output[0].content && 
        responseData.output[0].content.length > 0) {
      responseText = responseData.output[0].content[0].text || responseText;
    }
    
    // Return just the greeting text directly
    return res.status(200).json({ 
      greeting: responseText
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}