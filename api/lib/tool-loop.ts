import OpenAI from 'openai';
import { HydrationTools } from './hydration-tools';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Manages the tool calling loop for the AI
 */
export const ToolLoop = {
  /**
   * Process any tool calls in the AI response
   */
  async processToolCalls(aiResponse: any, metadata: { userId: string; sessionId: string }): Promise<any> {
    // If no tool calls, return the original response
    if (!aiResponse.tool_calls?.length) {
      return aiResponse;
    }
    
    // Process the first tool call
    const call = aiResponse.tool_calls[0];
    
    // Parse arguments
    const args = JSON.parse(call.function.arguments);
    
    // Add user and session context if not provided
    if (!args.user_id && metadata.userId) {
      args.user_id = metadata.userId;
    }
    if (!args.session_id && metadata.sessionId) {
      args.session_id = metadata.sessionId;
    }
    
    // Execute the tool
    const result = await this.executeToolCall(call.function.name, args);
    
    // Call the API again with the tool result
    const followUp = await openai.responses.create({
      previous_response_id: aiResponse.id,
      tool_call_id: call.id,
      tool_output: JSON.stringify(result),
      metadata
    });
    
    // Check if there are more tool calls
    if (followUp.tool_calls?.length) {
      // Recursive call to handle chained tool calls
      return this.processToolCalls(followUp, metadata);
    }
    
    // Return the final response
    return followUp;
  },
  
  /**
   * Execute a tool call by name
   */
  async executeToolCall(toolName: string, args: any): Promise<any> {
    console.log(`Executing tool: ${toolName} with args:`, args);
    
    switch (toolName) {
      case 'get_hydration_status':
        return await HydrationTools.getHydrationStatus(args);
        
      case 'log_water_intake':
        return await HydrationTools.logWaterIntake(args);
        
      case 'get_recommendations':
        return await HydrationTools.getRecommendations(args);
        
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
};

export default ToolLoop;
