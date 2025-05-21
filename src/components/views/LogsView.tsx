import React, { useState, useEffect } from 'react';
import TimelineView from '../TimelineView'; // Update this if needed
import HydrationDrawer from '../HydrationDrawer';
import ProfileSection from '../ProfileSection';
import HydrationStatus from '../HydrationStatus';

// Types from SessionManager
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

interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  amount: number;
  priority: 'high' | 'medium' | 'low';
}

interface LogsViewProps {
  sessionId: string;
  userProfile: any;
  hydrationData: any;
  onLogHydration: (amount: number, type: string) => void;
  onLogActivity: (activity: string, duration: number) => void;
  onViewRecommendations?: () => void;
  onActionConfirm?: (actionId: string, amount: number) => void;
  metadata?: SessionMetadata | null;
}

const LogsView: React.FC<LogsViewProps> = ({
  sessionId,
  userProfile,
  hydrationData,  
  onLogHydration,
  onLogActivity,
  onViewRecommendations,
  onActionConfirm,
  metadata
}) => {
  const [viewMode, setViewMode] = useState<'tracking' | 'action_plan'>('tracking');
  const [recommendedActions, setRecommendedActions] = useState<RecommendedAction[]>([]);
  
  const totalIntake = hydrationData?.totalIntake || 0;
  const dailyGoal = hydrationData?.dailyGoal || 2500;
  const percentComplete = Math.min(100, Math.round((totalIntake / dailyGoal) * 100));
  const deficit = hydrationData?.deficit || 0;
  
  // Update view mode based on metadata
  useEffect(() => {
    if (metadata?.page) {
      if (metadata.page === 'action_plan') {
        setViewMode('action_plan');
        generateRecommendations();
      } else {
        setViewMode('tracking');
      }
    }
  }, [metadata?.page]);
  
  // Generate action recommendations based on hydration data
  const generateRecommendations = () => {
    const actions: RecommendedAction[] = [];
    
    if (deficit > 500) {
      // Significant deficit - high priority recommendation
      actions.push({
        id: 'action_1',
        title: 'Drink 500ml Water Now',
        description: 'You have a significant hydration deficit. Drink 500ml of water immediately.',
        amount: 500,
        priority: 'high'
      });
    } else if (deficit > 0) {
      // Moderate deficit - medium priority
      actions.push({
        id: 'action_2',
        title: `Drink ${deficit}ml Water`,
        description: `You have a ${deficit}ml hydration deficit. Drink water to rehydrate.`,
        amount: deficit,
        priority: 'medium'
      });
    } else {
      // No deficit or surplus - just a maintenance recommendation
      actions.push({
        id: 'action_3',
        title: 'Stay Hydrated',
        description: 'You\'re well hydrated! Continue to drink 250ml water every hour.',
        amount: 250,
        priority: 'low'
      });
    }
    
    // Add a sports drink recommendation if deficit is high
    if (deficit > 700) {
      actions.push({
        id: 'action_4',
        title: 'Drink Electrolyte Solution',
        description: 'Consider an electrolyte drink to replenish minerals lost.',
        amount: 330,
        priority: 'medium'
      });
    }
    
    setRecommendedActions(actions);
  };
  
  // Handle action button click
  const handleActionConfirm = (action: RecommendedAction) => {
    if (onActionConfirm) {
      onActionConfirm(action.id, action.amount);
    }
  };
  
  // Switch to recommendations view
  const handleViewRecommendations = () => {
    if (onViewRecommendations) {
      onViewRecommendations();
    }
  };
  
  return (
    <div className="view-container logs-view">
      {/* Top nav to switch between tracking and recommendations */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {viewMode === 'tracking' ? 'Hydration Status' : 'Recommendations'}
        </h2>
        <div>
          {viewMode === 'tracking' ? (
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
              onClick={handleViewRecommendations}
            >
              View Recommendations
            </button>
          ) : (
            <button 
              className="bg-gray-500 text-white px-4 py-2 rounded-lg"
              onClick={() => setViewMode('tracking')}
            >
              Back to Tracking
            </button>
          )}
        </div>
      </div>
      
      {/* Tracking View */}
      {viewMode === 'tracking' && (
        <div className="tracking-view">
          {/* Hydration Status Component */}
          <HydrationStatus 
            currentIntake={totalIntake}
            goal={dailyGoal}
            projectedLoss={metadata?.projected_losses?.projected_loss_so_far_ml || 0}
            balance={metadata?.deficits?.water_ml || 0}
            onViewRecommendations={onViewRecommendations}
          />
          
          {/* Profile Section */}
          <ProfileSection userId={userProfile?.id || ''} />
          
          {/* Logging Interface with Timeline and Drawer */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            {/* Timeline Column */}
            <div className="w-full md:w-2/3">
              <TimelineView 
                sessionId={sessionId}
                userId={userProfile?.id || ''}
                onEventAdded={() => {
                  // Handled by parent component now
                }}
                onEventUpdated={() => {
                  // Handled by parent component now
                }}
              />
            </div>
            
            {/* Drawer Column */}
            <div className="w-full md:w-1/3">
              <HydrationDrawer 
                sessionId={sessionId}
                userId={userProfile?.id || ''}
                onLogHydration={onLogHydration}
              />
            </div>
          </div>
          
          {/* Quick Entry Controls */}
          <div className="quick-entry mt-6 bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-3">Quick Add</h3>
            <div className="entry-buttons grid grid-cols-3 gap-2">
              <button 
                className="entry-button bg-blue-100 hover:bg-blue-200 text-blue-800 p-3 rounded-lg transition"
                onClick={() => onLogHydration(250, 'water')}
              >
                Water +250ml
              </button>
              <button 
                className="entry-button bg-purple-100 hover:bg-purple-200 text-purple-800 p-3 rounded-lg transition"
                onClick={() => onLogHydration(330, 'electrolyte')}
              >
                Electrolyte +330ml
              </button>
              <button 
                className="entry-button bg-green-100 hover:bg-green-200 text-green-800 p-3 rounded-lg transition"
                onClick={() => onLogActivity('workout', 30)}
              >
                Record Activity
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Recommendations View */}
      {viewMode === 'action_plan' && (
        <div className="recommendations-panel bg-white p-6 rounded-lg shadow-lg">
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h3 className="font-bold text-lg mb-2">Your Hydration Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Intake</div>
                <div className="text-xl font-bold">{totalIntake} ml</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estimated Loss</div>
                <div className="text-xl font-bold">{hydrationData?.projectedLossSoFar || 0} ml</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Current Status</div>
                <div className={`text-xl font-bold ${deficit > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {deficit > 0 ? 'Dehydrated' : 'Hydrated'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Balance</div>
                <div className={`text-xl font-bold ${deficit > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {deficit > 0 ? `-${deficit}` : `+${Math.abs(deficit)}`} ml
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="font-bold text-lg mb-4">Recommended Actions</h3>
          
          <div className="action-cards space-y-4">
            {recommendedActions.map(action => (
              <div 
                key={action.id}
                className={`action-card p-4 rounded-lg border ${action.priority === 'high' ? 'border-red-300 bg-red-50' : 
                  action.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' : 
                  'border-green-300 bg-green-50'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg">{action.title}</h4>
                    <p className="text-gray-700">{action.description}</p>
                  </div>
                  <div className="badge px-2 py-1 rounded text-xs font-semibold uppercase">
                    {action.priority === 'high' ? (
                      <span className="text-red-800 bg-red-100 px-2 py-1 rounded">High</span>
                    ) : action.priority === 'medium' ? (
                      <span className="text-yellow-800 bg-yellow-100 px-2 py-1 rounded">Medium</span>
                    ) : (
                      <span className="text-green-800 bg-green-100 px-2 py-1 rounded">Low</span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                    onClick={() => handleActionConfirm(action)}
                  >
                    Do This Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsView;
