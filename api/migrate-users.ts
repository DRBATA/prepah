// api/migrate-users.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize with service role key using your existing env variable names
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Get all unique emails and weights from hydration_plan
    const { data: uniqueUsers, error: queryError } = await supabase
      .from('hydration_plan')
      .select('email, weight_kg')
      .not('weight_kg', 'is', null)
      .order('email');
    
    if (queryError) throw queryError;
    
    // Create a map to deduplicate by email
    const userMap = new Map();
    uniqueUsers?.forEach(user => {
      if (!userMap.has(user.email)) {
        userMap.set(user.email, user);
      }
    });
    
    // 2. Create auth users and update profiles
    const results = [];
    for (const user of userMap.values()) {
      // Generate a random password
      const password = Math.random().toString(36).slice(-8);
      
      // Create the auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true // Skip email verification
      });
      
      if (authError) {
        results.push({ email: user.email, status: 'error', message: authError.message });
        continue;
      }
      
      // Update the profile with weight
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ weight_kg: user.weight_kg })
        .eq('id', authUser.user.id);
      
      results.push({
        email: user.email,
        status: profileError ? 'error' : 'success',
        message: profileError ? profileError.message : 'User created and profile updated',
        password: password
      });
    }
    
    res.status(200).json({
      message: `Processed ${results.length} users`,
      results
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
}