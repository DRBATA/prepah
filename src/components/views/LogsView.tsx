import React from 'react';

interface LogsViewProps {
  sessionId: string;
  userProfile: any;
  hydrationData: any;
  onLogHydration: (amount: number, type: string) => void;
  onLogActivity: (activity: string, duration: number) => void;
}

const LogsView: React.FC<LogsViewProps> = ({
  sessionId,
  userProfile,
  hydrationData,
  onLogHydration,
  onLogActivity
}) => {
  const totalIntake = hydrationData?.totalIntake || 0;
  const dailyGoal = hydrationData?.dailyGoal || 2500;
  const percentComplete = Math.min(100, Math.round((totalIntake / dailyGoal) * 100));
  
  return (
    <div className="view-container logs-view">
      <h2>Hydration Status</h2>
      
      {/* Hydration Status Dashboard */}
      <div className="status-dashboard">
        <div className="circular-progress">
          <div className="percentage">{percentComplete}%</div>
          <div className="label">Hydrated</div>
        </div>
        
        <div className="metrics">
          <div className="metric">
            <span className="label">Water</span>
            <span className="value">{hydrationData?.waterIntake || 0}ml</span>
          </div>
          <div className="metric">
            <span className="label">Electrolytes</span>
            <span className="value">{hydrationData?.electrolyteIntake || 0}mg</span>
          </div>
          <div className="metric">
            <span className="label">Protein</span>
            <span className="value">{hydrationData?.proteinIntake || 0}g</span>
          </div>
        </div>
      </div>
      
      {/* Quick Entry Controls */}
      <div className="quick-entry">
        <h3>Quick Add</h3>
        <div className="entry-buttons">
          <button 
            className="entry-button water"
            onClick={() => onLogHydration(250, 'water')}
          >
            Water +250ml
          </button>
          <button 
            className="entry-button electrolyte"
            onClick={() => onLogHydration(330, 'electrolyte')}
          >
            Electrolyte +330ml
          </button>
          <button 
            className="entry-button protein"
            onClick={() => onLogHydration(0, 'protein')}
          >
            Protein +20g
          </button>
        </div>
        
        {/* Custom Entry */}
        <div className="custom-entry">
          <h4>Custom Entry</h4>
          {/* Custom entry form would go here */}
        </div>
      </div>
      
      {/* Timeline/History */}
      <div className="timeline">
        <h3>Today's Activity</h3>
        {hydrationData?.events?.length > 0 ? (
          <div className="event-list">
            {hydrationData.events.map((event: any, index: number) => (
              <div key={index} className="event-item">
                <span className="time">{event.time}</span>
                <span className="type">{event.type}</span>
                <span className="amount">{event.amount}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>No events logged today. Start tracking your hydration!</p>
        )}
      </div>
    </div>
  );
};

export default LogsView;
