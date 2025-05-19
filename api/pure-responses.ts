// Session-based OpenAI Responses API implementation for The Water Bar
// Using pure ES Module syntax
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Simple type definitions to avoid dependencies
interface Request {
  body: any;
  headers?: any;
  method?: string;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
}

interface UserSession {
  id: string;
  user_id: string;
  start_at: string;
  end_at?: string | null;
  weight_kg?: number | null;
  created_at: string;
}

interface Conversation {
  user_id: string;
  session_id: string;
  last_resp?: string | null;
  updated_at: string;
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Export as a named function for ESM compatibility
export default async function handler(req: Request, res: Response) {
  try {
    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Missing API key in environment variables');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }

    // Get auth token from headers
    const token = req.headers?.authorization?.split(' ')[1] || '';
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Get message and resetSession flag from request
    const { message, resetSession } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Missing message in request body' });
    }
    
    // Get user profile for weight data
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('weight_kg')
      .eq('id', user.id)
      .single();
    
    // Handle session management
    let session_id: string | undefined;
    let previous_response_id: string | undefined;
    
    // If resetSession is true, end the current session and create a new one
    if (resetSession) {
      // End current session if it exists
      await supabase
        .from('sessions')
        .update({ end_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('end_at', null);
      
      // Clear conversation state
      await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);
      
      // Create new session
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          start_at: new Date().toISOString(),
          weight_kg: userProfile?.weight_kg || null
        })
        .select()
        .single();
      
      session_id = newSession?.id;
    } else {
      // Check for existing active session within the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('end_at', null)
        .gte('start_at', oneDayAgo.toISOString())
        .order('start_at', { ascending: false })
        .limit(1)
        .single();
      
      // Get existing conversation state
      const { data: convo } = await supabase
        .from('conversations')
        .select('last_resp, session_id')
        .eq('user_id', user.id)
        .single();
      
      previous_response_id = convo?.last_resp;
      
      // If we have an existing session, use it
      if (existingSession) {
        session_id = existingSession.id;
      } 
      // If we have a conversation with a session, but the session is expired, create a new one
      else if (convo?.session_id) {
        // Create new session
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            start_at: new Date().toISOString(),
            weight_kg: userProfile?.weight_kg || null
          })
          .select()
          .single();
        
        session_id = newSession?.id;
      }
      // If no session exists, create one
      else {
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            start_at: new Date().toISOString(),
            weight_kg: userProfile?.weight_kg || null
          })
          .select()
          .single();
        
        session_id = newSession?.id;
      }
    }
    
    // Call OpenAI Responses API
    const responseParams: any = {
      model: "gpt-4o",
      instructions: "You are a hydration coach for The Water Bar. Help users track their water intake and provide personalized hydration advice.",
      input: message,
      metadata: {
        session_id,
        user_id: user.id
      }
    };
    
    // Only add previous_response_id if it exists
    if (previous_response_id) {
      responseParams.previous_response_id = previous_response_id;
    }
    
    const response = await openai.responses.create(responseParams);
    
    // Update conversation state
    await supabase.from('conversations').upsert({
      user_id: user.id,
      session_id,
      last_resp: response.id,
      updated_at: new Date().toISOString()
    });
    
    // Return response
    return res.status(200).json({ 
      message: response.output_text || "Sorry, I couldn't generate a response.",
      session_id,
      response_id: response.id
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
