import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface SessionData {
  id: string;
  user_id: string;
  start_at: string;
  end_at?: string | null;
  weight_kg?: number | null;
}

export interface UserData {
  id: string;
  email?: string;
}

/**
 * Manages user authentication and session management
 */
export const SessionManager = {
  /**
   * Authenticate user from token and get current session
   */
  async getOrCreateSession(token: string): Promise<{ user: UserData; session: SessionData }> {
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Get user profile for personalization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
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
    
    if (existingSession) {
      return { 
        user: { id: user.id, email: user.email }, 
        session: existingSession 
      };
    }
    
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
    
    if (!newSession) {
      throw new Error('Failed to create session');
    }
    
    return { 
      user: { id: user.id, email: user.email }, 
      session: newSession 
    };
  },
  
  /**
   * Get session from previous response metadata
   */
  async getSessionFromPrevious(previousResponseId: string): Promise<string | undefined> {
    // This would call the OpenAI API to retrieve the previous response
    // and extract the session_id from its metadata
    // For now, we'll return undefined and let the main handler
    // use getOrCreateSession instead
    return undefined;
  },
  
  /**
   * End current session
   */
  async endSession(sessionId: string): Promise<void> {
    await supabase
      .from('sessions')
      .update({ end_at: new Date().toISOString() })
      .eq('id', sessionId);
  }
};

export default SessionManager;
