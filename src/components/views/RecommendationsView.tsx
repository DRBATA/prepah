import React from 'react';

interface Recommendation {
  id: string;
  type: 'drink_water' | 'buy_product' | 'activity';
  title: string;
  description: string;
  amount_ml?: number;
  urgency: 'low' | 'medium' | 'high';
}

interface RecommendationsViewProps {
  userProfile: any;
  hydrationData: any;
  weatherData?: any;
  recommendations: Recommendation[];
  onSelectRecommendation: (recommendation: Recommendation) => void;
}

const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  userProfile,
  hydrationData,
  weatherData,
  recommendations,
  onSelectRecommendation
}) => {
  return (
    <div className="view-container recommendations-view">
      <h2>Your Hydration Plan</h2>
      
      {/* Environment Context */}
      <div className="environment-context">
        <div className="location">
          {weatherData?.location || 'Dubai Marina'}
        </div>
        <div className="weather-info">
          <span className="temperature">{weatherData?.temperature || '35°C'}</span>
          <span className="humidity">{weatherData?.humidity || '65%'} Humidity</span>
        </div>
      </div>
      
      {/* Personalized Hydration Plan */}
      <div className="hydration-plan">
        <h3>Personalized Recommendations</h3>
        {recommendations?.length > 0 ? (
          <div className="recommendations-list">
            {recommendations.map((recommendation) => (
              <div 
                key={recommendation.id} 
                className={`recommendation-card ${recommendation.type} ${recommendation.urgency}`}
                onClick={() => onSelectRecommendation(recommendation)}
              >
                <div className="recommendation-header">
                  <h4>{recommendation.title}</h4>
                  {recommendation.urgency === 'high' && (
                    <span className="urgency-badge">High Priority</span>
                  )}
                </div>
                <p className="description">{recommendation.description}</p>
                {recommendation.amount_ml && (
                  <div className="amount">{recommendation.amount_ml}ml</div>
                )}
                <button className="add-to-plan">Add to My Plan</button>
              </div>
            ))}
          </div>
        ) : (
          <p>No personalized recommendations available. Check back soon!</p>
        )}
      </div>
      
      {/* Health Insights */}
      <div className="health-insights">
        <h3>Hydration Insights</h3>
        <div className="insight-card">
          <h4>Daily Pattern</h4>
          <p>
            Based on your activity level, you should consume at least 
            {Math.round((userProfile?.weight_kg || 70) * 30)}ml of water today.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsView;
