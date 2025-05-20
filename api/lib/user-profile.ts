import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserProfile {
  id: string;
  weight_kg?: number;
  height_cm?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  age?: number;
  gender?: string;
  location?: string;
  units_preference?: 'metric' | 'imperial';
}

export interface HydrationNeeds {
  dailyGoal: number;  // in ml
  electrolytesGoal: number;  // in mg
  proteinGoal: number;  // in g
}

/**
 * Manages user profile data and calculates hydration needs
 */
export const UserProfileManager = {
  /**
   * Get user profile data
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      // Return minimal profile with just the ID
      return { id: userId };
    }
    
    return profile;
  },
  
  /**
   * Calculate user's hydration needs based on profile
   */
  calculateHydrationNeeds(profile: UserProfile): HydrationNeeds {
    // Basic calculation: 30ml per kg of body weight
    // This could be enhanced with more sophisticated algorithms based on
    // activity level, climate, etc.
    const weight = profile.weight_kg || 70; // Default to 70kg if not provided
    const activityMultiplier = this.getActivityMultiplier(profile.activity_level);
    
    // Calculate base water need
    const baseWaterNeed = weight * 30; // 30ml per kg
    
    // Adjust for activity level
    const adjustedWaterNeed = baseWaterNeed * activityMultiplier;
    
    // Round to nearest 50ml
    const dailyGoal = Math.round(adjustedWaterNeed / 50) * 50;
    
    // Electrolytes: roughly 1000mg per 2000ml of water
    // (sodium, potassium, magnesium, etc. combined)
    const electrolytesGoal = Math.round((dailyGoal / 2000) * 1000);
    
    // Protein: roughly 1.5g per kg for active individuals
    const proteinGoal = Math.round(weight * 1.5);
    
    return {
      dailyGoal,
      electrolytesGoal,
      proteinGoal
    };
  },
  
  /**
   * Get activity level multiplier for hydration calculations
   */
  getActivityMultiplier(activityLevel?: string): number {
    switch (activityLevel) {
      case 'sedentary':
        return 1.0;
      case 'light':
        return 1.1;
      case 'moderate':
        return 1.2;
      case 'active':
        return 1.3;
      case 'very_active':
        return 1.4;
      default:
        return 1.2; // Default to moderate
    }
  },
  
  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update profile');
    }
    
    return data;
  }
};

export default UserProfileManager;
