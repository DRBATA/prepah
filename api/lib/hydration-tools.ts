import { createClient } from '@supabase/supabase-js';

// Define recommendation types
interface BaseRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
}

interface DrinkRecommendation extends BaseRecommendation {
  type: 'drink_water';
  amount_ml: number;
}

interface ActivityRecommendation extends BaseRecommendation {
  type: 'activity';
}

type Recommendation = DrinkRecommendation | ActivityRecommendation;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Tool definitions and implementations for hydration tracking
 */
export const HydrationTools = {
  /**
   * Tool definitions for the OpenAI API
   */
  toolDefinitions: [
    {
      type: 'function',
      function: {
        name: 'get_hydration_status',
        description: 'Get the current hydration status and metrics for a user',
        parameters: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The ID of the user to get hydration status for'
            },
            session_id: {
              type: 'string',
              description: 'The ID of the current session'
            }
          },
          required: ['user_id', 'session_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'log_water_intake',
        description: 'Log water or fluid intake for a user',
        parameters: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The ID of the user logging water intake'
            },
            session_id: {
              type: 'string',
              description: 'The ID of the current session'
            },
            amount_ml: {
              type: 'number',
              description: 'The amount of fluid in milliliters'
            },
            fluid_type: {
              type: 'string',
              description: 'The type of fluid consumed',
              enum: ['water', 'electrolyte', 'protein', 'other']
            },
            notes: {
              type: 'string',
              description: 'Optional notes about the intake'
            }
          },
          required: ['user_id', 'session_id', 'amount_ml', 'fluid_type']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_recommendations',
        description: 'Get personalized hydration recommendations based on user data',
        parameters: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The ID of the user to get recommendations for'
            },
            session_id: {
              type: 'string',
              description: 'The ID of the current session'
            },
            location: {
              type: 'string',
              description: 'Optional user location for contextual recommendations'
            }
          },
          required: ['user_id', 'session_id']
        }
      }
    }
  ],
  
  /**
   * Get user's current hydration status
   */
  async getHydrationStatus(args: { user_id: string; session_id: string }) {
    try {
      // Get hydration events for the session
      const { data: hydrationEvents, error } = await supabase
        .from('hydration_events')
        .select('*')
        .eq('session_id', args.session_id)
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      // Get user profile for calculating goals
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', args.user_id)
        .single();
      
      // Calculate total intakes by type
      const waterIntake = hydrationEvents
        ?.filter(e => e.type === 'water' || e.type === 'drink')
        .reduce((sum, e) => sum + (e.amount_ml || 0), 0) || 0;
        
      const electrolyteIntake = hydrationEvents
        ?.filter(e => e.type === 'electrolyte')
        .reduce((sum, e) => sum + (e.amount_ml || 0), 0) || 0;
        
      const proteinIntake = hydrationEvents
        ?.filter(e => e.type === 'protein')
        .reduce((sum, e) => sum + (e.amount_g || 0), 0) || 0;
      
      // Calculate daily goal based on user weight (30ml per kg)
      const weight = userProfile?.weight_kg || 70;
      const dailyGoal = weight * 30;
      const percentComplete = Math.min(100, Math.round(((waterIntake + electrolyteIntake) / dailyGoal) * 100));
      
      // Get session start time for time remaining calculation
      const { data: session } = await supabase
        .from('sessions')
        .select('start_at')
        .eq('id', args.session_id)
        .single();
      
      // Calculate time remaining in the 24h cycle
      const startTime = new Date(session?.start_at || new Date());
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 24);
      const now = new Date();
      const timeRemainingMs = endTime.getTime() - now.getTime();
      const timeRemainingHours = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60 * 60)));
      const timeRemainingMinutes = Math.max(0, Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60)));
      
      // Format recent events for display
      const recentEvents = hydrationEvents
        ?.slice(-5)
        .map(event => ({
          type: event.type,
          amount: event.type === 'protein' 
            ? `${event.amount_g}g` 
            : `${event.amount_ml}ml`,
          time: new Date(event.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
          }),
          message: event.type === 'protein'
            ? `Added ${event.amount_g}g of protein`
            : `Drank ${event.amount_ml}ml of ${event.type}`
        })) || [];
      
      return {
        waterIntake,
        electrolyteIntake,
        proteinIntake,
        totalIntake: waterIntake + electrolyteIntake,
        dailyGoal,
        percentComplete,
        timeRemaining: `${timeRemainingHours}h ${timeRemainingMinutes}m`,
        recentEvents,
        eventCount: hydrationEvents?.length || 0
      };
    } catch (error) {
      console.error('Error getting hydration status:', error);
      throw new Error('Failed to get hydration status');
    }
  },
  
  /**
   * Log water or fluid intake
   */
  async logWaterIntake(args: { 
    user_id: string; 
    session_id: string; 
    amount_ml: number; 
    fluid_type: string;
    notes?: string;
  }) {
    try {
      // Map fluid type to database type
      const type = args.fluid_type === 'water' ? 'water' : 
                   args.fluid_type === 'electrolyte' ? 'electrolyte' : 
                   args.fluid_type === 'protein' ? 'protein' : 'drink';
      
      // Create the event record
      const eventData: any = {
        user_id: args.user_id,
        session_id: args.session_id,
        type,
        created_at: new Date().toISOString(),
        notes: args.notes
      };
      
      // Set the appropriate amount field
      if (type === 'protein') {
        // For protein, assume the amount is in grams not ml
        eventData.amount_g = args.amount_ml;
      } else {
        eventData.amount_ml = args.amount_ml;
      }
      
      // Insert the hydration event
      const { data, error } = await supabase
        .from('hydration_events')
        .insert(eventData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Get updated status after logging
      return this.getHydrationStatus({
        user_id: args.user_id,
        session_id: args.session_id
      });
    } catch (error) {
      console.error('Error logging water intake:', error);
      throw new Error('Failed to log water intake');
    }
  },
  
  /**
   * Get personalized recommendations
   */
  async getRecommendations(args: { 
    user_id: string; 
    session_id: string;
    location?: string;
  }): Promise<{ recommendations: Recommendation[]; hydrationStatus: any; nearbyVenues: any[] }> {
    try {
      // Get current hydration status
      const hydrationStatus = await this.getHydrationStatus({
        user_id: args.user_id,
        session_id: args.session_id
      });
      
      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', args.user_id)
        .single();
      
      // Get nearby venues if location provided
      const nearbyVenues = args.location 
        ? await this.getNearbyVenues(args.location)
        : [];
      
      // Calculate remaining intake needed
      const remainingIntake = Math.max(0, hydrationStatus.dailyGoal - hydrationStatus.totalIntake);
      
      // Generate recommendations based on deficit
      const recommendations: Recommendation[] = [];
      
      if (remainingIntake > 0) {
        // Recommend water intake
        const waterRec: DrinkRecommendation = {
          id: 'rec_water_' + Date.now(),
          type: 'drink_water',
          title: 'Drink Water',
          description: `You need ${remainingIntake}ml more water today to reach your goal.`,
          amount_ml: Math.min(250, remainingIntake),
          urgency: remainingIntake > hydrationStatus.dailyGoal * 0.3 ? 'high' : 'medium'
        };
        recommendations.push(waterRec);
      }
      
      // Add electrolyte recommendation if needed
      const electrolytesNeeded = 1000 - hydrationStatus.electrolyteIntake;
      if (electrolytesNeeded > 0) {
        const electrolyteRec: DrinkRecommendation = {
          id: 'rec_electrolyte_' + Date.now(),
          type: 'drink_water',
          title: 'Electrolyte Boost',
          description: 'Adding electrolytes helps with hydration and mineral balance.',
          amount_ml: 330,
          urgency: 'low'
        };
        recommendations.push(electrolyteRec);
      }
      
      // Add venue recommendation if available
      if (nearbyVenues.length > 0) {
        const venue = nearbyVenues[0];
        const venueRec: ActivityRecommendation = {
          id: 'rec_venue_' + Date.now(),
          type: 'activity',
          title: `Visit ${venue.name}`,
          description: `${venue.type} just ${venue.distance} away from you.`,
          urgency: 'low'
        };
        recommendations.push(venueRec);
      }
      
      return {
        recommendations,
        hydrationStatus,
        nearbyVenues
      };
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new Error('Failed to get recommendations');
    }
  },
  
  /**
   * Get nearby hydration venues (stub implementation)
   * In a real app, this would connect to a map API
   */
  async getNearbyVenues(location: string): Promise<any[]> {
    // This is a stub implementation
    // In a real app, this would use geolocation and a mapping API
    return [
      {
        id: 'venue_1',
        name: 'The Water Bar',
        type: 'Hydration Station',
        rating: 4.8,
        distance: '500m'
      },
      {
        id: 'venue_2',
        name: 'Hydration Hub',
        type: 'Wellness Café',
        rating: 4.5,
        distance: '800m'
      },
      {
        id: 'venue_3',
        name: 'Perrier Lounge',
        type: 'Premium Hydration',
        rating: 4.3,
        distance: '1.2km'
      }
    ];
  }
};

export default HydrationTools;
