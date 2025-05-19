// Session-based Dashboard API for The Water Bar
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
    
    // Get message from request (optional - for custom dashboard requests)
    const { message } = req.body;
    
    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('weight_kg')
      .eq('id', user.id)
      .single();
    
    // Get active session
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('end_at', null)
      .gte('start_at', oneDayAgo.toISOString())
      .order('start_at', { ascending: false })
      .limit(1)
      .single();
    
    // Get conversation for the session
    let previous_response_id;
    if (activeSession) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('last_resp')
        .eq('user_id', user.id)
        .eq('session_id', activeSession.id)
        .single();
      
      previous_response_id = convo?.last_resp;
    }
    
    // Default dashboard query if no message provided
    const dashboardQuery = message || "Generate a dashboard summary of my current hydration status. Include my progress, recommendations, and next steps.";
    
    // Call OpenAI Responses API
    const aiParams: any = {
      model: "gpt-4o",
      instructions: `You are a hydration coach. Respond with a JSON object in this exact shape:
      {
        "hydrationPercentage": number, // 0-100 showing overall hydration based on session
        "timeRemaining": string, // Time remaining in current session (e.g. "12h 30m")
        "recommendedIntake": number, // Recommended ml to drink now
        "todaySummary": string, // Brief summary of today's hydration
        "recentEvents": [
          {
            "time": string, // e.g. "10:30 AM"
            "message": string // e.g. "Drank 250ml water"
          }
        ],
        "aiMessage": string // Personalized message for the user
      }`,
      input: dashboardQuery,
      response_format: { type: "json_object" }
    };
    
    // Only add previous_response_id if it exists
    if (previous_response_id) {
      aiParams.previous_response_id = previous_response_id;
    }
    
    const ai = await openai.responses.create(aiParams);
    
    // Parse the JSON response
    try {
      // First, attempt to parse as JSON
      const jsonResponse = JSON.parse(ai.output_text);
      
      // Add session details to the response
      return res.status(200).json({
        ...jsonResponse,
        sessionId: activeSession?.id,
        sessionStarted: activeSession?.start_at,
        sessionEndsAt: activeSession ? new Date(new Date(activeSession.start_at).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
        response_id: ai.id
      });
    } catch (e) {
      // If parsing fails, return the raw text
      return res.status(200).json({
        error: "Failed to parse AI response as JSON",
        message: ai.output_text,
        sessionId: activeSession?.id,
        sessionStarted: activeSession?.start_at,
        sessionEndsAt: activeSession ? new Date(new Date(activeSession.start_at).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
        response_id: ai.id
      });
    }
    
  } catch (error) {
    // Comprehensive error logging
    console.error('Error in dashboard API handler:', error);
    
    // Detailed error response
    return res.status(500).json({ 
      error: 'Failed to process dashboard request',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
