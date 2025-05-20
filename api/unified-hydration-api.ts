import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { SessionManager } from './lib/session-manager.js';
import { UserProfileManager } from './lib/user-profile.js';
import { HydrationTools } from './lib/hydration-tools.js';
import { ToolLoop } from './lib/tool-loop.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Unified Hydration API Handler
 * Provides a single endpoint for all hydration-related functionality
 */
export default async function unifiedHydrationHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract authentication token from headers
    const token = req.headers.authorization?.split(' ')[1] || '';
    
    // Extract request parameters
    const { 
      message, 
      view_type = 'logs',  // logs, recommendations, or actions
      previous_response_id,
      location,
      reset_session = false
    } = req.body;
    
    // Step 1: Session Management
    let sessionId;
    let user;
    
    // Check if we have a previous response with session data
    if (previous_response_id && !reset_session) {
      sessionId = await SessionManager.getSessionFromPrevious(previous_response_id);
    }
    
    // If no session or reset requested, create/get a session
    if (!sessionId || reset_session) {
      const sessionData = await SessionManager.getOrCreateSession(token);
      user = sessionData.user;
      sessionId = sessionData.session.id;
    }
    
    // Ensure we have a user object
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }
    
    // Step 2: Get user profile and hydration data
    const userProfile = await UserProfileManager.getProfile(user.id);
    const hydrationNeeds = UserProfileManager.calculateHydrationNeeds(userProfile);
    
    // Step 3: Build system prompt based on view type
    let systemPrompt = '';
    
    if (view_type === 'logs') {
      systemPrompt = `You are a hydration assistant for The Water Bar. Help the user track their water intake.
      
Current hydration goals:
- Daily water intake: ${hydrationNeeds.dailyGoal}ml
- Electrolytes: ${hydrationNeeds.electrolytesGoal}mg
- Protein: ${hydrationNeeds.proteinGoal}g

When the user mentions drinking water or other beverages, use the log_water_intake tool to log it.
When the user asks about their status, use the get_hydration_status tool to check.
Focus on being helpful, conversational, and encouraging good hydration habits.`;
    } 
    else if (view_type === 'recommendations') {
      systemPrompt = `You are a hydration coach that provides personalized recommendations.
      
Analyze the user's hydration data and provide smart, contextual recommendations based on:
- Their current hydration status (use get_hydration_status)
- Their profile data (weight, activity level)
- Environmental factors (time of day, weather, location)

Generate recommendations that are specific, actionable, and personalized.
Each recommendation should include a clear title, description, and urgency level.
Use the get_recommendations tool to generate these suggestions.`;
    }
    else if (view_type === 'actions') {
      systemPrompt = `You are a hydration action planner that helps users execute on recommendations.
      
When the user selects a recommendation, you should:
- Acknowledge the selection
- Provide details about the selected action
- If it's a product, mention price and benefits
- If it's a venue, provide details about location and offerings
- If it's an activity, explain how to do it and the benefits

Always be encouraging and supportive of the user taking action on their hydration goals.`;
    }
    
    // Step 4: Call OpenAI Responses API
    const responseParams: any = {
      model: "gpt-4o",
      instructions: systemPrompt,
      input: message || "How can I help with your hydration today?",
      tools: HydrationTools.toolDefinitions,
      metadata: {
        user_id: user.id,
        session_id: sessionId,
        view_type,
        location
      }
    };
    
    // Add previous_response_id if it exists
    if (previous_response_id) {
      responseParams.previous_response_id = previous_response_id;
    }
    
    // Make the initial call to OpenAI
    const aiResponse = await openai.responses.create(responseParams);
    
    // Step 5: Process any tool calls
    const finalResponse = await ToolLoop.processToolCalls(aiResponse, {
      userId: user.id,
      sessionId: sessionId
    });
    
    // Step 6: Format and return the response
    let formattedResponse: any = {
      message: finalResponse.output_text,
      session_id: sessionId,
      response_id: finalResponse.id
    };
    
    // Try to parse JSON for structured views
    try {
      // Check if the response contains a JSON object
      const jsonMatch = finalResponse.output_text.match(/```json\n([\s\S]*?)\n```/) || 
                       finalResponse.output_text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonContent = jsonMatch[1] || jsonMatch[0];
        const parsedJson = JSON.parse(jsonContent);
        
        // Merge parsed JSON with response
        formattedResponse = {
          ...formattedResponse,
          ...parsedJson
        };
      }
    } catch (error) {
      console.error('Error parsing JSON from response:', error);
      // Continue with text-only response
    }
    
    // Add metadata for the frontend
    formattedResponse.metadata = {
      view_type,
      user_profile: {
        id: userProfile.id,
        weight_kg: userProfile.weight_kg,
        activity_level: userProfile.activity_level
      },
      hydration_needs: hydrationNeeds
    };
    
    // Return the response
    return res.status(200).json(formattedResponse);
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
