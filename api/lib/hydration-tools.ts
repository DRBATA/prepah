import { createClient } from '@supabase/supabase-js';

// Define recommendation types
interface BaseRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
}

// Environment modifier interface
interface EnvironmentModifier {
  id: string;
  name: string;
  temp_min_c: number;
  temp_max_c: number;
  humidity_min: number;
  humidity_max: number;
  modifier: number; // Percentage modifier for water needs
}

// Hydration scenario interface
interface HydrationScenario {
  id: string;
  name: string;
  description: string;
  water_ml_per_kg: number;
  electrolyte_mg_per_kg: number;
  protein_g_per_kg: number;
}

// Input library item interface
interface InputLibraryItem {
  id: string;
  name: string;
  water_ml: number;
  electrolyte_mg: number;
  protein_g: number;
  calories: number;
  category: string;
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
 * Calculate user's baseline water needs based on weight and activity level
 */
async function calculateBaselineNeeds(userId: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    return {
      water_ml: 2000, // Default value if no profile found
      electrolyte_mg: 1000,
      protein_g: 50
    };
  }

  // Get body composition data from lookup table
  const { data: bodyComposition } = await supabase
    .from('body_composition_lookup')
    .select('*')
    .eq('activity_level', profile.activity_level || 'average')
    .single();

  const weight = profile.weight_kg || 70; // Default to 70kg if not provided
  const scenario = bodyComposition?.hydration_scenario || 'average';

  // Get hydration scenario from library
  const { data: hydrationScenario } = await supabase
    .from('hydration_scenario_library')
    .select('*')
    .eq('name', scenario)
    .single();

  // Calculate needs based on weight and scenario
  const baseWater = hydrationScenario?.water_ml_per_kg || 30; // Default 30ml per kg
  const baseElectrolyte = hydrationScenario?.electrolyte_mg_per_kg || 15; // Default 15mg per kg
  const baseProtein = hydrationScenario?.protein_g_per_kg || 0.8; // Default 0.8g per kg

  return {
    water_ml: Math.round(weight * baseWater),
    electrolyte_mg: Math.round(weight * baseElectrolyte),
    protein_g: Math.round(weight * baseProtein * 10) / 10
  };
}

/**
 * Get environment modifier based on weather conditions
 */
async function getEnvironmentModifier(temperature: number, humidity: number) {
  const { data: modifiers } = await supabase
    .from('environment_modifiers')
    .select('*');

  if (!modifiers || modifiers.length === 0) {
    return 1; // Default multiplier if no modifiers found
  }

  // Find the appropriate modifier for current conditions
  const modifier = modifiers.find((mod: EnvironmentModifier) => 
    temperature >= mod.temp_min_c && 
    temperature <= mod.temp_max_c && 
    humidity >= mod.humidity_min && 
    humidity <= mod.humidity_max
  );

  return modifier ? 1 + (modifier.modifier / 100) : 1;
}

/**
 * Calculate projected losses for the day
 */
async function calculateProjectedLosses(userId: string, environmentModifier: number) {
  // Get baseline loss events
  const { data: baselineLosses } = await supabase
    .from('baseline_loss_events')
    .select('*');

  if (!baselineLosses) {
    return {
      water_ml: 2500 * environmentModifier, // Default with modifier
      electrolyte_mg: 1200,
      protein_g: 0
    };
  }

  // Sum up baseline losses
  const totalWaterLoss = baselineLosses.reduce(
    (sum: number, loss: any) => sum + (loss.water_ml || 0), 
    0
  );
  
  const totalElectrolyteLoss = baselineLosses.reduce(
    (sum: number, loss: any) => sum + (loss.electrolyte_mg || 0), 
    0
  );

  // Apply environmental modifier to water loss
  return {
    water_ml: Math.round(totalWaterLoss * environmentModifier),
    electrolyte_mg: totalElectrolyteLoss,
    protein_g: 0 // Protein isn't lost through sweating/breathing
  };
}

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
        name: 'start_session',
        description: 'Start a new hydration tracking session for a user or continue an existing one',
        parameters: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The ID of the user to start a session for'
            },
            location: {
              type: 'string',
              description: 'Optional location information for the session'
            },
            temperature: {
              type: 'number',
              description: 'Optional temperature in Celsius for environmental tracking'
            },
            humidity: {
              type: 'number',
              description: 'Optional humidity percentage for environmental tracking'
            },
            continue_session: {
              type: 'boolean',
              description: 'Whether to continue an existing active session from the last 24 hours (default: true)'
            }
          },
          required: ['user_id']
        }
      }
    },
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
    const { user_id, session_id } = args;
    
    try {
      // Get session data
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session_id)
        .single();
        
      if (!session) {
        return { 
          error: 'Session not found',
          hydrationStatus: {
            waterIntake: 0,
            target: 2000,
            percentage: 0,
            lastIntake: null
          }
        };
      }
      
      // Get user's baseline needs
      const baselineNeeds = await calculateBaselineNeeds(user_id);
      
      // Get environment data from session
      const temperature = session.temperature || 25; // Default to 25°C
      const humidity = session.humidity || 50; // Default to 50%
      
      // Get environment modifier
      const environmentModifier = await getEnvironmentModifier(temperature, humidity);
      
      // Calculate projected losses
      const projectedLosses = await calculateProjectedLosses(user_id, environmentModifier);
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
      return {
        hydrationStatus: {
          waterIntake,
          target: waterTarget,
          percentage: Math.round((waterIntake / waterTarget) * 100),
          lastIntake: lastIntakeTime
        },
        electrolytes: {
          intake: electrolyteIntake,
          target: electrolyteTarget,
          percentage: Math.round((electrolyteIntake / electrolyteTarget) * 100)
        },
        protein: {
          intake: proteinIntake,
          target: proteinTarget,
          percentage: Math.round((proteinIntake / proteinTarget) * 100)
        },
        environmentData: {
          temperature: await getTemperature(),
          humidity: await getHumidity(),
          modifier: await getEnvironmentModifier(await getTemperature(), await getHumidity())
        }
      };
    } catch (error) {
      console.error('Error getting hydration status:', error);
      return { error: 'Failed to get hydration status' };
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
    const { user_id, session_id, amount_ml, fluid_type, notes } = args;

    try {
      // Find the matching input from input_library
      let inputId;

      // Get the input library items
      const { data: inputLibrary } = await supabase
        .from('input_library')
        .select('*')
        .eq('category', fluid_type);

      if (inputLibrary && inputLibrary.length > 0) {
        // Find closest match by volume
        const matchingInput = inputLibrary.reduce((closest, current) => {
          const currentDiff = Math.abs((current.water_ml || 0) - amount_ml);
          const closestDiff = Math.abs((closest.water_ml || 0) - amount_ml);
          return currentDiff < closestDiff ? current : closest;
        }, inputLibrary[0]);
        
        inputId = matchingInput.id;
      } else {
        // Create a new input library entry if no match
        const { data: newInput, error } = await supabase
          .from('input_library')
          .insert({
            name: `${fluid_type} (${amount_ml}ml)`,
            category: fluid_type,
            water_ml: fluid_type === 'water' ? amount_ml : Math.round(amount_ml * 0.8),
            electrolyte_mg: fluid_type === 'electrolyte' ? 500 : 0,
            protein_g: fluid_type === 'protein' ? 20 : 0,
            calories: 0
          })
          .select()
          .single();

        if (error) throw error;
        inputId = newInput.id;
      }

      // Add to hydration timeline
      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('hydration_timeline')
        .insert({
          user_id,
          session_id,
          input_id: inputId,
          quantity: 1,
          timestamp,
          notes
        });
        
      if (error) throw error;
      
      // Get updated hydration status
      const updatedStatus = await this.getHydrationStatus({ user_id, session_id });
      
      return {
        success: true,
        message: `Logged ${amount_ml}ml of ${fluid_type}`,
        hydrationStatus: updatedStatus.hydrationStatus
      };
    } catch (error) {
      console.error('Error logging water intake:', error);
      return { 
        success: false, 
        error: 'Failed to log water intake'
      };
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
      const hydrationStatus = await this.getHydrationStatus(args);
      
      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', args.user_id)
        .single();
      
      // Get location data from session or arguments
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', args.session_id)
        .single();

      // Get weather data from session or metadata
      const temperature = session?.temperature || 25;
      const humidity = session?.humidity || 50;
      
      // Get appropriate hydration scenario based on environment and activity
      const { data: scenarios } = await supabase
        .from('hydration_scenario_library')
        .select('*');
      
      // Find most appropriate scenario
      let scenario;
      if (scenarios && scenarios.length > 0) {
        // If temperature is high and humidity is high - select high intensity scenario
        if (temperature > 30 && humidity > 70) {
          scenario = scenarios.find(s => s.name.toLowerCase().includes('high') || s.name.toLowerCase().includes('intense'));
        } 
        // If moderate conditions
        else if (temperature > 20 && humidity > 50) {
          scenario = scenarios.find(s => s.name.toLowerCase().includes('moderate'));
        }
        // Otherwise use default or low intensity
        else {
          scenario = scenarios.find(s => s.name.toLowerCase().includes('low') || s.name.toLowerCase().includes('average'));
        }
        
        // Fallback to first scenario if no match
        scenario = scenario || scenarios[0];
      }
      
      // Get nearby venues
      const nearbyVenues = await this.getNearbyVenues(args.location || '');
      
      // Generate recommendations based on hydration status
      const recommendations: Recommendation[] = [];
      
      // Calculate hydration deficit
      const waterDeficit = hydrationStatus.hydrationStatus.target - hydrationStatus.hydrationStatus.waterIntake;
      
      if (waterDeficit > 0) {
        // Get the environment-specific recommendation
        let drinkTitle = 'Drink some water';
        let drinkDesc = `You're ${hydrationStatus.hydrationStatus.percentage}% hydrated. Have some water to stay on track.`;
        
        // Adjust recommendation based on environment
        if (temperature > 30) {
          drinkTitle = 'Stay hydrated in this heat';
          drinkDesc = `It's hot out there! Drink water regularly to maintain hydration.`;
        } else if (humidity > 70) {
          drinkTitle = 'Hydrate for high humidity';
          drinkDesc = `High humidity affects your body's cooling. Stay hydrated!`;
        }
        
        // Recommend water intake based on deficit
        recommendations.push({
          id: 'rec_water_1',
          type: 'drink_water',
          amount_ml: Math.min(waterDeficit, 500),
          title: drinkTitle,
          description: drinkDesc,
          urgency: hydrationStatus.hydrationStatus.percentage < 50 ? 'high' : 'medium'
        });
      }
      
      // Add electrolyte recommendation if needed
      if (hydrationStatus.electrolytes.percentage < 50) {
        recommendations.push({
          id: 'rec_electrolyte_1',
          type: 'drink_water',
          amount_ml: 300,
          title: 'Replenish electrolytes',
          description: 'Your electrolyte levels are low. Consider a sports drink or electrolyte supplement.',
          urgency: 'medium'
        });
      }
      
      // Add scenario-specific recommendation
      if (scenario) {
        recommendations.push({
          id: 'rec_scenario_1',
          type: 'activity',
          title: `${scenario.name} hydration plan`,
          description: scenario.description || 'Follow your personalized hydration plan for optimal performance.',
          urgency: 'medium'
        });
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
    // Stub implementation - in a real app this would connect to a venue API
    return Promise.resolve([
      {
        id: 'venue_1',
        name: 'The Water Bar',
        type: 'Hydration Station',
        rating: 4.8,
        distance: '500m',
        address: '123 Hydration Ave.',
        hours: '9AM - 9PM'
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
    ]);
  },
  
  /**
   * Start a new hydration tracking session for a user
   */
  async startSession(args: {
    user_id: string;
    location?: string;
    temperature?: number;
    humidity?: number;
    continue_session?: boolean;
  }) {
    const { user_id, location, temperature, humidity, continue_session = true } = args;
    
    try {
      // Get or create user profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single();
        
      if (!existingProfile) {
        // Create default profile if none exists
        await supabase
          .from('profiles')
          .insert({
            id: user_id,
            weight_kg: 70, // Default weight
            activity_level: 'average', // Default activity level
            created_at: new Date().toISOString()
          });
      }
      
      // Check for existing active session for this user
      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user_id)
        .eq('active', true)
        .order('start_time', { ascending: false });
      
      let session;
      const timestamp = new Date().toISOString();
      
      // If we want to continue and there's an existing session within the last 24 hours, use it
      if (continue_session && existingSessions && existingSessions.length > 0) {
        const latestSession = existingSessions[0];
        const sessionStartTime = new Date(latestSession.start_time);
        const currentTime = new Date();
        const timeDifference = currentTime.getTime() - sessionStartTime.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        // If the session is less than 24 hours old, continue with it
        if (hoursDifference < 24) {
          session = latestSession;
          
          // Update the session with new location and weather data if provided
          if (location || temperature || humidity) {
            const updateData: any = {};
            if (location) updateData.location = location;
            if (temperature) updateData.temperature = temperature;
            if (humidity) updateData.humidity = humidity;
            
            await supabase
              .from('sessions')
              .update(updateData)
              .eq('id', session.id);
          }
        } else {
          // If older than 24 hours, deactivate old sessions
          await supabase
            .from('sessions')
            .update({ active: false })
            .eq('user_id', user_id)
            .eq('active', true);
            
          // Create a new session
          const { data: newSession, error } = await supabase
            .from('sessions')
            .insert({
              user_id,
              start_time: timestamp,
              location,
              temperature,
              humidity,
              active: true
            })
            .select()
            .single();
            
          if (error) throw error;
          session = newSession;
        }
      } else {
        // Create a new session
        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert({
            user_id,
            start_time: timestamp,
            location,
            temperature,
            humidity,
            active: true
          })
          .select()
          .single();
          
        if (error) throw error;
        session = newSession;
      }
      
      if (!session) throw new Error('Failed to create or retrieve session');
      
      // Calculate initial hydration status
      const hydrationStatus = await this.getHydrationStatus({
        user_id,
        session_id: session.id
      });
      
      return {
        success: true,
        session_id: session.id,
        start_time: timestamp,
        hydrationStatus: hydrationStatus.hydrationStatus,
        message: 'Session started successfully'
      };
    } catch (error) {
      console.error('Error starting session:', error);
      return {
        success: false,
        error: 'Failed to start session'
      };
    }
  }
};

export default HydrationTools;
