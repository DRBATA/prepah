import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  'https://hmwrlhepsmyvqwkfleck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc'
);

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ProfileData {
  id: string;
  weight?: number;
  bodyType?: string;
  [key: string]: any;
}

async function getProfile(userId: string): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

async function updateProfile(userId: string, updates: Partial<ProfileData>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

const SYSTEM_PROMPT = `You are a health and hydration advisor integrated with a user profile system. Follow these rules:

1. If this is a new chat session, always:
   - Greet the user warmly
   - Ask for their weight and body type if not provided
   - Explain why this information is important for hydration advice

2. When weight or body type is provided:
   - Update the user's profile in the database
   - Thank them and explain how this helps personalize advice

3. For all interactions:
   - Give personalized hydration advice based on their profile
   - Be friendly and encouraging
   - Use scientific backing for recommendations
   - Keep responses clear and actionable

You have these tools available:
- updateProfile: Updates user profile with weight and body type
- getProfile: Gets current user profile data

Always maintain context and refer back to previous profile information when relevant.`;

export async function POST(request: Request): Promise<Response> {
  try {
    const { messages, userId }: { messages: ChatMessage[]; userId: string } = await request.json();
    
    // Get current profile data
    let profile = null;
    try {
      profile = await getProfile(userId);
    } catch (e) {
      console.log('No profile found, will create one if needed');
    }

    // Create stream
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    });

    // Create a ReadableStream that emits SSE data
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Send each chunk as an SSE event
              controller.enqueue(`data: ${JSON.stringify({ content })}\\n\\n`);
            }
          }
          // End of stream
          controller.close();
        } catch (error) {
          console.error('Error in streaming loop:', error);
          controller.error(error);
        }
      }
    });

    // Return the stream as SSE
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error in POST handler:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
