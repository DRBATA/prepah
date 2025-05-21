import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Function definitions for the Responses API
const hydrationFunctions = [
  {
    name: "query_user_profile",
    description: "Access user profile information including name, weight, body type, and check if any information is missing.",
    parameters: {
      type: "object",
      required: ["user_id"],
      properties: {
        user_id: {
          type: "string",
          description: "Unique identifier for the user"
        }
      }
    }
  },
  {
    name: "update_user_profile",
    description: "Update user profile with missing information such as weight or body type.",
    parameters: {
      type: "object",
      required: ["user_id"],
      properties: {
        user_id: {
          type: "string",
          description: "Unique identifier for the user"
        },
        weight_kg: {
          type: "number",
          description: "User's weight in kilograms"
        },
        body_type: {
          type: "string",
          description: "User's body type (e.g., 'athletic', 'average', 'sedentary')"
        }
      }
    }
  }
];

// Tool implementation
async function queryUserProfile(args: { user_id: string }) {
  const { user_id } = args;
  
  try {
    // Query the user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();
    
    if (error) throw error;
    
    // Check for missing information
    const missingInfo = [];
    if (!profile.weight_kg) missingInfo.push('weight_kg');
    if (!profile.body_type) missingInfo.push('body_type');
    
    return {
      user_id: profile.id,
      name: profile.name || profile.email || 'User',
      weight_kg: profile.weight_kg,
      body_type: profile.body_type,
      missing_info: missingInfo,
      has_complete_profile: missingInfo.length === 0
    };
  } catch (error) {
    console.error('Error querying user profile:', error);
    return {
      user_id,
      name: 'User',
      weight_kg: null,
      body_type: null,
      missing_info: ['weight_kg', 'body_type'],
      has_complete_profile: false,
      error: error instanceof Error ? error.message : 'Unknown error querying profile'
    };
  }
}

// Tool implementation for updating user profile
async function updateUserProfile(args: { user_id: string; weight_kg?: number; body_type?: string }) {
  const { user_id, weight_kg, body_type } = args;
  
  try {
    // Prepare update data
    const updateData: any = {};
    if (weight_kg) updateData.weight_kg = weight_kg;
    if (body_type) updateData.body_type = body_type;
    
    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user_id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      user_id: data.id,
      updated_fields: Object.keys(updateData),
      current_profile: {
        weight_kg: data.weight_kg,
        body_type: data.body_type
      }
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      user_id,
      error: error instanceof Error ? error.message : 'Unknown error updating profile'
    };
  }
}

const SYSTEM_PROMPT = `# Identity
You are a friendly hydration coach at The Water Bar. Your role is to help users track and optimize their hydration throughout the day.

# Instructions
## TOOL CALLING
You MUST use the query_user_profile tool immediately when greeting a user to check their profile information. Do NOT guess or make up information about the user.

## PROFILE VERIFICATION
After checking the user's profile:
1. Confirm their identity by using their name
2. Check if weight_kg or body_type is missing from their profile
3. If any information is missing, ask the user for it directly
4. Be friendly and explain why this information helps with personalized hydration recommendations

## Response Rules
* Always start with a warm, friendly welcome using the user's name
* Keep your initial greeting brief and engaging
* Be direct in asking for any missing profile information
* Explain that this information helps provide personalized hydration advice

# Examples
<assistant_response>
Hi Alex! Welcome to The Water Bar! I'm your hydration coach, here to help you stay optimally hydrated.

I notice your profile is missing your weight. This helps me calculate your personalized hydration needs. Would you mind sharing your weight in kilograms?
</assistant_response>

<assistant_response>
Welcome back, Jamie! Great to see you at The Water Bar again!

I see your profile is complete with your weight (75kg) and body type (athletic). You're all set for personalized hydration coaching!
</assistant_response>

# Final Reminders
Your immediate priority is to welcome the user, confirm their identity, and check for missing profile information. Do this without waiting for the user to ask a question first.`;

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId, message }: { userId: string; message?: string } = await request.json();
    
    // Create Responses API call with both tools available
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      instructions: SYSTEM_PROMPT,
      input: message || 'Welcome to The Water Bar',
      // Use tools instead of functions for this SDK version
      tools: [
        {
          type: 'function',
          function: hydrationFunctions[0]
        },
        {
          type: 'function',
          function: hydrationFunctions[1]
        }
      ] as any,
      // Explicitly disable persistence to ensure fresh context each time
      store: false,
      metadata: {
        user_id: userId
      }
    } as any);
    
    // Process tool calls if needed
    // Use type assertion to access tool_calls property
    const toolCalls = (response as any).tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const call = toolCalls[0];
      let result;
      
      // Parse the arguments
      const args = JSON.parse(call.function.arguments);
      
      // Execute the appropriate function
      if (call.function.name === 'query_user_profile') {
        result = await queryUserProfile(args);
      } else if (call.function.name === 'update_user_profile') {
        result = await updateUserProfile(args);
      }
      
      // Submit the tool result back to the API
      const followUpResponse = await openai.responses.create({
        previous_response_id: response.id,
        tool_outputs: [
          {
            tool_call_id: call.id,
            output: JSON.stringify(result)
          }
        ] as any,
        // Explicitly disable persistence to ensure fresh context each time
        store: false,
        metadata: {
          user_id: userId
        }
      } as any);
      
      // Return the final response
      return new Response(
        JSON.stringify({
          message: followUpResponse.output_text,
          response_id: followUpResponse.id
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return the response if no tool calls
    return new Response(
      JSON.stringify({
        message: response.output_text,
        response_id: response.id
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
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
