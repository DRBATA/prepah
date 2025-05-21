"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import VideoModal from "./VideoModal";
import LogsView from "./views/LogsView";

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseKey);

interface SessionManagerProps {
  userId: string;
  preferredCharacterType?: "type1" | "type2" | "type3"; // User's preferred character/presenter
}

// MetaData interface for Session state tracking
interface SessionMetadata {
  session_id: string;
  page: "session_check" | "tracking" | "action_plan";
  user_id: string;
  session_type: "new" | "continue";
  timeline_summary?: {
    intake_ml: number;
    last_intake_time: string;
  };
  projected_losses?: {
    baseline_loss_ml: number;
    elapsed_hours: number;
    projected_loss_so_far_ml: number;
  };
  deficits?: {
    water_ml: number;
  };
  last_response_id?: string;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  userId,
  preferredCharacterType = "type1" // Default to type1 if not specified
}) => {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isNewSession, setIsNewSession] = useState(false);
  const [hydrationData, setHydrationData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Video modal state
  const [videoModal, setVideoModal] = useState({
    isOpen: false,
    videoTag: "",
    videoLoaded: false
  });

  // Session metadata state for OpenAI Responses API
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null);

  // Load session on component mount
  useEffect(() => {
    if (userId) {
      loadSession();
    }
  }, [userId]);

  // Show appropriate video when session state changes
  useEffect(() => {
    if (sessionId && !videoModal.videoLoaded) {
      // Force a small delay to ensure UI is ready
      setTimeout(() => {
        const videoTag = isNewSession ? "new_session" : "continue_session";
        console.log(`Playing ${videoTag} video for character: ${preferredCharacterType}`);
        
        // Temporarily simplify to ensure at least one video plays
        setVideoModal({
          isOpen: true,
          videoTag: videoTag, // Just use the session type for now
          videoLoaded: true
        });
      }, 1000); // Small delay to ensure components are ready
    }
  }, [sessionId, isNewSession, preferredCharacterType, videoModal.videoLoaded]);

  // Initialize session metadata when session is loaded
  useEffect(() => {
    if (sessionId && userProfile) {
      // Initialize metadata object for Responses API
      const initialMetadata: SessionMetadata = {
        session_id: sessionId,
        page: "session_check",
        user_id: userId,
        session_type: isNewSession ? "new" : "continue",
        timeline_summary: {
          intake_ml: 0,
          last_intake_time: new Date().toISOString()
        }
      };
      
      setMetadata(initialMetadata);
    }
  }, [sessionId, userProfile, userId, isNewSession]);

  // Load or create a session
  const loadSession = async () => {
    setLoading(true);
    try {
      // First, get user profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileData) {
        setUserProfile(profileData);
      } else {
        // Create a basic profile if none exists
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .insert([{
            id: userId,
            weight_kg: 70, // Default weight
            character_preference: preferredCharacterType
          }])
          .select()
          .single();
        
        if (newProfile) {
          setUserProfile(newProfile);
        }
      }
      
      // Check for existing active session
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('start_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
        
      let session;
      
      if (existingSessions && existingSessions.length > 0) {
        // Continue existing session
        session = existingSessions[0];
        setIsNewSession(false);
        
        // Store session continuity in conversations table for OpenAI context
        await supabase
          .from('conversations')
          .upsert({
            user_id: userId,
            session_id: session.id,
            updated_at: new Date().toISOString(),
            context: { resuming: true }
          }, { onConflict: 'user_id,session_id' });
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert([
            { 
              user_id: userId,
              start_at: new Date().toISOString(),
              end_at: null
            }
          ])
          .select()
          .single();
          
        if (error) {
          console.error("Error creating session:", error);
          return;
        }
        
        session = newSession;
        setIsNewSession(true);
        
        // Initialize a new conversation context for OpenAI
        await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            session_id: session.id,
            updated_at: new Date().toISOString(),
            context: { new_session: true }
          });
      }
      
      if (session) {
        setSessionId(session.id);
        
        // Get timeline data for the session
        const { data: timelineData } = await supabase
          .from('hydration_timeline')
          .select('*')
          .eq('session_id', session.id)
          .order('timestamp', { ascending: true });
        
        // Simple hydration status calculation
        const totalIntake = timelineData?.reduce((sum, event) => sum + (event.volume_ml || 0), 0) || 0;
        const weight = profileData?.weight_kg || 70;
        const baselineLoss = weight * 30; // Simple formula: ~30ml per kg body weight
        
        const now = new Date();
        const sessionStart = new Date(session.start_at);
        const hoursElapsed = Math.max(1, (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60));
        
        // Calculate how much should have been lost by now (simple linear model)
        const projectedLossSoFar = Math.round((baselineLoss / 24) * hoursElapsed);
        
        // Calculate deficit (negative means surplus)
        const deficit = projectedLossSoFar - totalIntake;
        
        const hydrationData = {
          totalIntake,
          dailyGoal: baselineLoss,
          projectedLossSoFar,
          deficit,
          percentComplete: Math.min(100, Math.round((totalIntake / baselineLoss) * 100))
        };
        
        setHydrationData(hydrationData);
        
        // Update metadata with timeline summary and projections
        if (metadata) {
          setMetadata({
            ...metadata,
            page: "tracking",
            timeline_summary: {
              intake_ml: totalIntake,
              last_intake_time: timelineData?.length ? timelineData[timelineData.length - 1].timestamp : new Date().toISOString()
            },
            projected_losses: {
              baseline_loss_ml: baselineLoss,
              elapsed_hours: hoursElapsed,
              projected_loss_so_far_ml: projectedLossSoFar
            },
            deficits: {
              water_ml: deficit
            }
          });
        }
      }
    } catch (error) {
      console.error("Error in loadSession:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle video end/close
  const handleVideoClose = () => {
    setVideoModal({
      ...videoModal,
      isOpen: false
    });
  };

  // Handle hydration logging
  const handleLogHydration = async (amount: number, type: string) => {
    if (!sessionId) return;
    
    try {
      // Log to hydration_timeline
      const { data, error } = await supabase
        .from('hydration_timeline')
        .insert([
          { 
            session_id: sessionId,
            user_id: userId,
            event_type: 'drink',
            item_name: type,
            volume_ml: amount,
            timestamp: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) {
        console.error("Error logging hydration:", error);
        return;
      }
      
      // Update metadata with new intake
      if (metadata?.timeline_summary) {
        const newTotal = (metadata.timeline_summary.intake_ml || 0) + amount;
        setMetadata({
          ...metadata,
          timeline_summary: {
            intake_ml: newTotal,
            last_intake_time: new Date().toISOString()
          },
          deficits: {
            water_ml: (metadata.projected_losses?.projected_loss_so_far_ml || 0) - newTotal
          }
        });
      }
      
      // Refresh hydration data
      await loadSession();
    } catch (error) {
      console.error("Error in handleLogHydration:", error);
    }
  };

  // Handle activity logging that increases water loss
  const handleLogActivity = async (activity: string, duration: number) => {
    if (!sessionId) return;
    
    try {
      // Estimate water loss from activity (very simplified)
      const waterLoss = duration * 10; // 10ml per minute of activity (simplified estimate)
      
      // Log to hydration_timeline
      const { error } = await supabase
        .from('hydration_timeline')
        .insert([
          { 
            session_id: sessionId,
            user_id: userId,
            event_type: 'activity',
            item_name: activity,
            volume_ml: -waterLoss, // Negative for loss
            duration_min: duration,
            timestamp: new Date().toISOString()
          }
        ]);
      
      if (error) {
        console.error("Error logging activity:", error);
        return;
      }
      
      // Update metadata with increased projected loss
      if (metadata?.projected_losses) {
        const updatedLoss = metadata.projected_losses.projected_loss_so_far_ml + waterLoss;
        setMetadata({
          ...metadata,
          projected_losses: {
            ...metadata.projected_losses,
            projected_loss_so_far_ml: updatedLoss
          },
          deficits: {
            water_ml: updatedLoss - (metadata.timeline_summary?.intake_ml || 0)
          }
        });
      }
      
      // Refresh hydration data
      await loadSession();
    } catch (error) {
      console.error("Error in handleLogActivity:", error);
    }
  };

  // Handle an action from the recommendation
  const handleActionConfirm = async (actionId: string, amount: number) => {
    // When user confirms an action from the recommendation panel
    // Auto-log it to the hydration timeline
    await handleLogHydration(amount, "Recommended Hydration");
    
    // Update metadata page to tracking
    if (metadata) {
      setMetadata({
        ...metadata,
        page: "tracking"
      });
    }
  };

  // Switch to action plan view
  const handleViewRecommendations = () => {
    // Update metadata to action_plan page
    if (metadata) {
      setMetadata({
        ...metadata,
        page: "action_plan"
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="animate-pulse text-xl text-cyan-500">
          Loading your hydration session...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Show VideoModal when appropriate */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={handleVideoClose}
        videoTag={videoModal.videoTag}
        autoPlay={true}
        onVideoEnd={handleVideoClose}
      />
      
      {/* Render LogsView when we have a session */}
      {sessionId && (
        <LogsView
          sessionId={sessionId}
          userProfile={userProfile}
          hydrationData={hydrationData}
          onLogHydration={handleLogHydration}
          onLogActivity={handleLogActivity}
          onViewRecommendations={handleViewRecommendations}
          onActionConfirm={handleActionConfirm}
          metadata={metadata}
        />
      )}
    </div>
  );
};

export default SessionManager;
