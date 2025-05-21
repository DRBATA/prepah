"use client";

import React from "react";
import { Droplet } from "lucide-react";

interface HydrationStatusProps {
  currentIntake: number;
  goal: number;
  projectedLoss?: number;
  balance?: number;
  onViewRecommendations?: () => void;
}

const HydrationStatus: React.FC<HydrationStatusProps> = ({
  currentIntake,
  goal,
  projectedLoss = 0,
  balance = 0,
  onViewRecommendations
}) => {
  // Calculate percentage of goal achieved
  const percentageComplete = Math.min(100, Math.round((currentIntake / goal) * 100));
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-800">Hydration Status</h2>
        {onViewRecommendations && (
          <button 
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded-md text-sm transition"
            onClick={onViewRecommendations}
          >
            View Recommendations
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-1/3">
          <div className="flex items-center mb-1">
            <Droplet className="h-4 w-4 text-cyan-500 mr-1" />
            <span className="text-sm text-gray-600">Today's Intake</span>
          </div>
          <div className="text-lg font-semibold">{currentIntake} ml</div>
          <div className="text-sm text-gray-600">Goal: {goal} ml</div>
          
          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${percentageComplete}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{percentageComplete}% Hydrated</div>
        </div>
        
        <div className="w-1/3 border-l border-r px-4 border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Projected Loss</div>
          <div className="text-lg font-semibold">{projectedLoss} ml</div>
        </div>
        
        <div className="w-1/3 pl-4">
          <div className="text-sm text-gray-600 mb-1">Balance</div>
          <div className={`text-lg font-semibold ${balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {balance > 0 ? '+' : ''}{balance} ml
          </div>
        </div>
      </div>
    </div>
  );
};

export default HydrationStatus;
