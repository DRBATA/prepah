import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple system prompt
const SYSTEM_PROMPT = `You are a friendly hydration coach at The Water Bar. 
Your role is to help users track and optimize their hydration throughout the day.

When greeting a user:
1. Always start with a warm, friendly welcome
2. Express enthusiasm about helping them with their hydration journey
3. Keep your initial greeting brief and engaging

When a user asks about hydration:
1. Provide helpful tips about staying hydrated
2. Be encouraging and positive
3. Suggest drinking water regularly throughout the day

Remember: You are here to make hydration tracking fun and effective!`;

export async function POST(request: Request): Promise<Response> {
  try {
    console.log('POST request received');
    const { userId, message }: { userId: string; message?: string } = await request.json();
    console.log('Request data:', { userId, message: message || 'Welcome message' });
    
    // Create a simple chat completion instead of using the Responses API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Using a reliable model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message || 'Welcome to The Water Bar' }
      ],
      max_tokens: 300
    });
    
    console.log('OpenAI response received');
    
    // Extract the assistant's message
    const assistantMessage = completion.choices[0]?.message?.content || 'Welcome to The Water Bar!';
    
    // Return a simple JSON response
    return new Response(
      JSON.stringify({
        message: assistantMessage,
        response_id: completion.id
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in POST handler:', error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Sorry, I had trouble responding. Please try again.'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
